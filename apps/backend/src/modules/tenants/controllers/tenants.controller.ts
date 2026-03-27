import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantId } from "../../../shared/decorators/tenant-id.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { JoinTenantDto } from "../dto/join-tenant.dto";
import { TenantsService } from "../services/tenants.service";

@Controller("tenants")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService
  ) {}

  @Roles("ADMIN", "INSTRUCTOR")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create({ ...dto, ownerId: user.sub });
  }

  @Roles("STUDENT")
  @Post("join")
  async join(@CurrentUser() user: JwtPayload, @Body() dto: JoinTenantDto) {
    const updatedUser = await this.tenantsService.joinTenantForStudent(user.sub, dto);
    if (!updatedUser) {
      throw new BadRequestException("Updated user could not be loaded");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      tenantId: updatedUser.tenantId
    });

    return {
      accessToken,
      tokenType: "Bearer",
      user: updatedUser
    };
  }

  @Roles("INSTRUCTOR")
  @RequireTenant()
  @Get("invite-code")
  inviteCode(@TenantId() tenantId: string | null) {
    return this.tenantsService.getInviteCodeForTenant(tenantId);
  }

  @RequireTenant()
  @Get("me")
  me(@TenantId() tenantId: string | null) {
    return this.tenantsService.findMe(tenantId);
  }

  @Roles("ADMIN", "INSTRUCTOR")
  @RequireTenant()
  @Get(":id")
  findById(@Param("id") id: string, @TenantId() tenantId: string | null) {
    return this.tenantsService.findByIdScoped(id, tenantId);
  }
}
