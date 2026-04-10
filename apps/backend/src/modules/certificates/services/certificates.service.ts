import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AssessmentScopeType } from "@prisma/client";
import { randomUUID } from "crypto";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async myCertificates(user: JwtPayload) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access certificates");
    }

    return this.prisma.certificate.findMany({
      where: {
        userId: user.sub
      },
      orderBy: {
        issuedAt: "desc"
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });
  }

  async getCertificate(user: JwtPayload, certificateId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access certificate details");
    }

    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        userId: user.sub
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!certificate) {
      throw new NotFoundException("Certificate not found");
    }

    return certificate;
  }

  async verifyCertificate(certificateNumber: string) {
    const normalized = certificateNumber.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException("certificateNumber is required");
    }

    const certificate = await this.prisma.certificate.findUnique({
      where: {
        certificateNumber: normalized
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    if (!certificate) {
      throw new NotFoundException("Certificate not found");
    }

    return {
      verified: true,
      certificate
    };
  }

  async issueForCourse(user: JwtPayload, courseId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can issue certificates");
    }

    const course = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, courseId, {
      id: true,
      tenantId: true
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const effectivePermissions = await this.subscriptionsService.getEffectivePermissionsForTenant(course.tenantId);
    if (!effectivePermissions?.canIssueCertificates) {
      throw new ForbiddenException("Certificates are not enabled for this instructor workspace.");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.sub,
        courseId,
        tenantId: course.tenantId
      },
      select: { id: true }
    });

    if (!enrollment) {
      throw new ForbiddenException("Enroll in this course first");
    }

    const [existingCertificate, totalLessons, completedLessons, quizCount, quizSubmissionCount, assignmentCount, assignmentSubmissionCount] =
      await Promise.all([
        this.prisma.certificate.findFirst({
          where: {
            userId: user.sub,
            courseId
          },
          select: {
            id: true,
            issuedAt: true,
            certificateNumber: true
          }
        }),
        this.prisma.lesson.count({
          where: {
            section: {
              courseId
            }
          }
        }),
        this.prisma.lessonCompletion.count({
          where: {
            userId: user.sub,
            courseId
          }
        }),
        this.prisma.quiz.count({
          where: {
            courseId,
            scopeType: AssessmentScopeType.COURSE
          }
        }),
        this.prisma.quizSubmission.count({
          where: {
            studentId: user.sub,
            quiz: {
              courseId,
              scopeType: AssessmentScopeType.COURSE
            }
          }
        }),
        this.prisma.assignment.count({
          where: {
            courseId,
            scopeType: AssessmentScopeType.COURSE
          }
        }),
        this.prisma.assignmentSubmission.count({
          where: {
            studentId: user.sub,
            assignment: {
              courseId,
              scopeType: AssessmentScopeType.COURSE
            }
          }
        })
      ]);

    if (existingCertificate) {
      return existingCertificate;
    }

    const lessonRequirementMet = totalLessons === 0 || completedLessons >= totalLessons;
    const quizRequirementMet = quizSubmissionCount >= quizCount;
    const assignmentRequirementMet = assignmentSubmissionCount >= assignmentCount;

    if (!lessonRequirementMet || !quizRequirementMet || !assignmentRequirementMet) {
      throw new BadRequestException("Course completion requirements are not met yet");
    }

    const certificate = await this.prisma.certificate.create({
      data: {
        userId: user.sub,
        courseId,
        tenantId: course.tenantId,
        certificateNumber: this.buildCertificateNumber(courseId, user.sub)
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    await this.notificationsService.create({
      userId: user.sub,
      tenantId: course.tenantId,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate issued",
      message: `Your certificate for ${certificate.course.title} is ready.`,
      payload: { certificateId: certificate.id, courseId }
    });

    return certificate;
  }

  async getCourseCompletion(user: JwtPayload, courseId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access completion status");
    }

    const course = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, courseId, {
      id: true,
      tenantId: true
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const [certificate, totalLessons, completedLessons, quizCount, quizSubmissionCount, assignmentCount, assignmentSubmissionCount] =
      await Promise.all([
        this.prisma.certificate.findFirst({
          where: {
            userId: user.sub,
            courseId
          },
          select: {
            id: true,
            issuedAt: true,
            certificateNumber: true
          }
        }),
        this.prisma.lesson.count({
          where: {
            section: {
              courseId
            }
          }
        }),
        this.prisma.lessonCompletion.count({
          where: {
            userId: user.sub,
            courseId
          }
        }),
        this.prisma.quiz.count({
          where: {
            courseId,
            scopeType: AssessmentScopeType.COURSE
          }
        }),
        this.prisma.quizSubmission.count({
          where: {
            studentId: user.sub,
            quiz: {
              courseId,
              scopeType: AssessmentScopeType.COURSE
            }
          }
        }),
        this.prisma.assignment.count({
          where: {
            courseId,
            scopeType: AssessmentScopeType.COURSE
          }
        }),
        this.prisma.assignmentSubmission.count({
          where: {
            studentId: user.sub,
            assignment: {
              courseId,
              scopeType: AssessmentScopeType.COURSE
            }
          }
        })
      ]);

    const lessonsDone = totalLessons === 0 || completedLessons >= totalLessons;
    const quizzesDone = quizSubmissionCount >= quizCount;
    const assignmentsDone = assignmentSubmissionCount >= assignmentCount;

    const nextAction = !lessonsDone
      ? "Complete all course lessons to unlock the course-level checkpoints."
      : !quizzesDone
        ? "Submit every course-level quiz to unlock certificate eligibility."
        : !assignmentsDone
          ? "Submit every course-level assignment to unlock certificate eligibility."
          : certificate
            ? "Your certificate is already issued and ready to open."
            : "All completion requirements are met. You can issue the certificate now.";

    const lockReason = !lessonsDone
      ? "Lessons incomplete"
      : !quizzesDone
        ? "Course-level quizzes incomplete"
        : !assignmentsDone
          ? "Course-level assignments incomplete"
          : null;

    return {
      lessons: {
        completed: completedLessons,
        total: totalLessons,
        done: lessonsDone
      },
      quizzes: {
        completed: quizSubmissionCount,
        total: quizCount,
        done: quizzesDone
      },
      assignments: {
        completed: assignmentSubmissionCount,
        total: assignmentCount,
        done: assignmentsDone
      },
      status: certificate
        ? "CERTIFICATE_READY"
        : lessonsDone && quizzesDone && assignmentsDone
          ? "ELIGIBLE"
          : "LOCKED",
      isEligible: lessonsDone && quizzesDone && assignmentsDone,
      lockReason,
      nextAction,
      certificate
    };
  }

  private buildCertificateNumber(courseId: string, userId: string) {
    return `CERT-${courseId.slice(0, 8).toUpperCase()}-${userId.slice(0, 8).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }
}
