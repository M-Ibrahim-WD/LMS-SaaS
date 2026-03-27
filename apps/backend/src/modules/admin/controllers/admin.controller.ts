import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import {
  AdminCoursesQueryDto,
  AdminPaymentsQueryDto,
  AdminTenantsQueryDto,
  AdminUsersQueryDto,
  UpdateAdminStatusDto
} from "../dto/admin-query.dto";
import { AdminService } from "../services/admin.service";
import { CreatePlanDto, UpdatePlanDto } from "../../plans/dto/plan.dto";
import {
  AdminUsersListQueryDto,
  AdminAuditLogsQueryDto,
  CreateAdminUserDto,
  ResetAdminPasswordDto,
  UpdateAdminPermissionsDto
} from "../dto/admin-users.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  getOverview(@CurrentUser() user: JwtPayload) {
    return this.adminService.getOverview(user);
  }

  @Get("tenants")
  listTenants(@CurrentUser() user: JwtPayload, @Query() query: AdminTenantsQueryDto) {
    return this.adminService.listTenants(user, query);
  }

  @Get("plans")
  listPlans(@CurrentUser() user: JwtPayload) {
    return this.adminService.listPlans(user);
  }

  @Post("plans")
  createPlan(@CurrentUser() user: JwtPayload, @Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(user, dto);
  }

  @Patch("plans/:id")
  updatePlan(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(user, id, dto);
  }

  @Patch("plans/:id/archive")
  archivePlan(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.adminService.archivePlan(user, id);
  }

  @Get("tenants/:id")
  getTenantDetail(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.adminService.getTenantDetail(user, id);
  }

  @Patch("tenants/:id/status")
  setTenantStatus(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateAdminStatusDto) {
    return this.adminService.setTenantStatus(user, id, dto.isActive);
  }

  @Get("users")
  listUsers(@CurrentUser() user: JwtPayload, @Query() query: AdminUsersQueryDto) {
    return this.adminService.listUsers(user, query);
  }

  @Get("users/:id")
  getUserDetail(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.adminService.getUserDetail(user, id);
  }

  @Patch("users/:id/status")
  setUserStatus(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateAdminStatusDto) {
    return this.adminService.setUserStatus(user, id, dto.isActive);
  }

  @Get("courses")
  listCourses(@CurrentUser() user: JwtPayload, @Query() query: AdminCoursesQueryDto) {
    return this.adminService.listCourses(user, query);
  }

  @Get("payments")
  listPayments(@CurrentUser() user: JwtPayload, @Query() query: AdminPaymentsQueryDto) {
    return this.adminService.listPayments(user, query);
  }

  @Get("activity")
  getActivity(@CurrentUser() user: JwtPayload) {
    return this.adminService.getActivity(user);
  }

  @Get("admin-users")
  listAdminUsers(@CurrentUser() user: JwtPayload, @Query() query: AdminUsersListQueryDto) {
    return this.adminService.listAdminUsers(user, query);
  }

  @Post("admin-users")
  createAdminUser(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(user, dto);
  }

  @Patch("admin-users/:id/permissions")
  updateAdminPermissions(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateAdminPermissionsDto
  ) {
    return this.adminService.updateAdminPermissions(user, id, dto);
  }

  @Patch("admin-users/:id/status")
  setManagedAdminStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateAdminStatusDto
  ) {
    return this.adminService.setManagedAdminStatus(user, id, dto.isActive);
  }

  @Patch("admin-users/:id/password")
  resetManagedAdminPassword(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: ResetAdminPasswordDto
  ) {
    return this.adminService.resetManagedAdminPassword(user, id, dto);
  }

  @Get("audit-logs")
  listAuditLogs(@CurrentUser() user: JwtPayload, @Query() query: AdminAuditLogsQueryDto) {
    return this.adminService.listAuditLogs(user, query);
  }
}
