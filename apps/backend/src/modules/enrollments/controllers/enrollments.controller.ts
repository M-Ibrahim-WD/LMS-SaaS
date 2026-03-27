import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateEnrollmentDto } from "../dto/create-enrollment.dto";
import { EnrollmentsService } from "../services/enrollments.service";

@Controller("enrollments")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Roles("STUDENT")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(user, dto);
  }

  @Roles("STUDENT")
  @Get("my-courses")
  myCourses(@CurrentUser() user: JwtPayload) {
    return this.enrollmentsService.myCourses(user);
  }
}

