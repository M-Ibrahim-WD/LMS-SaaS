import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  BillingPeriod,
  PaymentMethodCategory,
  Plan,
  PlatformPaymentMethodType,
  Prisma,
  SubscriptionPaymentProvider,
  SubscriptionPaymentStatus,
  SubscriptionState,
  TenantSubscription,
  UserRole
} from "@prisma/client";
import { createReadStream, promises as fs } from "fs";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { extname, join } from "path";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PlansService } from "../../plans/services/plans.service";
import {
  type EffectivePermissions,
  SubscriptionPolicyService
} from "./subscription-policy.service";
import {
  PayMobSubscriptionGatewayService,
  PayoneerSubscriptionGatewayService,
  PayPalSubscriptionGatewayService,
  PayTabsSubscriptionGatewayService,
  StripeSubscriptionGatewayService
} from "./subscription-gateway.services";

const MANUAL_PLATFORM_PAYMENT_TYPES = new Set<PlatformPaymentMethodType>([
  PlatformPaymentMethodType.INSTAPAY,
  PlatformPaymentMethodType.VODAFONE_CASH,
  PlatformPaymentMethodType.ORANGE_CASH,
  PlatformPaymentMethodType.ETISALAT_CASH,
  PlatformPaymentMethodType.WE_CASH,
  PlatformPaymentMethodType.FAWRY,
  PlatformPaymentMethodType.BANK,
  PlatformPaymentMethodType.CUSTOM
]);

const PLATFORM_EWALLET_RULES: Partial<Record<PlatformPaymentMethodType, { prefix: string; maxLength: number; label: string }>> = {
  [PlatformPaymentMethodType.VODAFONE_CASH]: {
    prefix: "010",
    maxLength: 12,
    label: "VODAFONE_CASH"
  },
  [PlatformPaymentMethodType.ORANGE_CASH]: {
    prefix: "012",
    maxLength: 12,
    label: "ORANGE_CASH"
  },
  [PlatformPaymentMethodType.ETISALAT_CASH]: {
    prefix: "011",
    maxLength: 12,
    label: "ETISALAT_CASH"
  },
  [PlatformPaymentMethodType.WE_CASH]: {
    prefix: "015",
    maxLength: 11,
    label: "WE_CASH"
  }
};

const PLATFORM_PROVIDER_MAP: Record<PlatformPaymentMethodType, SubscriptionPaymentProvider> = {
  [PlatformPaymentMethodType.INSTAPAY]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.VODAFONE_CASH]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.ORANGE_CASH]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.ETISALAT_CASH]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.WE_CASH]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.FAWRY]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.BANK]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.CUSTOM]: SubscriptionPaymentProvider.MANUAL,
  [PlatformPaymentMethodType.PAYMOB]: SubscriptionPaymentProvider.PAYMOB,
  [PlatformPaymentMethodType.PAYTABS]: SubscriptionPaymentProvider.PAYTABS,
  [PlatformPaymentMethodType.STRIPE]: SubscriptionPaymentProvider.STRIPE,
  [PlatformPaymentMethodType.PAYPAL]: SubscriptionPaymentProvider.PAYPAL,
  [PlatformPaymentMethodType.PAYONEER]: SubscriptionPaymentProvider.OTHER,
  [PlatformPaymentMethodType.OTHER]: SubscriptionPaymentProvider.OTHER
};

@Injectable()
export class SubscriptionsService {
  private readonly proofStorageDir = join(process.cwd(), "uploads", "subscription-payment-proofs");
  private readonly maxProofSizeBytes = 5 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionPolicyService: SubscriptionPolicyService,
    private readonly stripeGateway: StripeSubscriptionGatewayService,
    private readonly paypalGateway: PayPalSubscriptionGatewayService,
    private readonly paymobGateway: PayMobSubscriptionGatewayService,
    private readonly paytabsGateway: PayTabsSubscriptionGatewayService,
    private readonly payoneerGateway: PayoneerSubscriptionGatewayService
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

