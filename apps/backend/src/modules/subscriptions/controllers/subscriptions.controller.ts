import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PlatformPaymentMethodType, SubscriptionPaymentProvider, SubscriptionPaymentStatus } from "@prisma/client";
import { Request } from "express";
import type { Response } from "express";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  AdminUpdateSubscriptionDto,
  AdminUpsertSubscriptionDto,
  CreateManualSubscriptionPaymentDto,
  CreateOnlineSubscriptionPaymentDto,
  CreateSubscriptionPaymentDto,
  ReviewSubscriptionPaymentDto,
  SelectPlanDto,
  UpsertManualPlatformPaymentMethodDto,
  UpsertPayMobPlatformPaymentMethodDto,
  UpsertPayoneerPlatformPaymentMethodDto,
  UpsertPayPalPlatformPaymentMethodDto,
  UpsertPayTabsPlatformPaymentMethodDto,
  UpsertPlatformPaymentMethodDto,
  UpsertStripePlatformPaymentMethodDto
} from "../dto/subscription.dto";
import { SubscriptionsService } from "../services/subscriptions.service";

@Controller("subscription")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Roles("INSTRUCTOR")
  @Get("me")
  getMine(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getSubscriptionSummary(user);
  }

  @Roles("INSTRUCTOR")
  @Get("plans")
  getPlans() {
    return this.subscriptionsService.getSelectablePlans();
  }

  @Roles("INSTRUCTOR")
  @Get("payment-methods")
  getTeacherPlatformPaymentMethods() {
    return this.subscriptionsService.listTeacherPlatformPaymentMethods();
  }

  @Roles("INSTRUCTOR")
  @Post("select-plan")
  selectPlan(@CurrentUser() user: JwtPayload, @Body() dto: SelectPlanDto) {
    if (!user.tenantId) {
      throw new BadRequestException("Instructor workspace not found");
    }

    return this.subscriptionsService.startTrial(user.tenantId, dto.planId);
  }

  @Roles("INSTRUCTOR")
  @Post("payment-requests")
  @UseInterceptors(FileInterceptor("proof", { limits: { fileSize: 5 * 1024 * 1024 } }))
  createPaymentRequest(
    @CurrentUser() user: JwtPayload,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined,
    @Body() rawBody: Record<string, unknown>
  ) {
    const planId = typeof rawBody.planId === "string" ? rawBody.planId.trim() : "";
    const platformPaymentMethodId =
      typeof rawBody.platformPaymentMethodId === "string" ? rawBody.platformPaymentMethodId.trim() : "";
    const billingPeriod = rawBody.billingPeriod;
    const provider = rawBody.provider;

    if (!planId) {
      throw new BadRequestException("planId is required");
    }
    if (!platformPaymentMethodId) {
      throw new BadRequestException("platformPaymentMethodId is required");
    }
    if (billingPeriod !== "MONTHLY" && billingPeriod !== "YEARLY") {
      throw new BadRequestException("billingPeriod must be MONTHLY or YEARLY");
    }
    if (provider !== undefined && !Object.values(SubscriptionPaymentProvider).includes(provider as SubscriptionPaymentProvider)) {
      throw new BadRequestException("Unsupported payment provider");
    }

    const dto: CreateSubscriptionPaymentDto = {
      planId,
      platformPaymentMethodId,
      billingPeriod,
      provider: (provider as SubscriptionPaymentProvider | undefined) ?? SubscriptionPaymentProvider.MANUAL
    };

    return this.subscriptionsService.createSubscriptionPaymentRequest(user, {
      ...dto,
      file
    });
  }

  @Roles("INSTRUCTOR")
  @Post("payment-requests/manual")
  @UseInterceptors(FileInterceptor("proof", { limits: { fileSize: 5 * 1024 * 1024 } }))
  createManualPaymentRequest(
    @CurrentUser() user: JwtPayload,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined,
    @Body() dto: CreateManualSubscriptionPaymentDto
  ) {
    return this.subscriptionsService.createManualSubscriptionPaymentRequest(user, {
      ...dto,
      file
    });
  }

  @Roles("INSTRUCTOR")
  @Post("payment-requests/online")
  createOnlinePaymentRequest(@CurrentUser() user: JwtPayload, @Body() dto: CreateOnlineSubscriptionPaymentDto) {
    return this.subscriptionsService.createOnlineSubscriptionPaymentRequest(user, dto);
  }

  @Roles("ADMIN")
  @Get("payment-methods/admin")
  listAdminPlatformPaymentMethods(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.listAdminPlatformPaymentMethods(user);
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/manual")
  createManualPlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertManualPlatformPaymentMethodDto) {
    return this.subscriptionsService.createManualPlatformPaymentMethod(user, dto);
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/stripe")
  createStripePlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertStripePlatformPaymentMethodDto) {
    return this.subscriptionsService.createGatewayPlatformPaymentMethod(user, PlatformPaymentMethodType.STRIPE, {
      label: dto.label,
      isActive: dto.isActive,
      config: {
        secretKey: dto.secretKey,
        webhookSecret: dto.webhookSecret,
        currency: dto.currency,
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl
      }
    });
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/paypal")
  createPayPalPlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertPayPalPlatformPaymentMethodDto) {
    return this.subscriptionsService.createGatewayPlatformPaymentMethod(user, PlatformPaymentMethodType.PAYPAL, {
      label: dto.label,
      isActive: dto.isActive,
      config: {
        clientId: dto.clientId,
        clientSecret: dto.clientSecret,
        environment: dto.environment,
        currency: dto.currency,
        returnUrl: dto.returnUrl,
        cancelUrl: dto.cancelUrl
      }
    });
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/paymob")
  createPayMobPlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertPayMobPlatformPaymentMethodDto) {
    return this.subscriptionsService.createGatewayPlatformPaymentMethod(user, PlatformPaymentMethodType.PAYMOB, {
      label: dto.label,
      isActive: dto.isActive,
      config: {
        secretKey: dto.secretKey,
        publicKey: dto.publicKey,
        apiKey: dto.apiKey,
        integrationId: dto.integrationId,
        iframeId: dto.iframeId,
        hmacSecret: dto.hmacSecret,
        currency: dto.currency,
        callbackUrl: dto.callbackUrl,
        redirectUrl: dto.redirectUrl
      }
    });
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/paytabs")
  createPayTabsPlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertPayTabsPlatformPaymentMethodDto) {
    return this.subscriptionsService.createGatewayPlatformPaymentMethod(user, PlatformPaymentMethodType.PAYTABS, {
      label: dto.label,
      isActive: dto.isActive,
      config: {
        profileId: dto.profileId,
        serverKey: dto.serverKey,
        endpointUrl: dto.endpointUrl,
        currency: dto.currency,
        returnUrl: dto.returnUrl,
        callbackUrl: dto.callbackUrl
      }
    });
  }

  @Roles("ADMIN")
  @Post("payment-methods/admin/payoneer")
  createPayoneerPlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Body() dto: UpsertPayoneerPlatformPaymentMethodDto) {
    return this.subscriptionsService.createGatewayPlatformPaymentMethod(user, PlatformPaymentMethodType.PAYONEER, {
      label: dto.label,
      isActive: dto.isActive,
      config: {
        apiBaseUrl: dto.apiBaseUrl,
        merchantId: dto.merchantId,
        programId: dto.programId,
        apiToken: dto.apiToken,
        currency: dto.currency,
        returnUrl: dto.returnUrl,
        callbackUrl: dto.callbackUrl
      }
    });
  }

  @Roles("ADMIN")
  @Patch("payment-methods/admin/:id")
  updatePlatformPaymentMethod(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: Partial<UpsertPlatformPaymentMethodDto>
  ) {
    return this.subscriptionsService.updatePlatformPaymentMethod(user, id, dto);
  }

  @Roles("ADMIN")
  @Delete("payment-methods/admin/:id")
  deletePlatformPaymentMethod(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.subscriptionsService.deletePlatformPaymentMethod(user, id);
  }

  @Roles("ADMIN")
  @Get("tenants/:id")
  getTenantSubscription(@Param("id") id: string) {
    return this.subscriptionsService.getAdminTenantSubscription(id);
  }

  @Roles("ADMIN")
  @Get("payment-requests")
  listSubscriptionPaymentRequests(@Query("status") status?: string) {
    if (status && !Object.values(SubscriptionPaymentStatus).includes(status as SubscriptionPaymentStatus)) {
      throw new BadRequestException("Unsupported subscription payment status");
    }
    return this.subscriptionsService.listSubscriptionPayments(status as SubscriptionPaymentStatus | undefined);
  }

  @Roles("ADMIN")
  @Patch("payment-requests/:id/approve")
  approveSubscriptionPaymentRequest(
    @Param("id") id: string,
    @Body() dto: ReviewSubscriptionPaymentDto
  ) {
    return this.subscriptionsService.approveSubscriptionPayment(id, dto.adminNote);
  }

  @Roles("ADMIN")
  @Get("payment-requests/:id/proof")
  async getSubscriptionPaymentProof(@Param("id") id: string, @Res() res: Response) {
    const proof = await this.subscriptionsService.getSubscriptionPaymentProof(id);
    res.setHeader("Content-Disposition", `inline; filename="${proof.fileName.replace(/"/g, "")}"`);
    return proof.stream.pipe(res);
  }

  @Roles("ADMIN")
  @Patch("payment-requests/:id/reject")
  rejectSubscriptionPaymentRequest(
    @Param("id") id: string,
    @Body() dto: ReviewSubscriptionPaymentDto
  ) {
    return this.subscriptionsService.rejectSubscriptionPayment(id, dto.adminNote);
  }

  @Roles("ADMIN")
  @Post("tenants/:id")
  createTenantSubscription(@Param("id") id: string, @Body() dto: AdminUpsertSubscriptionDto) {
    return this.subscriptionsService.upsertAdminSubscription(id, dto.planId, dto.billingPeriod, {
      adminNote: dto.adminNote,
      isTrial: dto.isTrial
    });
  }

  @Roles("ADMIN")
  @Patch("tenants/:id")
  async updateTenantSubscription(@Param("id") id: string, @Body() dto: AdminUpdateSubscriptionDto) {
    const current = await this.subscriptionsService.getCurrentSubscription(id);

    if (dto.restartTrial) {
      const latest = await this.subscriptionsService.getLatestSubscription(id);
      if (!latest) {
        throw new BadRequestException("No previous plan found for trial restart");
      }
      return this.subscriptionsService.restartTrial(id, latest.planId, dto.adminNote);
    }

    if (dto.markCanceled) {
      return this.subscriptionsService.cancelSubscription(id, dto.adminNote);
    }

    if (!current) {
      throw new BadRequestException("No active subscription to update");
    }

    return this.subscriptionsService.upsertAdminSubscription(id, current.planId, dto.billingPeriod ?? current.billingPeriod, {
      adminNote: dto.adminNote,
      isTrial: false
    });
  }
}

@Controller("subscription/webhooks")
export class SubscriptionWebhooksController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("stripe")
  stripe(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.subscriptionsService.handleGatewayWebhook(SubscriptionPaymentProvider.STRIPE, body, req.headers);
  }

  @Post("paypal")
  paypal(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.subscriptionsService.handleGatewayWebhook(SubscriptionPaymentProvider.PAYPAL, body, req.headers);
  }

  @Post("paymob")
  paymob(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.subscriptionsService.handleGatewayWebhook(SubscriptionPaymentProvider.PAYMOB, body, req.headers);
  }

  @Post("paytabs")
  paytabs(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.subscriptionsService.handleGatewayWebhook(SubscriptionPaymentProvider.PAYTABS, body, req.headers);
  }

  @Post("payoneer")
  payoneer(@Body() body: Record<string, unknown>, @Req() req: Request) {
    return this.subscriptionsService.handleGatewayWebhook(SubscriptionPaymentProvider.OTHER, body, req.headers);
  }
}
