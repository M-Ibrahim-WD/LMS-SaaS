import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateLessonDto } from "../dto/create-lesson.dto";
import { ReorderLessonsDto } from "../dto/reorder-lessons.dto";
import { UpdateLessonDto } from "../dto/update-lesson.dto";

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  private async assertSectionOwned(sectionId: string, user: JwtPayload) {
    const section = await this.prisma.section.findFirst({
      where: {
        id: sectionId,
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

    return section.id;
  }

  async create(user: JwtPayload, dto: CreateLessonDto) {
    const summary = await this.subscriptionsService.assertInstructorCanCreate(user);
    const permissions = summary.effectivePermissions!;
    const sectionId = await this.assertSectionOwned(dto.sectionId, user);
    const existingLessons = await this.prisma.lesson.count({
      where: { sectionId }
    });

    if (existingLessons >= permissions.maxLessonsPerSection) {
      throw new ForbiddenException(
        `Lesson limit reached. Your current entitlement allows ${permissions.maxLessonsPerSection} lessons per section.`
      );
    }

    const maxOrder = await this.prisma.lesson.aggregate({
      where: { sectionId },
      _max: { order: true }
    });

    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        sectionId,
        order: dto.order ?? (maxOrder._max.order ?? 0) + 1
      }
    });
  }

  async update(user: JwtPayload, id: string, dto: UpdateLessonDto) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        section: {
          course: {
            tenantId: user.tenantId ?? undefined,
            instructorId: user.sub
          }
        }
      },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: dto
    });
  }

  async remove(user: JwtPayload, id: string) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
        section: {
          course: {
            tenantId: user.tenantId ?? undefined,
            instructorId: user.sub
          }
        }
      },
      select: { id: true }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    await this.prisma.lesson.delete({
      where: { id: lesson.id }
    });

    return { deleted: true };
  }

  async reorder(user: JwtPayload, dto: ReorderLessonsDto) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const sectionId = await this.assertSectionOwned(dto.sectionId, user);
    const lessonIds = dto.items.map((item) => item.id);

    const lessonsCount = await this.prisma.lesson.count({
      where: { id: { in: lessonIds }, sectionId }
    });

    if (lessonsCount !== lessonIds.length) {
      throw new ForbiddenException("Invalid lesson set for this section");
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.lesson.update({
          where: { id: item.id },
          data: { order: item.order }
        })
      )
    );

    return this.prisma.lesson.findMany({
      where: { sectionId },
      orderBy: { order: "asc" }
    });
  }
}
