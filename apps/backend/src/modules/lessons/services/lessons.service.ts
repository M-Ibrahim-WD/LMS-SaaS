import { createHash, randomUUID } from "crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { NotificationType, Prisma, ProtectedContentEventType, UserRole } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateLessonDto } from "../dto/create-lesson.dto";
import { CreateMediaSessionDto } from "../dto/create-media-session.dto";
import { LogProtectedContentEventDto } from "../dto/log-protected-content-event.dto";
import { ReorderLessonsDto } from "../dto/reorder-lessons.dto";
import { UpdateLessonDto } from "../dto/update-lesson.dto";
import {
  LessonMediaStorageService,
  type UploadedLessonMediaFile
} from "./lesson-media-storage.service";

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly lessonMediaStorageService: LessonMediaStorageService,
    private readonly notificationsService: NotificationsService
  ) {}

  private readonly mediaSessionLifetimeMs = 12 * 60 * 60 * 1000;
  private readonly suspiciousSessionWindowMs = 10 * 60 * 1000;
  private readonly suspiciousSessionThreshold = 3;

  private toJsonValue(value?: Record<string, unknown> | null) {
    return (value ?? {}) as Prisma.InputJsonValue;
  }

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

  private hashToken(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private async resolveAccessibleLesson(lessonId: string, user: JwtPayload) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        type: true,
        mediaAsset: true,
        mediaFileName: true,
        mediaContentType: true,
        section: {
          select: {
            course: {
              select: {
                id: true,
                title: true,
                tenantId: true,
                instructorId: true,
                instructor: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    const course = lesson.section.course;

    if (user.role === UserRole.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: user.sub,
          courseId: course.id
        },
        select: { id: true }
      });

      if (!enrollment) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else if (user.role === UserRole.INSTRUCTOR) {
      if (course.instructorId !== user.sub || course.tenantId !== user.tenantId) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else if (user.role === UserRole.ADMIN) {
      if (!user.isSuperAdmin && course.tenantId !== user.tenantId) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else {
      throw new ForbiddenException("Unsupported role for protected media");
    }

    return {
      lesson,
      course
    };
  }

  private async notifyProtectedContentEvent(input: {
    tenantId: string;
    courseId: string;
    lessonId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    lessonTitle: string;
    eventType: ProtectedContentEventType;
    metadata?: Record<string, unknown> | null;
  }) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: UserRole.ADMIN,
        isActive: true,
        OR: [
          { isSuperAdmin: true },
          { tenantId: input.tenantId }
        ]
      },
      select: {
        id: true,
        tenantId: true
      }
    });

    const instructor = await this.prisma.course.findUnique({
      where: { id: input.courseId },
      select: {
        instructor: {
          select: {
            id: true,
            tenantId: true
          }
        }
      }
    });

    const recipients = new Map<string, string | null>();
    if (instructor?.instructor) {
      recipients.set(instructor.instructor.id, instructor.instructor.tenantId ?? input.tenantId);
    }
    for (const admin of admins) {
      recipients.set(admin.id, admin.tenantId ?? input.tenantId);
    }

    await Promise.all(
      [...recipients.entries()].map(([userId, tenantId]) =>
        this.notificationsService.create({
          userId,
          tenantId,
          type: NotificationType.CONTENT_SECURITY_ALERT,
          title: "Protected content activity detected",
          message: `${input.studentName} (${input.studentEmail}) triggered ${input.eventType.toLowerCase()} in ${input.courseTitle} / ${input.lessonTitle}.`,
          payload: {
            courseId: input.courseId,
            lessonId: input.lessonId,
            studentId: input.studentId,
            studentName: input.studentName,
            studentEmail: input.studentEmail,
            courseTitle: input.courseTitle,
            lessonTitle: input.lessonTitle,
            eventType: input.eventType,
            metadata: input.metadata ?? {}
          } as Prisma.InputJsonValue
        })
      )
    );
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
        content: dto.content ?? dto.description ?? "",
        description: dto.description?.trim() || dto.content?.trim() || null,
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
      data: {
        ...dto,
        content: dto.content ?? dto.description ?? undefined,
        description: dto.description ?? dto.content ?? undefined
      }
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

  async uploadMedia(user: JwtPayload, lessonId: string, file: UploadedLessonMediaFile) {
    await this.subscriptionsService.assertInstructorCanCreate(user);
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: {
          course: {
            tenantId: user.tenantId ?? undefined,
            instructorId: user.sub
          }
        }
      },
      select: {
        id: true
      }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    const storedRef = await this.lessonMediaStorageService.storeMedia(file);

    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        mediaAsset: storedRef,
        mediaFileName: file.originalname,
        mediaContentType: file.mimetype,
        type: file.mimetype.startsWith("video/") ? "VIDEO" : "FILE"
      }
    });
  }

  async createMediaSession(user: JwtPayload, lessonId: string, dto?: CreateMediaSessionDto) {
    const { lesson, course } = await this.resolveAccessibleLesson(lessonId, user);

    if (!lesson.mediaAsset) {
      throw new NotFoundException("Lesson media not found");
    }

    const recentSessionCount = await this.prisma.mediaSession.count({
      where: {
        lessonId,
        userId: user.sub,
        createdAt: {
          gte: new Date(Date.now() - this.suspiciousSessionWindowMs)
        }
      }
    });

    if (recentSessionCount >= this.suspiciousSessionThreshold) {
      await this.logProtectedContentEvent(
        user,
        lessonId,
        {
          eventType: "SUSPICIOUS_SESSION_REGENERATION",
          metadata: {
            recentSessionCount: recentSessionCount + 1,
            deviceLabel: dto?.deviceLabel ?? null
          }
        },
        true
      );
    }

    const rawToken = randomUUID();
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.mediaSessionLifetimeMs);

    const mediaSession = await this.prisma.mediaSession.create({
      data: {
        tenantId: course.tenantId,
        userId: user.sub,
        courseId: course.id,
        lessonId: lesson.id,
        tokenHash,
        expiresAt
      }
    });

    await this.logProtectedContentEvent(
      user,
      lessonId,
      {
        eventType: "MEDIA_SESSION_STARTED",
        mediaSessionId: mediaSession.id,
        metadata: {
          deviceLabel: dto?.deviceLabel ?? null
        }
      },
      false
    );

    const baseUrl = this.lessonMediaStorageService.getPublicLessonMediaUrl(lesson.id, lesson.mediaAsset);
    if (!baseUrl) {
      throw new NotFoundException("Lesson media not found");
    }

    const viewerUrl = `${baseUrl}?token=${rawToken}&session=${mediaSession.id}&inline=1&filename=${encodeURIComponent(
      lesson.mediaFileName ?? lesson.title
    )}`;

    return {
      sessionId: mediaSession.id,
      expiresAt: expiresAt.toISOString(),
      mediaKind: lesson.type,
      mediaContentType: lesson.mediaContentType || null,
      mediaFileName: lesson.mediaFileName || null,
      viewerUrl,
      policy: {
        disableDownload: true,
        disablePictureInPicture: true,
        blockContextMenu: true,
        watermark: true,
        trackVisibility: true
      }
    };
  }

  async logProtectedContentEvent(
    user: JwtPayload,
    lessonId: string,
    dto:
      | LogProtectedContentEventDto
      | {
          eventType: ProtectedContentEventType;
          mediaSessionId?: string;
          metadata?: Record<string, unknown> | null;
        },
    notify = false
  ) {
    const { lesson, course } = await this.resolveAccessibleLesson(lessonId, user);

    const event = await this.prisma.protectedContentEvent.create({
      data: {
        tenantId: course.tenantId,
        userId: user.sub,
        courseId: course.id,
        lessonId: lesson.id,
        mediaSessionId: dto.mediaSessionId ?? null,
        eventType: dto.eventType as ProtectedContentEventType,
        eventMetadata: this.toJsonValue((dto.metadata as Record<string, unknown> | null | undefined) ?? null)
      }
    });

    if (notify && user.role === UserRole.STUDENT) {
      const actor = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: {
          fullName: true,
          email: true
        }
      });

      await this.notifyProtectedContentEvent({
        tenantId: course.tenantId,
        courseId: course.id,
        lessonId: lesson.id,
        studentId: user.sub,
        studentName: actor?.fullName ?? user.email,
        studentEmail: actor?.email ?? user.email,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        eventType: dto.eventType as ProtectedContentEventType,
        metadata: (dto.metadata as Record<string, unknown> | null | undefined) ?? null
      });
    }

    return event;
  }

  async readProtectedMedia(lessonId: string, rawToken: string, sessionId?: string) {
    const tokenHash = this.hashToken(rawToken);
    const mediaSession = await this.prisma.mediaSession.findFirst({
      where: {
        tokenHash,
        lessonId,
        ...(sessionId ? { id: sessionId } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true,
            mediaAsset: true,
            mediaFileName: true,
            mediaContentType: true,
            section: {
              select: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    tenantId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!mediaSession || mediaSession.expiresAt.getTime() < Date.now()) {
      if (mediaSession?.user?.role === UserRole.STUDENT) {
        await this.notifyProtectedContentEvent({
          tenantId: mediaSession.lesson.section.course.tenantId,
          courseId: mediaSession.lesson.section.course.id,
          lessonId,
          studentId: mediaSession.user.id,
          studentName: mediaSession.user.fullName,
          studentEmail: mediaSession.user.email,
          courseTitle: mediaSession.lesson.section.course.title,
          lessonTitle: mediaSession.lesson.title,
          eventType: ProtectedContentEventType.INVALID_MEDIA_TOKEN,
          metadata: {
            reason: mediaSession ? "expired" : "not_found"
          }
        });
      }

      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    if (!mediaSession.lesson.mediaAsset) {
      throw new NotFoundException("Lesson media not found");
    }

    await this.prisma.mediaSession.update({
      where: { id: mediaSession.id },
      data: { lastAccessedAt: new Date() }
    });

    const file = await this.lessonMediaStorageService.readLocalMediaRef(mediaSession.lesson.mediaAsset);

    return {
      ...file,
      fileName: mediaSession.lesson.mediaFileName || file.fileName,
      contentType: mediaSession.lesson.mediaContentType || file.contentType
    };
  }
}
