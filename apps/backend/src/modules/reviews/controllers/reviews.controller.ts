import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { UpsertCourseReviewDto } from "../dto/upsert-course-review.dto";
import { ReviewsService } from "../services/reviews.service";

@Controller("reviews")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Roles("STUDENT")
  @Get("courses/:courseId/mine")
  getMyCourseReview(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.reviewsService.getMyCourseReview(user, courseId);
  }

  @Roles("STUDENT")
  @Post("courses/:courseId")
  upsertCourseReview(
    @CurrentUser() user: JwtPayload,
    @Param("courseId") courseId: string,
    @Body() dto: UpsertCourseReviewDto
  ) {
    return this.reviewsService.upsertCourseReview(user, courseId, dto);
  }
}
