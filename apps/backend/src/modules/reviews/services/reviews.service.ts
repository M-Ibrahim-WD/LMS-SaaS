import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { UpsertCourseReviewDto } from "../dto/upsert-course-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCourseReview(user: JwtPayload, courseId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access their reviews");
    }

    return this.prisma.courseReview.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId: user.sub
        }
      }
    });
  }

  async upsertCourseReview(user: JwtPayload, courseId: string, dto: UpsertCourseReviewDto) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can submit reviews");
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        instructorId: true
      }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.sub,
          courseId
        }
      },
      select: {
        id: true
      }
    });

    if (!enrollment) {
      throw new ForbiddenException("Only enrolled students can leave reviews");
    }

    return this.prisma.courseReview.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: user.sub
        }
      },
      create: {
        courseId,
        studentId: user.sub,
        instructorId: course.instructorId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null
      },
      update: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null
      }
    });
  }
}
