import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
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
            courseId
          }
        }),
        this.prisma.quizSubmission.count({
          where: {
            studentId: user.sub,
            quiz: {
              courseId
            }
          }
        }),
        this.prisma.assignment.count({
          where: {
            courseId
          }
        }),
        this.prisma.assignmentSubmission.count({
          where: {
            studentId: user.sub,
            assignment: {
              courseId
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
            courseId
          }
        }),
        this.prisma.quizSubmission.count({
          where: {
            studentId: user.sub,
            quiz: {
              courseId
            }
          }
        }),
        this.prisma.assignment.count({
          where: {
            courseId
          }
        }),
        this.prisma.assignmentSubmission.count({
          where: {
            studentId: user.sub,
            assignment: {
              courseId
            }
          }
        })
      ]);

    return {
      lessons: {
        completed: completedLessons,
        total: totalLessons,
        done: totalLessons === 0 || completedLessons >= totalLessons
      },
      quizzes: {
        completed: quizSubmissionCount,
        total: quizCount,
        done: quizSubmissionCount >= quizCount
      },
      assignments: {
        completed: assignmentSubmissionCount,
        total: assignmentCount,
        done: assignmentSubmissionCount >= assignmentCount
      },
      isEligible: (totalLessons === 0 || completedLessons >= totalLessons) && quizSubmissionCount >= quizCount && assignmentSubmissionCount >= assignmentCount,
      certificate
    };
  }

  private buildCertificateNumber(courseId: string, userId: string) {
    return `CERT-${courseId.slice(0, 8).toUpperCase()}-${userId.slice(0, 8).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  }
}
