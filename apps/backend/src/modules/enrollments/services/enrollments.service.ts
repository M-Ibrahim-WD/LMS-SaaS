import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { CreateEnrollmentDto } from "../dto/create-enrollment.dto";

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(user: JwtPayload, dto: CreateEnrollmentDto) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can enroll");
    }

    const course = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, dto.courseId, {
      id: true,
      tenantId: true,
      isPaid: true,
      instructorId: true
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (course.isPaid) {
      const approvedPayment = await this.prisma.payment.findFirst({
        where: {
          userId: user.sub,
          courseId: course.id,
          tenantId: course.tenantId,
          status: PaymentStatus.APPROVED
        },
        select: { id: true }
      });

      if (!approvedPayment) {
        throw new ForbiddenException("Paid course requires approved payment before enrollment");
      }
    }

    try {
      const enrollment = await this.prisma.enrollment.create({
        data: {
          userId: user.sub,
          courseId: course.id,
          tenantId: course.tenantId
        }
      });

      await this.notificationsService.create({
        userId: user.sub,
        tenantId: course.tenantId,
        type: "ENROLLMENT_CREATED",
        title: "Enrollment confirmed",
        message: "You are now enrolled in this course.",
        payload: { courseId: course.id, enrollmentId: enrollment.id }
      });

      return enrollment;
    } catch {
      throw new ConflictException("Already enrolled");
    }
  }

  myCourses(user: JwtPayload) {
    return this.prisma.enrollment
      .findMany({
        where: {
          userId: user.sub
        },
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            include: {
              instructor: {
                select: {
                  id: true,
                  fullName: true
                }
              }
            }
          }
        }
      })
      .then(async (enrollments) => {
        if (enrollments.length === 0) {
          return [];
        }

        const courseIds = enrollments.map((item) => item.courseId);
        const [sectionRows, completionCounts, learnerStates] = await Promise.all([
          this.prisma.section.findMany({
            where: {
              courseId: {
                in: courseIds
              }
            },
            select: {
              id: true,
              courseId: true,
              order: true,
              _count: {
                select: {
                  lessons: true
                }
              },
              lessons: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  order: true
                }
              }
            }
          }),
          this.prisma.lessonCompletion.groupBy({
            by: ["courseId"],
            _count: {
              id: true
            },
            where: {
              userId: user.sub,
              courseId: {
                in: courseIds
              }
            }
          }),
          this.prisma.courseLearnerState.findMany({
            where: {
              userId: user.sub,
              courseId: {
                in: courseIds
              }
            },
            select: {
              courseId: true,
              lastLessonId: true
            }
          })
        ]);

        const totalLessonsByCourse = new Map<string, number>();
        const orderedLessonsByCourse = new Map<
          string,
          Array<{
            id: string;
            title: string;
            order: number;
          }>
        >();
        for (const section of sectionRows) {
          totalLessonsByCourse.set(
            section.courseId,
            (totalLessonsByCourse.get(section.courseId) ?? 0) + section._count.lessons
          );
          const existingLessons = orderedLessonsByCourse.get(section.courseId) ?? [];
          existingLessons.push(...section.lessons);
          orderedLessonsByCourse.set(section.courseId, existingLessons);
        }

        const completionCountByCourse = new Map<string, number>(
          completionCounts.map((item) => [item.courseId, item._count.id])
        );
        const completionIdsByCourse = new Map<string, Set<string>>();
        const lessonCompletions = await this.prisma.lessonCompletion.findMany({
          where: {
            userId: user.sub,
            courseId: { in: courseIds }
          },
          select: {
            courseId: true,
            lessonId: true
          }
        });
        for (const completion of lessonCompletions) {
          const existing = completionIdsByCourse.get(completion.courseId) ?? new Set<string>();
          existing.add(completion.lessonId);
          completionIdsByCourse.set(completion.courseId, existing);
        }
        const learnerStateMap = new Map(learnerStates.map((item) => [item.courseId, item.lastLessonId]));

        return enrollments.map((enrollment) => {
          const totalLessons = totalLessonsByCourse.get(enrollment.courseId) ?? 0;
          const completedLessons = completionCountByCourse.get(enrollment.courseId) ?? 0;
          const percentage =
            totalLessons > 0 ? Math.round((Math.min(completedLessons, totalLessons) / totalLessons) * 100) : 0;
          const courseLessons = (orderedLessonsByCourse.get(enrollment.courseId) ?? []).sort(
            (left, right) => left.order - right.order
          );
          const completionIds = completionIdsByCourse.get(enrollment.courseId) ?? new Set<string>();
          const nextLesson = courseLessons.find((lesson) => !completionIds.has(lesson.id)) ?? null;

          return {
            ...enrollment,
            progress: {
              totalLessons,
              completedLessons,
              percentage,
              isComplete: totalLessons > 0 && completedLessons >= totalLessons
            },
            learningState: {
              lastLessonId: learnerStateMap.get(enrollment.courseId) ?? null,
              nextLesson
            }
          };
        });
      });
  }

  async isEnrolled(userId: string, courseId: string, tenantId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId,
        tenantId
      },
      select: { id: true }
    });

    return Boolean(enrollment);
  }
}
