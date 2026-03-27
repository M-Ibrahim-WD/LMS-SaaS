import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  BillingPeriod,
  Plan,
  SubscriptionState,
  TenantSubscription,
  UserRole
} from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PlansService } from "../../plans/services/plans.service";

const TRIAL_DAYS = 7;

const trialPermissions = {
  maxCourses: 2,
  maxSectionsPerCourse: 1,
  maxLessonsPerSection: 1,
  canPublishCourses: true,
  canCreatePaidCourses: false,
  maxStudentsTotal: 10,
  maxStudentsPerCourse: 10,
  canUseQuizzes: true,
  canUseAssignments: true,
  canIssueCertificates: true,
  canUseAnalytics: false,
  canUseReviews: true,
  maxStorageMb: 256,
  canUploadThumbnails: true,
  canUploadProfileImage: true,
  canUseManualPayments: true,
  canUseOnlinePayments: false,
  maxAdminUsers: 3,
  maxInstructorUsers: 1,
  hasAdvancedAnalytics: false,
  hasOnlinePayments: false
};

type EffectivePermissions = typeof trialPermissions;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService
  ) {}

  async ensureCorePlans() {
    const corePlans: Array<{
      code: string;
      name: string;
      description: string;
      monthlyPrice: number;
      yearlyPrice: number;
      permissions: Partial<Plan>;
    }> = [
      {
        code: "LAUNCH",
        name: "Launch",
        description: "Creator starter plan for early teaching momentum.",
        monthlyPrice: 19,
        yearlyPrice: 190,
        permissions: {
          maxCourses: 5,
          maxSectionsPerCourse: 10,
          maxLessonsPerSection: 20,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 100,
          maxStudentsPerCourse: 50,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: false,
          canUseReviews: true,
          maxStorageMb: 1024,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: false,
          hasOnlinePayments: false,
          maxAdminUsers: 2,
          maxInstructorUsers: 1
        }
      },
      {
        code: "STUDIO",
        name: "Studio",
        description: "Balanced workspace for serious independent instructors.",
        monthlyPrice: 49,
        yearlyPrice: 490,
        permissions: {
          maxCourses: 15,
          maxSectionsPerCourse: 20,
          maxLessonsPerSection: 40,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 500,
          maxStudentsPerCourse: 200,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 5120,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 4,
          maxInstructorUsers: 2
        }
      },
      {
        code: "GROWTH",
        name: "Growth",
        description: "Expanded teaching and learner capacity for growing academies.",
        monthlyPrice: 99,
        yearlyPrice: 990,
        permissions: {
          maxCourses: 40,
          maxSectionsPerCourse: 30,
          maxLessonsPerSection: 60,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 2000,
          maxStudentsPerCourse: 750,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 20480,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 8,
          maxInstructorUsers: 5
        }
      },
      {
        code: "EMPIRE",
        name: "Empire",
        description: "Top-tier scale and control for advanced academies.",
        monthlyPrice: 199,
        yearlyPrice: 1990,
        permissions: {
          maxCourses: 200,
          maxSectionsPerCourse: 50,
          maxLessonsPerSection: 100,
          canPublishCourses: true,
          canCreatePaidCourses: true,
          maxStudentsTotal: 10000,
          maxStudentsPerCourse: 5000,
          canUseQuizzes: true,
          canUseAssignments: true,
          canIssueCertificates: true,
          canUseAnalytics: true,
          canUseReviews: true,
          maxStorageMb: 102400,
          canUploadThumbnails: true,
          canUploadProfileImage: true,
          canUseManualPayments: true,
          hasAdvancedAnalytics: true,
          hasOnlinePayments: false,
          maxAdminUsers: 20,
          maxInstructorUsers: 10
        }
      }
    ];

    for (const plan of corePlans) {
      await this.prisma.plan.upsert({
        where: { code: plan.code },
        update: {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          isCore: true,
          isArchived: false,
          isActive: true,
          ...plan.permissions
        },
        create: {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          isCore: true,
          isArchived: false,
          isActive: true,
          ...plan.permissions
        }
      });
    }
  }

  async getSelectablePlans() {
    await this.ensureCorePlans();

    return this.prisma.plan.findMany({
      where: {
        isActive: true,
        isArchived: false
      },
      orderBy: [{ isCore: "desc" }, { monthlyPrice: "asc" }]
    });
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private mapPlanPermissions(plan: Plan): EffectivePermissions {
    return {
      maxCourses: plan.maxCourses,
      maxSectionsPerCourse: plan.maxSectionsPerCourse,
      maxLessonsPerSection: plan.maxLessonsPerSection,
      canPublishCourses: plan.canPublishCourses,
      canCreatePaidCourses: plan.canCreatePaidCourses,
      maxStudentsTotal: plan.maxStudentsTotal,
      maxStudentsPerCourse: plan.maxStudentsPerCourse,
      canUseQuizzes: plan.canUseQuizzes,
      canUseAssignments: plan.canUseAssignments,
      canIssueCertificates: plan.canIssueCertificates,
      canUseAnalytics: plan.canUseAnalytics,
      canUseReviews: plan.canUseReviews,
      maxStorageMb: plan.maxStorageMb,
      canUploadThumbnails: plan.canUploadThumbnails,
      canUploadProfileImage: plan.canUploadProfileImage,
      canUseManualPayments: plan.canUseManualPayments,
      canUseOnlinePayments: plan.hasOnlinePayments,
      maxAdminUsers: plan.maxAdminUsers,
      maxInstructorUsers: plan.maxInstructorUsers,
      hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
      hasOnlinePayments: plan.hasOnlinePayments
    };
  }

  private buildDaysRemaining(endsAt: Date | null) {
    if (!endsAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  private async expireStaleSubscriptions(tenantId: string) {
    const now = new Date();
    await this.prisma.tenantSubscription.updateMany({
      where: {
        tenantId,
        state: { in: [SubscriptionState.TRIAL, SubscriptionState.ACTIVE] },
        endsAt: { lt: now }
      },
      data: {
        state: SubscriptionState.EXPIRED
      }
    });
  }

  async getCurrentSubscription(tenantId: string | null) {
    if (!tenantId) {
      return null;
    }

    await this.expireStaleSubscriptions(tenantId);

    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        state: { in: [SubscriptionState.TRIAL, SubscriptionState.ACTIVE] }
      },
      include: {
        plan: true
      },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async getLatestSubscription(tenantId: string | null) {
    if (!tenantId) {
      return null;
    }

    await this.expireStaleSubscriptions(tenantId);

    return this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: { plan: true },
      orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }]
    });
  }

  async cancelCurrentSubscriptions(tenantId: string) {
    const now = new Date();
    await this.prisma.tenantSubscription.updateMany({
      where: {
        tenantId,
        state: { in: [SubscriptionState.TRIAL, SubscriptionState.ACTIVE] }
      },
      data: {
        state: SubscriptionState.CANCELED,
        canceledAt: now,
        endsAt: now
      }
    });
  }

  async startTrial(tenantId: string, planId: string) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        isActive: true,
        isArchived: false
      }
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    await this.cancelCurrentSubscriptions(tenantId);

    const startsAt = new Date();
    const endsAt = this.addDays(startsAt, TRIAL_DAYS);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { planId: plan.id }
    });

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        billingPeriod: BillingPeriod.MONTHLY,
        state: SubscriptionState.TRIAL,
        startsAt,
        endsAt,
        isTrial: true,
        adminActivated: false
      },
      include: { plan: true }
    });
  }

  async upsertAdminSubscription(
    tenantId: string,
    planId: string,
    billingPeriod: BillingPeriod,
    options?: { adminNote?: string; isTrial?: boolean }
  ) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id: planId,
        isActive: true,
        isArchived: false
      }
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    await this.cancelCurrentSubscriptions(tenantId);

    const startsAt = new Date();
    const endsAt =
      options?.isTrial
        ? this.addDays(startsAt, TRIAL_DAYS)
        : this.addMonths(startsAt, billingPeriod === BillingPeriod.YEARLY ? 12 : 1);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { planId: plan.id }
    });

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId: plan.id,
        billingPeriod,
        state: options?.isTrial ? SubscriptionState.TRIAL : SubscriptionState.ACTIVE,
        startsAt,
        endsAt,
        isTrial: Boolean(options?.isTrial),
        adminActivated: true,
        adminNote: options?.adminNote?.trim() || null
      },
      include: { plan: true }
    });
  }

  async cancelSubscription(tenantId: string, adminNote?: string) {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) {
      throw new NotFoundException("Active subscription not found");
    }

    const now = new Date();
    return this.prisma.tenantSubscription.update({
      where: { id: current.id },
      data: {
        state: SubscriptionState.CANCELED,
        canceledAt: now,
        endsAt: now,
        adminNote: adminNote?.trim() || current.adminNote || null
      },
      include: { plan: true }
    });
  }

  async restartTrial(tenantId: string, planId: string, adminNote?: string) {
    const created = await this.startTrial(tenantId, planId);
    return this.prisma.tenantSubscription.update({
      where: { id: created.id },
      data: {
        adminActivated: true,
        adminNote: adminNote?.trim() || null
      },
      include: { plan: true }
    });
  }

  async getEffectivePermissionsForTenant(tenantId: string | null) {
    const current = await this.getCurrentSubscription(tenantId);
    if (!current) {
      return null;
    }

    return current.state === SubscriptionState.TRIAL ? trialPermissions : this.mapPlanPermissions(current.plan);
  }

  async getTenantEntitlement(tenantId: string | null) {
    if (!tenantId) {
      return {
        currentSubscription: null,
        latestSubscription: null,
        effectivePermissions: null,
        freezeCreation: true,
        daysRemaining: 0
      };
    }

    const [currentSubscription, latestSubscription] = await Promise.all([
      this.getCurrentSubscription(tenantId),
      this.getLatestSubscription(tenantId)
    ]);

    return {
      currentSubscription,
      latestSubscription,
      effectivePermissions:
        currentSubscription?.state === SubscriptionState.TRIAL
          ? trialPermissions
          : currentSubscription
            ? this.mapPlanPermissions(currentSubscription.plan)
            : null,
      freezeCreation: !currentSubscription,
      daysRemaining: this.buildDaysRemaining(currentSubscription?.endsAt ?? null)
    };
  }

  async getSubscriptionSummary(user: JwtPayload) {
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException("Only instructors use subscriptions");
    }

    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Instructor workspace not found");
    }

    await this.ensureCorePlans();

    const [{ currentSubscription: current, latestSubscription: latest, effectivePermissions: effective, daysRemaining }, usage] =
      await Promise.all([this.getTenantEntitlement(tenantId), this.plansService.getTenantUsage(tenantId)]);

    const selectedPlan = current?.plan ?? latest?.plan ?? null;

    return {
      tenantId,
      requiresPlanSelection: !latest,
      freezeCreation: !current,
      trialRules: trialPermissions,
      selectedPlan,
      currentSubscription: current,
      latestSubscription: latest,
      effectivePermissions: effective,
      usage,
      daysRemaining
    };
  }

  async getAdminTenantSubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true }
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const [{ currentSubscription: current, latestSubscription: latest, daysRemaining }, usage] = await Promise.all([
      this.getTenantEntitlement(tenantId),
      this.plansService.getTenantUsage(tenantId)
    ]);

    return {
      tenant,
      currentSubscription: current,
      latestSubscription: latest,
      usage,
      trialRules: trialPermissions,
      daysRemaining,
      freezeCreation: !current
    };
  }

  async assertInstructorCanCreate(user: JwtPayload) {
    const summary = await this.getSubscriptionSummary(user);
    if (!summary.currentSubscription || !summary.effectivePermissions) {
      throw new ForbiddenException("Choose a plan and activate your subscription to continue.");
    }
    return summary;
  }

  async assertPermission(user: JwtPayload, permission: keyof EffectivePermissions) {
    const summary = await this.assertInstructorCanCreate(user);
    const value = summary.effectivePermissions![permission];

    if (typeof value !== "boolean" || !value) {
      throw new ForbiddenException("Your current subscription does not allow this action.");
    }

    return summary;
  }

  async assertTenantCanAddStudent(tenantId: string) {
    const [entitlement, usage] = await Promise.all([
      this.getTenantEntitlement(tenantId),
      this.plansService.getTenantUsage(tenantId)
    ]);

    if (!entitlement.currentSubscription || !entitlement.effectivePermissions) {
      throw new ForbiddenException("This instructor workspace needs an active subscription before it can accept more students.");
    }

    if (usage.studentsCount >= entitlement.effectivePermissions.maxStudentsTotal) {
      throw new BadRequestException(
        `Plan limit reached: this workspace can only have ${entitlement.effectivePermissions.maxStudentsTotal} students right now.`
      );
    }
  }
}
