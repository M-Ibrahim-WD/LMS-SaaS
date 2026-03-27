import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateSectionDto } from "../dto/create-section.dto";
import { ReorderSectionsDto } from "../dto/reorder-sections.dto";
import { UpdateSectionDto } from "../dto/update-section.dto";
import { SectionsService } from "../services/sections.service";

@Controller("sections")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@Roles("INSTRUCTOR")
@RequireTenant()
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSectionDto) {
    return this.sectionsService.create(user, dto);
  }

  @Patch("reorder")
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderSectionsDto) {
    return this.sectionsService.reorder(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateSectionDto) {
    return this.sectionsService.update(user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.sectionsService.remove(user, id);
  }
}

