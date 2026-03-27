import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantId } from "../../../shared/decorators/tenant-id.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { UsersService } from "../services/users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  @Roles("ADMIN")
  @RequireTenant()
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create({ ...dto, tenantId: user.tenantId });
  }

  @RequireTenant()
  @Get("profile")
  getProfile(@CurrentUser() user: JwtPayload, @TenantId() tenantId: string | null) {
    return this.usersService.getProfile(user.sub, tenantId);
  }

  @RequireTenant()
  @Patch("profile")
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string | null,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user.sub, tenantId, dto);
  }

  @Patch("profile-image")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: {
        fileSize: 3 * 1024 * 1024
      }
    })
  )
  async uploadProfileImage(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string | null,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined
  ) {
    if (!file) {
      throw new BadRequestException("Profile image file is required");
    }

    if (user.role === "INSTRUCTOR") {
      await this.subscriptionsService.assertPermission(user, "canUploadProfileImage");
    }

    return this.usersService.uploadProfileImage(user.sub, tenantId, file);
  }

  @Get("profile-summary")
  getProfileSummary(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfileSummary(user.sub);
  }

  @Roles("ADMIN")
  @RequireTenant()
  @Get(":id")
  findById(@Param("id") id: string, @TenantId() tenantId: string | null) {
    return this.usersService.findById(id, tenantId);
  }
}
