import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  AdminUpdateSubscriptionDto,
  AdminUpsertSubscriptionDto,
  SelectPlanDto
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
  @Post("select-plan")
  selectPlan(@CurrentUser() user: JwtPayload, @Body() dto: SelectPlanDto) {
    if (!user.tenantId) {
      throw new BadRequestException("Instructor workspace not found");
    }

    return this.subscriptionsService.startTrial(user.tenantId, dto.planId);
  }

  @Roles("ADMIN")
  @Get("tenants/:id")
  getTenantSubscription(@Param("id") id: string) {
    return this.subscriptionsService.getAdminTenantSubscription(id);
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
