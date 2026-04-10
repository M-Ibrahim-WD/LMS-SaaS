import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { CourseStatus, PaymentStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { UsersService } from "../../users/services/users.service";
import { CourseThumbnailStorageService } from "../../courses/services/course-thumbnail-storage.service";

@Injectable()
export class InstructorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly thumbnailStorageService: CourseThumbnailStorageService
  ) {}

  async getStats(user: JwtPayload) {
    const profile = await this.getPrivateProfile(user);
    return {
      studentsCount: profile.stats.studentsCount,
      totalRevenue: profile.stats.totalRevenue
    };
  }

  async getPrivateProfile(user: JwtPayload) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can access instructor profile");
    }

    const instructor = await this.prisma.user.findFirst({
      where: {
        id: user.sub,
        role: UserRole.INSTRUCTOR
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        bio: true,
        profileImage: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            inviteCode: true
          }
        },
        createdAt: true,
        _count: {
          select: {
            instructorCourses: true,
            followedByStudents: true
          }
        }
      }
    });

    if (!instructor) {
      throw new NotFoundException("Instructor profile not found");
    }

    const [payments, reviewAggregate, publicCoursesCount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.APPROVED,
          course: {
            instructorId: user.sub
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      }),
      this.prisma.courseReview.aggregate({
        where: {
          instructorId: user.sub
        },
        _avg: {
          rating: true
        },
        _count: {
          id: true
        }
      }),
      this.prisma.course.count({
        where: {
          instructorId: user.sub,
          status: CourseStatus.PUBLISHED
        }
      })
    ]);

    return {
      ...instructor,
      profileImage: this.usersService.resolveProfileImageUrl(instructor.id, instructor.profileImage),
      stats: {
        studentsCount: instructor._count.followedByStudents,
        coursesCount: instructor._count.instructorCourses,
        publicCoursesCount,
        totalRevenue: payments._sum.amount ?? 0,
        salesCount: payments._count.id ?? 0,
        reviewsCount: reviewAggregate._count.id ?? 0,
        averageRating: reviewAggregate._avg.rating ?? null
      }
    };
  }

  async getAnalytics(user: JwtPayload) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can access analytics");
    }

    await this.subscriptionsService.assertPermission(user, "canUseAnalytics");

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const [courseSales, currentGrowth, previousGrowth] = await Promise.all([
      this.prisma.course.findMany({
        where: {
          instructorId: user.sub
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          title: true,
          status: true,
          price: true,
          _count: {
            select: {
              enrollments: true
            }
          },
          payments: {
            where: {
              status: PaymentStatus.APPROVED
            },
            select: {
              amount: true
            }
          }
        }
      }),
      this.prisma.enrollment.count({
        where: {
          course: {
            instructorId: user.sub
          },
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      this.prisma.enrollment.count({
        where: {
          course: {
            instructorId: user.sub
          },
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      })
    ]);

    return {
      totals: await this.getStats(user),
      studentsGrowth: {
        currentWindow: currentGrowth,
        previousWindow: previousGrowth,
        delta: currentGrowth - previousGrowth
      },
      salesPerCourse: courseSales.map((course) => ({
        id: course.id,
        title: course.title,
        status: course.status,
        studentsCount: course._count.enrollments,
        revenue: course.payments.reduce((sum, payment) => sum + payment.amount, 0)
      }))
    };
  }

  async getPublicProfile(instructorId: string) {
    const instructor = await this.prisma.user.findFirst({
      where: {
        id: instructorId,
        role: UserRole.INSTRUCTOR
      },
      select: {
        id: true,
        fullName: true,
        bio: true,
        profileImage: true,
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            followedByStudents: true
          }
        }
      }
    });

    if (!instructor) {
      throw new NotFoundException("Instructor not found");
    }

    const [courses, reviewAggregate, reviewGroups] = await Promise.all([
      this.prisma.course.findMany({
        where: {
          instructorId,
          status: CourseStatus.PUBLISHED
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      }),
      this.prisma.courseReview.aggregate({
        where: {
          instructorId
        },
        _avg: {
          rating: true
        },
        _count: {
          id: true
        }
      }),
      this.prisma.courseReview.groupBy({
        by: ["courseId"],
        where: {
          instructorId
        },
        _avg: {
          rating: true
        },
        _count: {
          id: true
        }
      })
    ]);

    const reviewMap = new Map(
      reviewGroups.map((item) => [
        item.courseId,
        {
          averageRating: item._avg.rating ?? null,
          reviewsCount: item._count.id ?? 0
        }
      ])
    );

    return {
      id: instructor.id,
      fullName: instructor.fullName,
      bio: instructor.bio,
      profileImage: this.usersService.resolveProfileImageUrl(instructor.id, instructor.profileImage),
      tenant: instructor.tenant,
      stats: {
        studentsCount: instructor._count.followedByStudents,
        coursesCount: courses.length,
        reviewsCount: reviewAggregate._count.id ?? 0,
        averageRating: reviewAggregate._avg.rating ?? null
      },
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailImage: this.resolveCourseThumbnailUrl(course.id, course.thumbnailImage),
        category: course.category,
        level: course.level,
        isPaid: course.isPaid,
        price: course.price,
        studentsCount: course._count.enrollments,
        averageRating: reviewMap.get(course.id)?.averageRating ?? null,
        reviewsCount: reviewMap.get(course.id)?.reviewsCount ?? 0
      })),
      reviews: await this.getPublicReviews(instructorId)
    };
  }

  async getPublicReviews(instructorId: string) {
    return this.prisma.courseReview.findMany({
      where: {
        instructorId
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            fullName: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
  }

  private resolveCourseThumbnailUrl(courseId: string, thumbnailImage?: string | null) {
    return this.thumbnailStorageService.getPublicCourseThumbnailUrl(
      courseId,
      thumbnailImage
    );
  }
}
