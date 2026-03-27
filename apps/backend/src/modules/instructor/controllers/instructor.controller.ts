import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { InstructorService } from "../services/instructor.service";

@Controller("instructor")
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTRUCTOR")
  @Get("stats")
  getStats(@CurrentUser() user: JwtPayload) {
    return this.instructorService.getStats(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTRUCTOR")
  @Get("profile")
  getPrivateProfile(@CurrentUser() user: JwtPayload) {
    return this.instructorService.getPrivateProfile(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("INSTRUCTOR")
  @Get("analytics")
  getAnalytics(@CurrentUser() user: JwtPayload) {
    return this.instructorService.getAnalytics(user);
  }

  @Get("public/:id")
  getPublicProfile(@Param("id") id: string) {
    return this.instructorService.getPublicProfile(id);
  }

  @Get("public/:id/reviews")
  getPublicReviews(@Param("id") id: string) {
    return this.instructorService.getPublicReviews(id);
  }
}
