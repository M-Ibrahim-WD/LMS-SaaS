import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CourseLevel, CourseStatus, Prisma } from "@prisma/client";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateCourseDto } from "../dto/create-course.dto";
import { CoursePricingFilter, CourseQueryDto } from "../dto/course-query.dto";
import { UpdateCourseStatusDto } from "../dto/update-course-status.dto";
import { UpdateCourseDto } from "../dto/update-course.dto";
import { CourseProgressService } from "./course-progress.service";
import {
  CourseThumbnailStorageService,
  type UploadedImageFile
} from "./course-thumbnail-storage.service";

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly thumbnailStorageService: CourseThumbnailStorageService,
    private readonly courseProgressService: CourseProgressService
  ) {}

  private readonly includeTree = {
    sections: {
      orderBy: { order: "asc" as const },
      include: {
        lessons: {
          orderBy: { order: "asc" as const }
        }
      }
    }
  };

  async create(user: JwtPayload, dto: CreateCourseDto) {
    if (!user.tenantId) {
      throw new ForbiddenException("Instructor must belong to a tenant");
    }

    const summary = await this.subscriptionsService.assertInstructorCanCreate(user);
    const permissions = summary.effectivePermissions!;

    const existingCourses = await this.prisma.course.count({
      where: { tenantId: user.tenantId }
    });

    if (existingCourses >= permissions.maxCourses) {
      throw new BadRequestException(
        `Course limit reached. Your current entitlement allows ${permissions.maxCourses} courses.`
      );
    }

    const isPaid = dto.isPaid ?? false;
    const price = isPaid ? dto.price ?? null : null;

    if (isPaid && !permissions.canCreatePaidCourses) {
      throw new ForbiddenException("Your current subscription only allows free courses.");
    }

    if (isPaid && !price) {
      throw new BadRequestException("Paid course must include a valid price");
    }

    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        thumbnailImage: null,
        category: dto.category?.trim() || null,
        level: dto.level ?? CourseLevel.BEGINNER,
        isPaid,
        price,
        status: CourseStatus.DRAFT,
        instructorId: user.sub,
        tenantId: user.tenantId
      }
    });
  }

  async update(user: JwtPayload, id: string, dto: UpdateCourseDto) {
    const summary = await this.subscriptionsService.assertInstructorCanCreate(user);
    const permissions = summary.effectivePermissions!;
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const nextIsPaid = dto.isPaid ?? undefined;
    const data: {
      title?: string;
      description?: string;
      category?: string | null;
      level?: CourseLevel;
      isPaid?: boolean;
      price?: number | null;
    } = { ...dto };

    if (dto.category !== undefined) {
      data.category = dto.category.trim() || null;
    }

    if (nextIsPaid === false) {
      data.price = null;
    }

    if (nextIsPaid === true && (dto.price === undefined || dto.price === null)) {
      throw new BadRequestException("Paid course must include a valid price");
    }

    if (nextIsPaid === true && !permissions.canCreatePaidCourses) {
      throw new ForbiddenException("Your current subscription only allows free courses.");
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data
    });
  }

  async uploadThumbnail(user: JwtPayload, courseId: string, file: UploadedImageFile) {
    if (user.role === "INSTRUCTOR") {
      await this.subscriptionsService.assertPermission(user, "canUploadThumbnails");
    }

    const course = await this.assertInstructorOwnsCourse(courseId, user);

    if (!file) {
      throw new BadRequestException("Course thumbnail is required");
    }

    const storedRef = await this.thumbnailStorageService.storeThumbnail(file);

    const updated = await this.prisma.course.update({
      where: { id: course.id },
      data: {
        thumbnailImage: storedRef
      }
    });

    return this.toPublicCourse(updated);
  }

  async readThumbnail(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        thumbnailImage: true,
        status: true
      }
    });

    if (!course?.thumbnailImage) {
      throw new NotFoundException("Course thumbnail not found");
    }

    const file = await this.thumbnailStorageService.readLocalThumbnailRef(
      course.thumbnailImage
    );
    return {
      ...file,
      course
    };
  }

  async updateStatus(user: JwtPayload, id: string, dto: UpdateCourseStatusDto) {
    const summary = await this.subscriptionsService.assertInstructorCanCreate(user);
    const permissions = summary.effectivePermissions!;
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (dto.status === CourseStatus.PUBLISHED && !permissions.canPublishCourses) {
      throw new ForbiddenException("Your current subscription does not allow publishing courses.");
    }

    return this.prisma.course.update({
      where: { id: course.id },
      data: { status: dto.status }
    });
  }

  async getAllByTenant(user: JwtPayload, query: CourseQueryDto) {
    const where = this.buildCourseWhere(user, query);
    const pagination = this.resolvePagination(query);

    if (user.role === "INSTRUCTOR") {
      if (!user.tenantId) {
        return [];
      }

      return this.prisma.course.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }).then((courses) => courses.map((course) => this.toPublicCourse(course)));
    }

    if (user.role === "ADMIN") {
      if (!user.tenantId) {
        return [];
      }

      return this.prisma.course.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }).then((courses) => courses.map((course) => this.toPublicCourse(course)));
    }

    const courses = await this.prisma.course.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: [{ instructor: { fullName: "asc" } }, { createdAt: "desc" }],
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    const coursesWithProgress = await this.attachStudentProgressToCourseList(user.sub, courses);
    return coursesWithProgress.map((course) => this.toPublicCourse(course));
  }

  async getOne(user: JwtPayload, id: string) {
    if (user.role === "INSTRUCTOR") {
      if (!user.tenantId) {
        throw new NotFoundException("Course not found");
      }

      const instructorCourse = await this.prisma.course.findFirst({
        where: {
          id,
          tenantId: user.tenantId,
          instructorId: user.sub
        },
        include: this.includeTree
      });

      if (!instructorCourse) {
        throw new NotFoundException("Course not found");
      }

      return {
        ...this.toDetailedCourse(instructorCourse),
        progress: await this.courseProgressService.getCourseProgressSummaryForCourse(
          id,
          user.sub
        ),
        learningState: null
      };
    }

    if (user.role === "ADMIN") {
      if (!user.tenantId) {
        throw new NotFoundException("Course not found");
      }

      const adminCourse = await this.prisma.course.findFirst({
        where: {
          id,
          tenantId: user.tenantId
        },
        include: this.includeTree
      });

      if (!adminCourse) {
        throw new NotFoundException("Course not found");
      }

      return this.toDetailedCourse(adminCourse);
    }

    await this.ensureStudentCanAccessCourse(user, id);

    const course = await this.prisma.course.findFirst({
      where: {
        id
      },
      include: this.includeTree
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const completedLessonIds =
      await this.courseProgressService.getCompletedLessonIds(user.sub, id);
    const allLessons = this.courseProgressService.flattenLessons(course.sections);
    const learnerState = await this.prisma.courseLearnerState.findUnique({
      where: {
        userId_courseId: {
          userId: user.sub,
          courseId: id
        }
      },
      select: {
        lastLessonId: true
      }
    });
    const nextLesson = allLessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? null;

    return {
      ...this.toDetailedCourse(course),
      sections: course.sections.map((section) => ({
        ...section,
        description: section.description,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          description: lesson.description ?? lesson.content,
          hasProtectedMedia: Boolean(lesson.mediaAsset),
          mediaKind: lesson.mediaAsset ? lesson.type : null,
          mediaFileName: lesson.mediaFileName,
          mediaContentType: lesson.mediaContentType,
          isCompleted: completedLessonIds.has(lesson.id)
        }))
      })),
      progress: await this.courseProgressService.getCourseProgressSummaryForCourse(
        id,
        user.sub
      ),
      learningState: {
        lastLessonId: learnerState?.lastLessonId ?? null,
        nextLessonId: nextLesson?.id ?? null
      }
    };
  }

  async getCourseLearners(user: JwtPayload, courseId: string) {
    await this.assertInstructorOwnsCourse(courseId, user);

    const [enrollments, totalLessons, quizzes, assignments, completions, quizSubmissions, assignmentSubmissions, certificates, learnerStates] =
      await Promise.all([
        this.prisma.enrollment.findMany({
          where: { courseId },
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                createdAt: true
              }
            }
          }
        }),
        this.prisma.lesson.count({
          where: {
            section: { courseId }
          }
        }),
        this.prisma.quiz.count({ where: { courseId } }),
        this.prisma.assignment.count({ where: { courseId } }),
        this.prisma.lessonCompletion.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { courseId }
        }),
        this.prisma.quizSubmission.groupBy({
          by: ["studentId"],
          _count: { id: true },
          where: { quiz: { courseId } }
        }),
        this.prisma.assignmentSubmission.groupBy({
          by: ["studentId"],
          _count: { id: true },
          where: { assignment: { courseId } }
        }),
        this.prisma.certificate.findMany({
          where: { courseId },
          select: { userId: true, id: true, certificateNumber: true, issuedAt: true }
        }),
        this.prisma.courseLearnerState.findMany({
          where: { courseId },
          select: { userId: true, lastLessonId: true, updatedAt: true }
        })
      ]);

    const completionMap = new Map(completions.map((item) => [item.userId, item._count.id]));
    const quizMap = new Map(quizSubmissions.map((item) => [item.studentId, item._count.id]));
    const assignmentMap = new Map(assignmentSubmissions.map((item) => [item.studentId, item._count.id]));
    const certificateMap = new Map(certificates.map((item) => [item.userId, item]));
    const learnerStateMap = new Map(learnerStates.map((item) => [item.userId, item]));

    return enrollments.map((enrollment) => {
      const completedLessons = completionMap.get(enrollment.userId) ?? 0;
      const progress = this.courseProgressService.buildCourseProgress(
        totalLessons,
        completedLessons
      );
      return {
        id: enrollment.id,
        enrolledAt: enrollment.createdAt,
        learner: enrollment.user,
        progress,
        assessments: {
          quizzesCompleted: quizMap.get(enrollment.userId) ?? 0,
          quizzesTotal: quizzes,
          assignmentsSubmitted: assignmentMap.get(enrollment.userId) ?? 0,
          assignmentsTotal: assignments
        },
        certificate: certificateMap.get(enrollment.userId) ?? null,
        learningState: learnerStateMap.get(enrollment.userId) ?? null
      };
    });
  }

  async getCourseSecurityEvents(user: JwtPayload, courseId: string) {
    if (user.role === "INSTRUCTOR") {
      await this.assertInstructorOwnsCourse(courseId, user);
    } else if (user.role === "ADMIN") {
      const course = await this.prisma.course.findFirst({
        where: {
          id: courseId,
          ...(user.isSuperAdmin ? {} : { tenantId: user.tenantId ?? undefined })
        },
        select: { id: true }
      });

      if (!course) {
        throw new NotFoundException("Course not found");
      }
    } else {
      throw new ForbiddenException("You do not have access to these security events");
    }

    return this.prisma.protectedContentEvent.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
  }

  async getContinueLearning(user: JwtPayload) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can continue learning");
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailImage: true,
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

    for (const enrollment of enrollments) {
      const [state, courseGraph, completedLessonIds] = await Promise.all([
        this.prisma.courseLearnerState.findUnique({
          where: {
            userId_courseId: {
              userId: user.sub,
              courseId: enrollment.courseId
            }
          },
          select: { lastLessonId: true, updatedAt: true }
        }),
        this.prisma.course.findUnique({
          where: { id: enrollment.courseId },
          include: this.includeTree
        }),
        this.courseProgressService.getCompletedLessonIds(
          user.sub,
          enrollment.courseId
        )
      ]);

      if (!courseGraph) {
        continue;
      }

      const lessons = this.courseProgressService.flattenLessons(courseGraph.sections);
      const lastViewedLesson = state?.lastLessonId ? lessons.find((lesson) => lesson.id === state.lastLessonId) ?? null : null;
      const nextIncomplete = lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? null;
      const lesson = lastViewedLesson && !completedLessonIds.has(lastViewedLesson.id) ? lastViewedLesson : nextIncomplete;

      if (!lesson) {
        continue;
      }

      return {
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        thumbnailImage: this.resolveCourseThumbnailUrl(enrollment.course.id, (enrollment.course as { thumbnailImage?: string | null }).thumbnailImage ?? null),
        instructorName: enrollment.course.instructor?.fullName ?? "Instructor",
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        anchorHref: `/courses/${enrollment.course.id}#lesson-${lesson.id}`
      };
    }

    return null;
  }

  async completeLesson(user: JwtPayload, courseId: string, lessonId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can mark lessons complete");
    }

    await this.ensureStudentCanAccessCourse(user, courseId);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: {
          courseId
        }
      },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    await Promise.all([
      this.prisma.lessonCompletion.upsert({
        where: {
          userId_lessonId: {
            userId: user.sub,
            lessonId
          }
        },
        update: {},
        create: {
          userId: user.sub,
          lessonId,
          courseId
        }
      }),
      this.prisma.courseLearnerState.upsert({
        where: {
          userId_courseId: {
            userId: user.sub,
            courseId
          }
        },
        update: {
          lastLessonId: lessonId
        },
        create: {
          userId: user.sub,
          courseId,
          lastLessonId: lessonId
        }
      })
    ]);

    return this.courseProgressService.getCourseProgressSummaryForCourse(
      courseId,
      user.sub
    );
  }

  async trackLessonView(user: JwtPayload, courseId: string, lessonId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can track lessons");
    }

    await this.ensureStudentCanAccessCourse(user, courseId);

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: { courseId }
      },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    return this.prisma.courseLearnerState.upsert({
      where: {
        userId_courseId: {
          userId: user.sub,
          courseId
        }
      },
      update: {
        lastLessonId: lessonId
      },
      create: {
        userId: user.sub,
        courseId,
        lastLessonId: lessonId
      }
    });
  }

  private async assertInstructorOwnsCourse(courseId: string, user: JwtPayload) {
    if (user.role !== "INSTRUCTOR" || !user.tenantId) {
      throw new ForbiddenException("Instructor must belong to a tenant");
    }

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: user.tenantId,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  resolveCourseThumbnailUrl(courseId: string, thumbnailImage?: string | null) {
    return this.thumbnailStorageService.getPublicCourseThumbnailUrl(
      courseId,
      thumbnailImage
    );
  }

  private async ensureStudentCanAccessCourse(user: JwtPayload, courseId: string) {
    const followedCourse = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, courseId, {
      id: true,
      tenantId: true,
      isPaid: true
    });

    if (!followedCourse) {
      throw new ForbiddenException("Join this instructor first");
    }

    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.sub,
        courseId,
        tenantId: followedCourse.tenantId
      },
      select: { id: true }
    });

    if (!enrolled) {
      if (followedCourse.isPaid) {
        throw new ForbiddenException("You need to complete payment to access this course");
      }

      throw new ForbiddenException("Enroll in this course first");
    }

    return followedCourse;
  }

  private async attachStudentProgressToCourseList<T extends { id: string }>(userId: string, courses: T[]) {
    if (courses.length === 0) {
      return [];
    }

    const courseIds = courses.map((course) => course.id);

    const [enrollments, lessonCounts, completionCounts, learnerStates] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          userId,
          courseId: { in: courseIds }
        },
        select: {
          courseId: true
        }
      }),
      this.prisma.lesson.groupBy({
        by: ["sectionId"],
        _count: {
          id: true
        },
        where: {
          section: {
            courseId: { in: courseIds }
          }
        }
      }),
      this.prisma.lessonCompletion.groupBy({
        by: ["courseId"],
        _count: {
          id: true
        },
        where: {
          userId,
          courseId: { in: courseIds }
        }
      }),
      this.prisma.courseLearnerState.findMany({
        where: {
          userId,
          courseId: { in: courseIds }
        },
        select: {
          courseId: true,
          lastLessonId: true
        }
      })
    ]);

    const sectionIds = lessonCounts.map((item) => item.sectionId);
    const sectionCourseMap =
      sectionIds.length > 0
        ? await this.prisma.section.findMany({
            where: {
              id: { in: sectionIds }
            },
            select: {
              id: true,
              courseId: true
            }
          })
        : [];

    const totalLessonsByCourse = new Map<string, number>();
    for (const section of sectionCourseMap) {
      const sectionCount = lessonCounts.find((item) => item.sectionId === section.id)?._count.id ?? 0;
      totalLessonsByCourse.set(section.courseId, (totalLessonsByCourse.get(section.courseId) ?? 0) + sectionCount);
    }

    const completionCountByCourse = new Map<string, number>(
      completionCounts.map((item) => [item.courseId, item._count.id])
    );
    const learnerStateMap = new Map(learnerStates.map((item) => [item.courseId, item.lastLessonId]));
    const enrolledCourseIds = new Set(enrollments.map((item) => item.courseId));

    return courses.map((course) => ({
      ...course,
      progress: enrolledCourseIds.has(course.id)
        ? this.courseProgressService.buildCourseProgress(
            totalLessonsByCourse.get(course.id) ?? 0,
            completionCountByCourse.get(course.id) ?? 0
          )
        : null,
      learningState: enrolledCourseIds.has(course.id)
        ? {
            lastLessonId: learnerStateMap.get(course.id) ?? null
          }
        : null
    }));
  }

  private toPublicCourse<T extends { id: string; thumbnailImage?: string | null }>(course: T) {
    return {
      ...course,
      thumbnailImage: this.resolveCourseThumbnailUrl(course.id, course.thumbnailImage ?? null)
    };
  }

  private toDetailedCourse<
    T extends {
      id: string;
      thumbnailImage?: string | null;
      sections?: Array<{
        id: string;
        title: string;
        description?: string | null;
        order: number;
        lessons: Array<{
          id: string;
          title: string;
          content: string;
          description?: string | null;
          type: string;
          order: number;
          mediaAsset?: string | null;
          mediaFileName?: string | null;
          mediaContentType?: string | null;
        }>;
      }>;
    }
  >(course: T) {
    return {
      ...this.toPublicCourse(course),
      sections: course.sections?.map((section) => ({
        ...section,
        description: section.description ?? null,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          description: lesson.description ?? lesson.content,
          hasProtectedMedia: Boolean(lesson.mediaAsset),
          mediaKind: lesson.mediaAsset ? lesson.type : null,
          mediaFileName: lesson.mediaFileName ?? null,
          mediaContentType: lesson.mediaContentType ?? null
        }))
      }))
    };
  }

  private buildCourseWhere(user: JwtPayload, query: CourseQueryDto): Prisma.CourseWhereInput {
    const where: Prisma.CourseWhereInput =
      user.role === "INSTRUCTOR"
        ? {
            tenantId: user.tenantId ?? undefined,
            instructorId: user.sub
          }
        : user.role === "ADMIN"
          ? {
              tenantId: user.tenantId ?? undefined
            }
          : {
              status: CourseStatus.PUBLISHED,
              instructor: this.studentAccessService.getFollowedInstructorWhere(user.sub)
            };

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } }
      ];
    }

    if (query.pricing === CoursePricingFilter.FREE) {
      where.isPaid = false;
    }

    if (query.pricing === CoursePricingFilter.PAID) {
      where.isPaid = true;
    }

    if (query.category?.trim()) {
      where.category = { equals: query.category.trim(), mode: "insensitive" };
    }

    if (query.level) {
      where.level = query.level;
    }

    return where;
  }

  private resolvePagination(query: CourseQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;

    return {
      skip: (page - 1) * pageSize,
      take: pageSize
    };
  }
}
