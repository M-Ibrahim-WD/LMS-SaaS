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
import {
  type EffectivePermissions,
  SubscriptionPolicyService
} from "./subscription-policy.service";

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionPolicyService: SubscriptionPolicyService
  ) {}

  async ensureCorePlans() {
    const corePlans = this.subscriptionPolicyService.getCorePlans();

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
    const endsAt = this.subscriptionPolicyService.buildSubscriptionEndDate(
      startsAt,
      BillingPeriod.MONTHLY,
      { isTrial: true }
    );

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
    const endsAt = this.subscriptionPolicyService.buildSubscriptionEndDate(
      startsAt,
      billingPeriod,
      options
    );

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

    return this.subscriptionPolicyService.mapEntitlementSummary(current);
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
        this.subscriptionPolicyService.mapEntitlementSummary(currentSubscription),
      freezeCreation: !currentSubscription,
      daysRemaining: this.subscriptionPolicyService.buildDaysRemaining(
        currentSubscription?.endsAt ?? null
      )
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
      trialRules: this.subscriptionPolicyService.getTrialPermissions(),
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
      trialRules: this.subscriptionPolicyService.getTrialPermissions(),
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
