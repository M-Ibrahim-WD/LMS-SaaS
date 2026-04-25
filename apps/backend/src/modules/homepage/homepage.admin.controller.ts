import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../shared/guards/roles.guard";
import type { JwtPayload } from "../../shared/types/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { HomepageService } from "./homepage.service";

@Controller("admin/homepage")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class HomepageAdminController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  getDraftHomepage(@CurrentUser() user: JwtPayload) {
    return this.homepageService.getDraftHomepage(user);
  }

  @Put("draft")
  saveDraftHomepage(
    @CurrentUser() user: JwtPayload,
    @Body() body: { rows: Prisma.JsonValue[]; updatedAt?: string }
  ) {
    return this.homepageService.saveDraftHomepage(user, body);
  }

  @Post("publish")
  publishDraftHomepage(@CurrentUser() user: JwtPayload) {
    return this.homepageService.publishDraftHomepage(user);
  }

  @Get("catalog")
  getInstructorCatalog(@CurrentUser() user: JwtPayload) {
    return this.homepageService.getInstructorCatalog(user);
  }
}
