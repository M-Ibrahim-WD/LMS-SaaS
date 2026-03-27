import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateSectionDto } from "../dto/create-section.dto";
import { ReorderSectionsDto } from "../dto/reorder-sections.dto";
import { UpdateSectionDto } from "../dto/update-section.dto";

@Injectable()
export class SectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  private async assertCourseOwnedByInstructor(courseId: string, user: JwtPayload) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course.id;
  }

  async create(user: JwtPayload, dto: CreateSectionDto) {
    const summary = await this.subscriptionsService.assertInstructorCanCreate(user);
    const permissions = summary.effectivePermissions!;
    const courseId = await this.assertCourseOwnedByInstructor(dto.courseId, user);
    const existingSections = await this.prisma.section.count({
      where: { courseId }
    });

    if (existingSections >= permissions.maxSectionsPerCourse) {
      throw new ForbiddenException(
        `Section limit reached. Your current entitlement allows ${permissions.maxSectionsPerCourse} sections per course.`
      );
    }

    const maxOrder = await this.prisma.section.aggregate({
      where: { courseId },
      _max: { order: true }
    });

    return this.prisma.section.create({
      data: {
        title: dto.title,
        courseId,
        order: dto.order ?? (maxOrder._max.order ?? 0) + 1
      }
    });
  }

  async update(user: JwtPayload, id: string, dto: UpdateSectionDto) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const section = await this.prisma.section.findFirst({
      where: {
        id,
        course: {
          tenantId: user.tenantId ?? undefined,
          instructorId: user.sub
        }
      },
      select: { id: true }
    });

    if (!section) {
      throw new NotFoundException("Section not found");
    }

    return this.prisma.section.update({
      where: { id: section.id },
      data: dto
    });
  }

  async remove(user: JwtPayload, id: string) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const section = await this.prisma.section.findFirst({
      where: {
        id,
        course: {
          tenantId: user.tenantId ?? undefined,
          instructorId: user.sub
        }
      },
      select: { id: true }
    });

    if (!section) {
      throw new NotFoundException("Section not found");
    }

    await this.prisma.section.delete({ where: { id: section.id } });
    return { deleted: true };
  }

  async reorder(user: JwtPayload, dto: ReorderSectionsDto) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const courseId = await this.assertCourseOwnedByInstructor(dto.courseId, user);
    const sectionIds = dto.items.map((item) => item.id);

    const sectionsCount = await this.prisma.section.count({
      where: { id: { in: sectionIds }, courseId }
    });

    if (sectionsCount !== sectionIds.length) {
      throw new ForbiddenException("Invalid section set for this course");
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.section.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );

    return this.prisma.section.findMany({
      where: { courseId },
      orderBy: { order: "asc" }
    });
  }
}
