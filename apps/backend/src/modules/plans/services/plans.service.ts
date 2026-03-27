import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { CreatePlanDto, UpdatePlanDto } from "../dto/plan.dto";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, "_");
  }

  private readonly planInclude = {
    _count: {
      select: {
        tenants: true,
        subscriptions: true
      }
    }
  } satisfies Prisma.PlanInclude;

  listPlans(includeArchived = true) {
    return this.prisma.plan.findMany({
      where: includeArchived ? undefined : { isArchived: false },
      orderBy: [{ isCore: "desc" }, { monthlyPrice: "asc" }, { createdAt: "asc" }],
      include: this.planInclude
    });
  }

  async createPlan(dto: CreatePlanDto) {
    try {
      return await this.prisma.plan.create({
        data: {
          code: this.normalizeCode(dto.code),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          monthlyPrice: dto.monthlyPrice,
          yearlyPrice: dto.yearlyPrice,
          maxCourses: dto.maxCourses,
          maxSectionsPerCourse: dto.maxSectionsPerCourse,
          maxLessonsPerSection: dto.maxLessonsPerSection,
          canPublishCourses: dto.canPublishCourses,
          canCreatePaidCourses: dto.canCreatePaidCourses,
          maxStudentsTotal: dto.maxStudentsTotal,
          maxStudentsPerCourse: dto.maxStudentsPerCourse,
          canUseQuizzes: dto.canUseQuizzes,
          canUseAssignments: dto.canUseAssignments,
          canIssueCertificates: dto.canIssueCertificates,
          canUseAnalytics: dto.canUseAnalytics,
          canUseReviews: dto.canUseReviews,
          maxStorageMb: dto.maxStorageMb,
          canUploadThumbnails: dto.canUploadThumbnails,
          canUploadProfileImage: dto.canUploadProfileImage,
          canUseManualPayments: dto.canUseManualPayments,
          hasAdvancedAnalytics: dto.hasAdvancedAnalytics,
          hasOnlinePayments: dto.hasOnlinePayments,
          maxAdminUsers: dto.maxAdminUsers,
          maxInstructorUsers: dto.maxInstructorUsers,
          isActive: dto.isActive ?? true,
          isArchived: false,
          isCore: false
        },
        include: this.planInclude
      });
    } catch {
      throw new ConflictException("A plan with this code already exists");
    }
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("Plan not found");
    }

    try {
      return await this.prisma.plan.update({
        where: { id: planId },
        data: {
          ...(dto.code !== undefined ? { code: this.normalizeCode(dto.code) } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
          ...(dto.monthlyPrice !== undefined ? { monthlyPrice: dto.monthlyPrice } : {}),
          ...(dto.yearlyPrice !== undefined ? { yearlyPrice: dto.yearlyPrice } : {}),
          ...(dto.maxCourses !== undefined ? { maxCourses: dto.maxCourses } : {}),
          ...(dto.maxSectionsPerCourse !== undefined ? { maxSectionsPerCourse: dto.maxSectionsPerCourse } : {}),
          ...(dto.maxLessonsPerSection !== undefined ? { maxLessonsPerSection: dto.maxLessonsPerSection } : {}),
          ...(dto.canPublishCourses !== undefined ? { canPublishCourses: dto.canPublishCourses } : {}),
          ...(dto.canCreatePaidCourses !== undefined ? { canCreatePaidCourses: dto.canCreatePaidCourses } : {}),
          ...(dto.maxStudentsTotal !== undefined ? { maxStudentsTotal: dto.maxStudentsTotal } : {}),
          ...(dto.maxStudentsPerCourse !== undefined ? { maxStudentsPerCourse: dto.maxStudentsPerCourse } : {}),
          ...(dto.canUseQuizzes !== undefined ? { canUseQuizzes: dto.canUseQuizzes } : {}),
          ...(dto.canUseAssignments !== undefined ? { canUseAssignments: dto.canUseAssignments } : {}),
          ...(dto.canIssueCertificates !== undefined ? { canIssueCertificates: dto.canIssueCertificates } : {}),
          ...(dto.canUseAnalytics !== undefined ? { canUseAnalytics: dto.canUseAnalytics } : {}),
          ...(dto.canUseReviews !== undefined ? { canUseReviews: dto.canUseReviews } : {}),
          ...(dto.maxStorageMb !== undefined ? { maxStorageMb: dto.maxStorageMb } : {}),
          ...(dto.canUploadThumbnails !== undefined ? { canUploadThumbnails: dto.canUploadThumbnails } : {}),
          ...(dto.canUploadProfileImage !== undefined ? { canUploadProfileImage: dto.canUploadProfileImage } : {}),
          ...(dto.canUseManualPayments !== undefined ? { canUseManualPayments: dto.canUseManualPayments } : {}),
          ...(dto.hasAdvancedAnalytics !== undefined ? { hasAdvancedAnalytics: dto.hasAdvancedAnalytics } : {}),
          ...(dto.hasOnlinePayments !== undefined ? { hasOnlinePayments: dto.hasOnlinePayments } : {}),
          ...(dto.maxAdminUsers !== undefined ? { maxAdminUsers: dto.maxAdminUsers } : {}),
          ...(dto.maxInstructorUsers !== undefined ? { maxInstructorUsers: dto.maxInstructorUsers } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {})
        },
        include: this.planInclude
      });
    } catch {
      throw new ConflictException("A plan with this code already exists");
    }
  }

  async archivePlan(planId: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        isArchived: true
      }
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    if (plan.isArchived) {
      throw new BadRequestException("Plan is already archived");
    }

    return this.prisma.plan.update({
      where: { id: planId },
      data: {
        isArchived: true,
        isActive: false
      },
      include: this.planInclude
    });
  }

  async getTenantUsage(tenantId: string) {
    const [coursesCount, distinctStudents, instructorsCount, adminsCount] = await Promise.all([
      this.prisma.course.count({ where: { tenantId } }),
      this.prisma.studentInstructor.findMany({
        where: {
          instructor: {
            tenantId
          }
        },
        distinct: ["studentId"],
        select: {
          studentId: true
        }
      }),
      this.prisma.user.count({ where: { tenantId, role: "INSTRUCTOR" } }),
      this.prisma.user.count({ where: { tenantId, role: "ADMIN" } })
    ]);

    return {
      coursesCount,
      studentsCount: distinctStudents.length,
      instructorsCount,
      adminsCount,
      storageUsedMb: 0
    };
  }
}