  listTeacherPlatformPaymentMethods() {
    return this.prisma.platformPaymentMethod
      .findMany({
        where: {
          isActive: true,
          isDeleted: false,
          OR: [
            { category: PaymentMethodCategory.MANUAL },
            { category: PaymentMethodCategory.ONLINE, isConfigured: true }
          ]
        },
        orderBy: [{ category: "asc" }, { createdAt: "desc" }]
      })
      .then((methods) => methods.map((method) => this.serializePlatformPaymentMethod(method, false)));
  }

  async listAdminPlatformPaymentMethods(user: JwtPayload) {
    this.assertCanManagePlatformPaymentMethods(user);
    const methods = await this.prisma.platformPaymentMethod.findMany({
      where: { isDeleted: false },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }]
    });
    return methods.map((method) => this.serializePlatformPaymentMethod(method, true));
  }

  async createPlatformPaymentMethod(
    user: JwtPayload,
    input: {
      type: PlatformPaymentMethodType;
      label: string;
      details?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
      isConfigured?: boolean;
    }
  ) {
    this.assertCanManagePlatformPaymentMethods(user);
    const category = this.resolvePlatformMethodCategory(input.type);
    const label = input.label.trim();
    if (!label) {
      throw new BadRequestException("Payment method label is required.");
    }

    const details = input.details?.trim() || "";
    const existingMethod = await this.prisma.platformPaymentMethod.findFirst({
      where: {
        type: input.type,
        details,
        isDeleted: false
      },
      select: { id: true }
    });
    if (existingMethod) {
      throw new BadRequestException("This platform payment account already exists for this method.");
    }

    const created = await this.prisma.platformPaymentMethod.create({
      data: {
        type: input.type,
        category,
        label,
        details,
        config: this.toJsonValue(input.config),
        isActive: input.isActive ?? true,
        isConfigured: category === PaymentMethodCategory.MANUAL ? true : Boolean(input.isConfigured),
        createdById: user.sub
      }
    });

    return this.serializePlatformPaymentMethod(created, true);
  }

  createManualPlatformPaymentMethod(
    user: JwtPayload,
    input: {
      type: PlatformPaymentMethodType;
      label: string;
      details: string;
      instructions?: string;
      isActive?: boolean;
    }
  ) {
    if (!MANUAL_PLATFORM_PAYMENT_TYPES.has(input.type)) {
      throw new BadRequestException("This endpoint only accepts manual platform payment methods.");
    }

    const details = this.normalizeManualPlatformPaymentDetails(input.type, input.details);
    return this.createPlatformPaymentMethod(user, {
      type: input.type,
      label: input.label,
      details: input.instructions?.trim() ? `${details}\n\n${input.instructions.trim()}` : details,
      isActive: input.isActive,
      isConfigured: true
    });
  }

  createGatewayPlatformPaymentMethod(
    user: JwtPayload,
    type: Exclude<PlatformPaymentMethodType, "INSTAPAY" | "VODAFONE_CASH" | "ORANGE_CASH" | "ETISALAT_CASH" | "WE_CASH" | "FAWRY" | "BANK" | "CUSTOM">,
    input: {
      label: string;
      config: Record<string, unknown>;
      isActive?: boolean;
    }
  ) {
    if (MANUAL_PLATFORM_PAYMENT_TYPES.has(type)) {
      throw new BadRequestException("This endpoint only accepts online platform gateways.");
    }

    this.validateGatewayConfig(type, input.config);
    return this.createPlatformPaymentMethod(user, {
      type,
      label: input.label,
      details: this.describeGateway(type, input.config),
      config: input.config,
      isActive: input.isActive,
      isConfigured: true
    });
  }

  async updatePlatformPaymentMethod(
    user: JwtPayload,
    id: string,
    input: {
      type?: PlatformPaymentMethodType;
      label?: string;
      details?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
      isConfigured?: boolean;
    }
  ) {
    this.assertCanManagePlatformPaymentMethods(user);
    const existing = await this.prisma.platformPaymentMethod.findFirst({
      where: { id, isDeleted: false }
    });

    if (!existing) {
      throw new NotFoundException("Platform payment method not found.");
    }

    const nextType = input.type ?? existing.type;
    const category = this.resolvePlatformMethodCategory(nextType);
    const nextLabel = input.label?.trim();
    if (input.label !== undefined && !nextLabel) {
      throw new BadRequestException("Payment method label is required.");
    }

    const updated = await this.prisma.platformPaymentMethod.update({
      where: { id: existing.id },
      data: {
        type: nextType,
        category,
        label: nextLabel ?? existing.label,
        details: input.details !== undefined ? input.details.trim() : existing.details,
        config: input.config !== undefined ? this.toJsonValue(input.config) : undefined,
        isActive: input.isActive ?? existing.isActive,
        isConfigured:
          category === PaymentMethodCategory.MANUAL
            ? true
            : input.isConfigured ?? existing.isConfigured
      }
    });

    return this.serializePlatformPaymentMethod(updated, true);
  }

  async deletePlatformPaymentMethod(user: JwtPayload, id: string) {
    this.assertCanManagePlatformPaymentMethods(user);
    const existing = await this.prisma.platformPaymentMethod.findFirst({
      where: { id, isDeleted: false },
      select: { id: true }
    });

    if (!existing) {
      throw new NotFoundException("Platform payment method not found.");
    }

    const deleted = await this.prisma.platformPaymentMethod.update({
      where: { id: existing.id },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date()
      }
    });

    return this.serializePlatformPaymentMethod(deleted, true);
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
    if (await this.hasUsedTrial(tenantId)) {
      throw new BadRequestException("This workspace has already used its free trial. Please submit payment to activate a plan.");
    }

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

  async hasUsedTrial(tenantId: string) {
    const trialCount = await this.prisma.tenantSubscription.count({
      where: {
        tenantId,
        isTrial: true
      }
    });

    return trialCount > 0;
  }

  async getPendingSubscriptionPayment(tenantId: string | null) {
    if (!tenantId) {
      return null;
    }

    return this.prisma.subscriptionPayment.findFirst({
      where: {
        tenantId,
        status: {
          in: [
            SubscriptionPaymentStatus.PENDING,
            SubscriptionPaymentStatus.PROCESSING
          ]
        }
      },
      include: {
        plan: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createSubscriptionPaymentRequest(
    user: JwtPayload,
    input: {
      planId: string;
      billingPeriod: BillingPeriod;
      provider?: SubscriptionPaymentProvider;
      platformPaymentMethodId: string;
      file?: {
        buffer: Buffer;
        originalname?: string;
        mimetype?: string;
        size?: number;
      };
    }
  ) {
    return this.createManualSubscriptionPaymentRequest(user, input);
  }

  async createManualSubscriptionPaymentRequest(
    user: JwtPayload,
    input: {
      planId: string;
      billingPeriod: BillingPeriod;
      platformPaymentMethodId: string;
      file?: {
        buffer: Buffer;
        originalname?: string;
        mimetype?: string;
        size?: number;
      };
    }
  ) {
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException("Only instructors can request subscription payments.");
    }
    if (!user.tenantId) {
      throw new BadRequestException("Instructor workspace not found");
    }

    await this.ensureCorePlans();
    await this.expireStaleSubscriptions(user.tenantId);

    if (!(await this.hasUsedTrial(user.tenantId))) {
      throw new BadRequestException("Start your free trial before submitting a paid subscription payment.");
    }

    const plan = await this.prisma.plan.findFirst({
      where: {
        id: input.planId,
        isActive: true,
        isArchived: false
      }
    });

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }

    const existingPending = await this.getPendingSubscriptionPayment(user.tenantId);
    if (existingPending) {
      throw new BadRequestException("A subscription payment request is already pending review.");
    }

    const platformMethod = await this.prisma.platformPaymentMethod.findFirst({
      where: {
        id: input.platformPaymentMethodId,
        isActive: true,
        isDeleted: false
      }
    });

    if (!platformMethod) {
      throw new NotFoundException("Platform payment method not found.");
    }

    if (platformMethod.category !== PaymentMethodCategory.MANUAL) {
      throw new BadRequestException("Use the online subscription payment endpoint for gateway payments.");
    }

    const provider = SubscriptionPaymentProvider.MANUAL;
    const proof = await this.storeUploadedProof(input.file);
    const amount =
      input.billingPeriod === BillingPeriod.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;

    return this.prisma.subscriptionPayment.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        planId: plan.id,
        platformPaymentMethodId: platformMethod.id,
        billingPeriod: input.billingPeriod,
        provider,
        amount,
        proof,
        status: SubscriptionPaymentStatus.PENDING
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
        plan: true,
        platformPaymentMethod: true
      }
    });
  }

  async createOnlineSubscriptionPaymentRequest(
    user: JwtPayload,
    input: {
      planId: string;
      billingPeriod: BillingPeriod;
      platformPaymentMethodId: string;
    }
  ) {
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException("Only instructors can request subscription payments.");
    }
    if (!user.tenantId) {
      throw new BadRequestException("Instructor workspace not found");
    }

    await this.ensureCorePlans();
    await this.expireStaleSubscriptions(user.tenantId);

    if (!(await this.hasUsedTrial(user.tenantId))) {
      throw new BadRequestException("Start your free trial before submitting a paid subscription payment.");
    }

    const [plan, platformMethod] = await Promise.all([
      this.prisma.plan.findFirst({
        where: {
          id: input.planId,
          isActive: true,
          isArchived: false
        }
      }),
      this.prisma.platformPaymentMethod.findFirst({
        where: {
          id: input.platformPaymentMethodId,
          isActive: true,
          isDeleted: false,
          isConfigured: true
        }
      })
    ]);

    if (!plan) {
      throw new NotFoundException("Plan not found");
    }
    if (!platformMethod || platformMethod.category !== PaymentMethodCategory.ONLINE) {
      throw new NotFoundException("Configured online platform payment method not found.");
    }

    const existingPending = await this.getPendingSubscriptionPayment(user.tenantId);
    if (existingPending) {
      throw new BadRequestException("A subscription payment request is already pending review.");
    }

    const amount = input.billingPeriod === BillingPeriod.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
    const provider = PLATFORM_PROVIDER_MAP[platformMethod.type] ?? SubscriptionPaymentProvider.OTHER;
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        tenantId: user.tenantId,
        userId: user.sub,
        planId: plan.id,
        platformPaymentMethodId: platformMethod.id,
        billingPeriod: input.billingPeriod,
        provider,
        amount,
        status: SubscriptionPaymentStatus.PROCESSING
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
        plan: true,
        platformPaymentMethod: true
      }
    });

    const checkout = await this.createGatewayCheckout(platformMethod, {
      paymentId: payment.id,
      amount,
      currency: this.getGatewayCurrency(platformMethod.config),
      planName: plan.name,
      teacherEmail: payment.user.email,
      successUrl: this.getDefaultGatewayUrl("success"),
      cancelUrl: this.getDefaultGatewayUrl("cancel"),
      callbackUrl: this.getDefaultGatewayUrl("callback")
    });

    const updatedPayment = await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        providerRef: checkout.providerRef
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
        plan: true,
        platformPaymentMethod: true
      }
    });

    return {
      payment: updatedPayment,
      redirectUrl: checkout.redirectUrl
    };
  }

  async listSubscriptionPayments(status?: SubscriptionPaymentStatus) {
    return this.prisma.subscriptionPayment.findMany({
      where: status
        ? { status }
        : {
            status: {
              in: [SubscriptionPaymentStatus.PENDING, SubscriptionPaymentStatus.PROCESSING]
            }
          },
      include: {
        tenant: { select: { id: true, name: true, isActive: true } },
        user: { select: { id: true, fullName: true, email: true } },
        plan: true,
        platformPaymentMethod: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async approveSubscriptionPayment(id: string, adminNote?: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id },
      include: { plan: true, platformPaymentMethod: true }
    });

    if (!payment) {
      throw new NotFoundException("Subscription payment request not found");
    }
    if (payment.status !== SubscriptionPaymentStatus.PENDING && payment.status !== SubscriptionPaymentStatus.PAID) {
      throw new BadRequestException("Only pending or paid subscription requests can be approved.");
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.tenantSubscription.updateMany({
        where: {
          tenantId: payment.tenantId,
          state: { in: [SubscriptionState.TRIAL, SubscriptionState.ACTIVE] }
        },
        data: {
          state: SubscriptionState.CANCELED,
          canceledAt: new Date(),
          endsAt: new Date()
        }
      });

      const startsAt = new Date();
      const endsAt = this.subscriptionPolicyService.buildSubscriptionEndDate(
        startsAt,
        payment.billingPeriod
      );

      await tx.tenant.update({
        where: { id: payment.tenantId },
        data: { planId: payment.planId }
      });

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId: payment.tenantId,
          planId: payment.planId,
          billingPeriod: payment.billingPeriod,
          state: SubscriptionState.ACTIVE,
          startsAt,
          endsAt,
          isTrial: false,
          adminActivated: true,
          adminNote: adminNote?.trim() || payment.adminNote || null
        },
        include: { plan: true }
      });

      const updatedPayment = await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status:
            payment.status === SubscriptionPaymentStatus.PAID
              ? SubscriptionPaymentStatus.PAID
              : SubscriptionPaymentStatus.APPROVED,
          reviewedAt: new Date(),
          adminNote: adminNote?.trim() || payment.adminNote || null
        },
        include: {
          tenant: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, email: true } },
          plan: true,
          platformPaymentMethod: true
        }
      });

      return {
        payment: updatedPayment,
        subscription
      };
    });
  }

  async rejectSubscriptionPayment(id: string, adminNote?: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id }
    });

    if (!payment) {
      throw new NotFoundException("Subscription payment request not found");
    }
    if (payment.status !== SubscriptionPaymentStatus.PENDING) {
      throw new BadRequestException("Only pending subscription requests can be rejected.");
    }

    return this.prisma.subscriptionPayment.update({
      where: { id },
      data: {
        status: SubscriptionPaymentStatus.REJECTED,
        reviewedAt: new Date(),
        adminNote: adminNote?.trim() || null
      },
      include: {
        tenant: { select: { id: true, name: true } },
        user: { select: { id: true, fullName: true, email: true } },
        plan: true,
        platformPaymentMethod: true
      }
    });
  }

  async getSubscriptionPaymentProof(id: string) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id },
      select: { proof: true }
    });

    if (!payment?.proof) {
      throw new NotFoundException("Payment proof was not uploaded.");
    }

    if (!payment.proof.startsWith("local:")) {
      throw new BadRequestException("Only locally stored payment proofs can be opened here.");
    }

    const fileName = payment.proof.replace(/^local:/, "");
    if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
      throw new BadRequestException("Payment proof reference is invalid.");
    }

    const filePath = join(this.proofStorageDir, fileName);
    await fs.access(filePath);

    return {
      fileName,
      stream: createReadStream(filePath)
    };
  }

  async markGatewayPaymentPaid(provider: SubscriptionPaymentProvider, providerRef: string) {
    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: {
        provider,
        providerRef,
        status: { in: [SubscriptionPaymentStatus.PROCESSING, SubscriptionPaymentStatus.PAID] }
      }
    });

    if (!payment) {
      throw new NotFoundException("Subscription payment request not found.");
    }

    const paid = await this.prisma.subscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: SubscriptionPaymentStatus.PAID,
        reviewedAt: new Date()
      }
    });

    const activated = await this.approveSubscriptionPayment(paid.id, "Activated automatically after verified online payment.");
    return {
      paid,
      activated
    };
  }

  async handleGatewayWebhook(provider: SubscriptionPaymentProvider, body: Record<string, unknown>, headers: Record<string, string | string[] | undefined>) {
    const providerRef = this.extractProviderRef(provider, body);
    if (!providerRef) {
      throw new BadRequestException("Gateway webhook is missing a provider reference.");
    }

    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { provider, providerRef },
      include: { platformPaymentMethod: true }
    });
    if (!payment?.platformPaymentMethod) {
      throw new NotFoundException("Subscription payment request not found.");
    }

    if (!this.verifyGatewayWebhook(payment.platformPaymentMethod, body, headers)) {
      throw new BadRequestException("Gateway webhook signature is invalid.");
    }

    return this.markGatewayPaymentPaid(provider, providerRef);
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

    const [{ currentSubscription: current, latestSubscription: latest, effectivePermissions: effective, daysRemaining }, usage, hasUsedTrial, pendingSubscriptionPayment] =
      await Promise.all([
        this.getTenantEntitlement(tenantId),
        this.plansService.getTenantUsage(tenantId),
        this.hasUsedTrial(tenantId),
        this.getPendingSubscriptionPayment(tenantId)
      ]);

    const selectedPlan = current?.plan ?? latest?.plan ?? null;
    const canStartTrial = !hasUsedTrial && !current;

    return {
      tenantId,
      requiresPlanSelection: !latest,
      freezeCreation: !current,
      hasUsedTrial,
      canStartTrial,
      requiresPayment: !current && hasUsedTrial,
      pendingSubscriptionPayment,
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

    const [{ currentSubscription: current, latestSubscription: latest, daysRemaining }, usage, hasUsedTrial, pendingSubscriptionPayment] = await Promise.all([
      this.getTenantEntitlement(tenantId),
      this.plansService.getTenantUsage(tenantId),
      this.hasUsedTrial(tenantId),
      this.getPendingSubscriptionPayment(tenantId)
    ]);

    return {
      tenant,
      currentSubscription: current,
      latestSubscription: latest,
      usage,
      trialRules: this.subscriptionPolicyService.getTrialPermissions(),
      daysRemaining,
      hasUsedTrial,
      canStartTrial: !hasUsedTrial && !current,
      requiresPayment: !current && hasUsedTrial,
      pendingSubscriptionPayment,
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

  private validateUploadedProof(file?: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
    size?: number;
  }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Payment proof is required.");
    }

    const allowedMimeTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf"
    ]);

    if (!file.mimetype || !allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Payment proof must be an image or PDF.");
    }

    if ((file.size ?? file.buffer.length) > this.maxProofSizeBytes) {
      throw new BadRequestException("Payment proof must be 5 MB or smaller.");
    }
  }

  private async storeUploadedProof(file?: {
    buffer: Buffer;
    originalname?: string;
    mimetype?: string;
    size?: number;
  }) {
    this.validateUploadedProof(file);
    await fs.mkdir(this.proofStorageDir, { recursive: true });

    const safeName = (file!.originalname || "subscription-proof").replace(/[\\/:"*?<>|]+/g, "_").trim();
    const extension = extname(safeName) || ".bin";
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;
    await fs.writeFile(join(this.proofStorageDir, storedName), file!.buffer);
    return `local:${storedName}`;
  }

  private async createGatewayCheckout(
    method: { type: PlatformPaymentMethodType; config: Prisma.JsonValue | null },
    input: {
      paymentId: string;
      amount: number;
      currency: string;
      planName: string;
      teacherEmail: string;
      successUrl: string;
      cancelUrl: string;
      callbackUrl: string;
    }
  ) {
    switch (method.type) {
      case PlatformPaymentMethodType.STRIPE:
        return this.stripeGateway.createCheckout(method.config, input);
      case PlatformPaymentMethodType.PAYPAL:
        return this.paypalGateway.createCheckout(method.config, input);
      case PlatformPaymentMethodType.PAYMOB:
        return this.paymobGateway.createCheckout(method.config, input);
      case PlatformPaymentMethodType.PAYTABS:
        return this.paytabsGateway.createCheckout(method.config, input);
      case PlatformPaymentMethodType.PAYONEER:
        return this.payoneerGateway.createCheckout(method.config, input);
      default:
        throw new BadRequestException("This online payment gateway is not implemented yet.");
    }
  }

  private getGatewayCurrency(config: Prisma.JsonValue | null) {
    const value = config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>).currency
      : null;
    return typeof value === "string" && value.trim() ? value.trim() : "USD";
  }

  private getDefaultGatewayUrl(kind: "success" | "cancel" | "callback") {
    const web = process.env.PUBLIC_WEB_URL?.replace(/\/$/, "") || "http://localhost:3000";
    const api = process.env.PUBLIC_SERVER_URL?.replace(/\/$/, "") || "http://localhost:4000";
    if (kind === "success") {
      return `${web}/subscription?payment=success`;
    }
    if (kind === "cancel") {
      return `${web}/subscription?payment=cancel`;
    }
    return `${api}/api/subscription/webhooks`;
  }

  private resolvePlatformMethodCategory(type: PlatformPaymentMethodType) {
    return MANUAL_PLATFORM_PAYMENT_TYPES.has(type) ? PaymentMethodCategory.MANUAL : PaymentMethodCategory.ONLINE;
  }

  private normalizeManualPlatformPaymentDetails(type: PlatformPaymentMethodType, detailsInput: string) {
    const details = detailsInput.trim();
    if (!details) {
      throw new BadRequestException("Account details are required for manual platform payment methods.");
    }

    const instapayPhoneRegex = /^01[012]\d{8}$/;
    const instapayUsernameRegex = /^[a-z0-9._-]+@instapay$/i;

    if (type === PlatformPaymentMethodType.INSTAPAY) {
      if (!instapayPhoneRegex.test(details) && !instapayUsernameRegex.test(details)) {
        throw new BadRequestException(
          "INSTAPAY must be a phone number starting with 010, 011, or 012, or a username ending with @instapay"
        );
      }
      return details;
    }

    const walletRule = PLATFORM_EWALLET_RULES[type];
    if (walletRule) {
      if (type === PlatformPaymentMethodType.WE_CASH) {
        if (!/^015\d{8}$/.test(details)) {
          throw new BadRequestException("Invalid WE Cash number");
        }
        return details;
      }

      const isValidWallet =
        /^\d+$/.test(details) &&
        details.startsWith(walletRule.prefix) &&
        details.length >= 11 &&
        details.length <= walletRule.maxLength;

      if (!isValidWallet) {
        throw new BadRequestException(
          `${walletRule.label} must start with ${walletRule.prefix} and be 11 to ${walletRule.maxLength} digits`
        );
      }
      return details;
    }

    if (type === PlatformPaymentMethodType.FAWRY && details.length < 4) {
      throw new BadRequestException("FAWRY details must include reference or instructions");
    }

    if (type === PlatformPaymentMethodType.BANK) {
      const hasBank = /bank\s*:/i.test(details);
      const hasName = /name\s*:/i.test(details);
      const hasAccount = /account\s*:|iban\s*:/i.test(details);
      if (!hasBank || !hasName || !hasAccount) {
        throw new BadRequestException("Bank details must include Bank, Name, and Account or IBAN.");
      }
    }

    if (type === PlatformPaymentMethodType.CUSTOM && details.length < 4) {
      throw new BadRequestException("CUSTOM details are too short");
    }

    return details;
  }

  private validateGatewayConfig(type: PlatformPaymentMethodType, config: Record<string, unknown>) {
    const requiredFields: Partial<Record<PlatformPaymentMethodType, string[]>> = {
      [PlatformPaymentMethodType.STRIPE]: ["secretKey", "webhookSecret", "currency", "successUrl", "cancelUrl"],
      [PlatformPaymentMethodType.PAYPAL]: ["clientId", "clientSecret", "environment", "currency", "returnUrl", "cancelUrl"],
      [PlatformPaymentMethodType.PAYMOB]: ["secretKey", "publicKey", "integrationId", "hmacSecret", "currency", "callbackUrl", "redirectUrl"],
      [PlatformPaymentMethodType.PAYTABS]: ["profileId", "serverKey", "endpointUrl", "currency", "returnUrl", "callbackUrl"],
      [PlatformPaymentMethodType.PAYONEER]: ["apiBaseUrl", "merchantId", "programId", "apiToken", "currency", "returnUrl", "callbackUrl"]
    };
    const missing = (requiredFields[type] ?? []).filter((field) => !String(config[field] ?? "").trim());
    if (missing.length) {
      throw new BadRequestException(`${type} configuration is missing: ${missing.join(", ")}.`);
    }
  }

  private describeGateway(type: PlatformPaymentMethodType, config: Record<string, unknown>) {
    const environment = typeof config.environment === "string" ? ` (${config.environment})` : "";
    const currency = typeof config.currency === "string" ? ` - ${config.currency}` : "";
    return `${type}${environment}${currency}`;
  }

  private extractProviderRef(provider: SubscriptionPaymentProvider, body: Record<string, unknown>) {
    if (provider === SubscriptionPaymentProvider.STRIPE) {
      const data = body.data as { object?: { id?: string; client_reference_id?: string } } | undefined;
      return data?.object?.id ?? data?.object?.client_reference_id ?? null;
    }
    if (provider === SubscriptionPaymentProvider.PAYPAL) {
      const resource = this.safeRecord(body.resource);
      const supplementaryData = this.safeRecord(resource.supplementary_data);
      const relatedIds = this.safeRecord(supplementaryData.related_ids);
      return String(body.id ?? resource.id ?? relatedIds.order_id ?? "");
    }
    if (provider === SubscriptionPaymentProvider.PAYMOB) {
      const obj = this.safeRecord(body.obj);
      return String(obj.id ?? body.id ?? "");
    }
    if (provider === SubscriptionPaymentProvider.PAYTABS) {
      return String(body.tran_ref ?? body.cart_id ?? "");
    }
    return String(body.reference ?? body.listId ?? body.id ?? "");
  }

  private verifyGatewayWebhook(
    method: { type: PlatformPaymentMethodType; config: Prisma.JsonValue | null },
    body: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>
  ) {
    const config = method.config && typeof method.config === "object" && !Array.isArray(method.config)
      ? (method.config as Record<string, unknown>)
      : {};

    if (method.type === PlatformPaymentMethodType.STRIPE) {
      const signature = Array.isArray(headers["stripe-signature"]) ? headers["stripe-signature"].join(",") : headers["stripe-signature"];
      return Boolean(signature && this.stripeGateway.verifyWebhook(config, JSON.stringify(body), signature));
    }

    const configuredSecret = String(config.hmacSecret ?? config.webhookSecret ?? config.serverKey ?? config.apiToken ?? "");
    if (!configuredSecret) {
      return false;
    }

    const received = String(headers["x-athar-signature"] ?? body.signature ?? body.hmac ?? "");
    if (!received) {
      return false;
    }

    const expected = createHmac("sha256", configuredSecret).update(JSON.stringify(body)).digest("hex");
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  private safeRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private assertCanManagePlatformPaymentMethods(user: JwtPayload) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can manage platform payment methods.");
    }

    if (
      !user.isSuperAdmin &&
      !user.adminPermissions?.includes("REVIEW_PAYMENTS") &&
      !user.adminPermissions?.includes("MANAGE_PLANS")
    ) {
      throw new ForbiddenException("You do not have permission to manage platform payment methods.");
    }
  }

  private toJsonValue(value?: Record<string, unknown>) {
    return (value ?? {}) as Prisma.InputJsonValue;
  }

  private serializePlatformPaymentMethod<
    T extends {
      id: string;
      type: PlatformPaymentMethodType;
      category: PaymentMethodCategory;
      label: string;
      details: string;
      config: Prisma.JsonValue | null;
      isActive: boolean;
      isConfigured: boolean;
      isDeleted: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  >(method: T, includeConfigStatus: boolean) {
    const config = method.config && typeof method.config === "object" && !Array.isArray(method.config)
      ? (method.config as Record<string, unknown>)
      : {};
    const configKeys = Object.keys(config);

    return {
      id: method.id,
      type: method.type,
      category: method.category,
      label: method.label,
      details: method.details,
      isActive: method.isActive,
      isConfigured: method.isConfigured,
      isDeleted: method.isDeleted,
      createdAt: method.createdAt,
      updatedAt: method.updatedAt,
      provider: PLATFORM_PROVIDER_MAP[method.type] ?? SubscriptionPaymentProvider.OTHER,
      isSelectable: method.isActive && !method.isDeleted && (method.category === PaymentMethodCategory.MANUAL || method.isConfigured),
      configKeys: includeConfigStatus ? configKeys : undefined,
      hasConfig: includeConfigStatus ? configKeys.length > 0 : undefined
    };
  }
}
