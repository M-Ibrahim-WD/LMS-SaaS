import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateLessonDto } from "../dto/create-lesson.dto";
import { ReorderLessonsDto } from "../dto/reorder-lessons.dto";
import { UpdateLessonDto } from "../dto/update-lesson.dto";
import { LessonsService } from "../services/lessons.service";

@Controller("lessons")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@Roles("INSTRUCTOR")
@RequireTenant()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(user, dto);
  }

  @Patch("reorder")
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderLessonsDto) {
    return this.lessonsService.reorder(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(user, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.lessonsService.remove(user, id);
  }
}

