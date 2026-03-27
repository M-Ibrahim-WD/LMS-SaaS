import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreatePaymentMethodDto } from "../dto/create-payment-method.dto";
import { PaymentMethodsService } from "../services/payment-methods.service";

@Controller("payment-methods")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Roles("INSTRUCTOR")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Get("my")
  my(@CurrentUser() user: JwtPayload) {
    return this.paymentMethodsService.myMethods(user);
  }

  @Roles("INSTRUCTOR")
  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.paymentMethodsService.softDelete(user, id);
  }

  @Get("course/:courseId")
  byCourse(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.paymentMethodsService.methodsForCourse(user, courseId);
  }
}
