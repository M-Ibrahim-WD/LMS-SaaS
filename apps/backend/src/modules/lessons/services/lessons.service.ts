import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, ProtectedContentEventType, UserRole } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
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
import { PdfPageRendererService } from "./pdf-page-renderer.service";

type MediaRequestContext = {
  headers?: {
    "user-agent"?: string | string[];
    "accept-language"?: string | string[];
    "sec-fetch-dest"?: string | string[];
    "sec-fetch-mode"?: string | string[];
    referer?: string | string[];
    referrer?: string | string[];
  };
};

type SignedMediaTokenPayload = {
  jti: string;
  userId: string;
  lessonId: string;
  fingerprint: string;
  issuedAt: number;
};

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly lessonMediaStorageService: LessonMediaStorageService,
    private readonly pdfPageRendererService: PdfPageRendererService
  ) {}

  private readonly mediaSessionLifetimeMs = 30 * 60 * 1000;
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

  private getMediaTokenSecret() {
    return process.env.MEDIA_TOKEN_SECRET?.trim() || process.env.JWT_SECRET?.trim() || "dev-only-change-me";
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  private base64UrlDecode(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
  }

  private stableHeaderValue(value?: string | string[]) {
    return Array.isArray(value) ? value.join(",") : value ?? "";
  }

  private mediaRequestFingerprint(request?: MediaRequestContext) {
    const userAgent = this.stableHeaderValue(request?.headers?.["user-agent"]);
    const language = this.stableHeaderValue(request?.headers?.["accept-language"]);
    return this.hashToken(`${userAgent}|${language}`);
  }

  private assertMediaRequestComesFromViewer(request?: MediaRequestContext) {
    const fetchDest = this.stableHeaderValue(request?.headers?.["sec-fetch-dest"]).toLowerCase();
    const fetchMode = this.stableHeaderValue(request?.headers?.["sec-fetch-mode"]).toLowerCase();
    const referrer = (
      this.stableHeaderValue(request?.headers?.referer) ||
      this.stableHeaderValue(request?.headers?.referrer)
    ).toLowerCase();
    const publicWebUrl = process.env.PUBLIC_WEB_URL?.trim().toLowerCase();
    const localFrontend =
      referrer.startsWith("http://localhost:3000/") ||
      referrer.startsWith("http://127.0.0.1:3000/") ||
      (publicWebUrl ? referrer.startsWith(`${publicWebUrl.replace(/\/$/, "")}/`) : false);

    const allowedDestinations = new Set(["video", "audio", "image", "empty", "iframe", "object", "embed"]);
    const looksLikeViewerRequest =
      (allowedDestinations.has(fetchDest) || !fetchDest) &&
      fetchDest !== "document" &&
      fetchMode !== "navigate" &&
      localFrontend;

    if (!looksLikeViewerRequest) {
      throw new ForbiddenException("Lesson media must be opened from the protected course viewer");
    }
  }

  private signMediaToken(payload: SignedMediaTokenPayload) {
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signature = createHmac("sha256", this.getMediaTokenSecret()).update(encodedPayload).digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  private parseMediaToken(rawToken: string) {
    const [encodedPayload, signature] = rawToken.split(".");
    if (!encodedPayload || !signature) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    const expectedSignature = createHmac("sha256", this.getMediaTokenSecret()).update(encodedPayload).digest("base64url");
    const received = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    try {
      return JSON.parse(this.base64UrlDecode(encodedPayload)) as SignedMediaTokenPayload;
    } catch {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }
  }

  private buildWatermarkText(user: { fullName?: string | null; email?: string | null }) {
    return (user.fullName?.trim() || user.email?.trim() || "ATHAR learner").slice(0, 80);
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
      const canReviewCourses = user.isSuperAdmin || user.adminPermissions?.includes("REVIEW_COURSES");
      if (!canReviewCourses) {
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
    void input;
    // Protected-content events are still stored quietly for future auditing,
    // but we intentionally suppress admin/instructor alert spam for normal learners.
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

  async createMediaSession(user: JwtPayload, lessonId: string, dto?: CreateMediaSessionDto, request?: MediaRequestContext) {
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

    const fingerprint = this.mediaRequestFingerprint(request);
    const rawToken = this.signMediaToken({
      jti: randomUUID(),
      userId: user.sub,
      lessonId: lesson.id,
      fingerprint,
      issuedAt: Date.now()
    });
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

    const isPdf = lesson.mediaContentType === "application/pdf";
    const baseUrl = isPdf
      ? this.lessonMediaStorageService.getPublicLessonPdfPagesUrl(lesson.id, lesson.mediaAsset)
      : this.lessonMediaStorageService.getPublicLessonMediaUrl(lesson.id, lesson.mediaAsset);
    if (!baseUrl) {
      throw new NotFoundException("Lesson media not found");
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        fullName: true,
        email: true
      }
    });

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
      watermarkText: this.buildWatermarkText(actor ?? { email: user.email }),
      policy: {
        disableDownload: true,
        disablePictureInPicture: true,
        blockContextMenu: true,
        watermark: true,
        trackVisibility: true
      }
    };
  }

  async renewMediaSession(
    user: JwtPayload,
    lessonId: string,
    sessionId: string,
    dto?: CreateMediaSessionDto,
    request?: MediaRequestContext
  ) {
    const { lesson } = await this.resolveAccessibleLesson(lessonId, user);
    if (!lesson.mediaAsset) {
      throw new NotFoundException("Lesson media not found");
    }

    const rawToken = dto?.token?.trim();
    if (!rawToken) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    const tokenPayload = this.parseMediaToken(rawToken);
    if (
      tokenPayload.userId !== user.sub ||
      tokenPayload.lessonId !== lesson.id ||
      tokenPayload.fingerprint !== this.mediaRequestFingerprint(request)
    ) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + this.mediaSessionLifetimeMs);
    const mediaSession = await this.prisma.mediaSession.findFirst({
      where: {
        id: sessionId,
        tokenHash,
        userId: user.sub,
        lessonId: lesson.id
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!mediaSession) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    await this.prisma.mediaSession.update({
      where: { id: mediaSession.id },
      data: {
        expiresAt,
        lastAccessedAt: new Date()
      }
    });

    const isPdf = lesson.mediaContentType === "application/pdf";
    const baseUrl = isPdf
      ? this.lessonMediaStorageService.getPublicLessonPdfPagesUrl(lesson.id, lesson.mediaAsset)
      : this.lessonMediaStorageService.getPublicLessonMediaUrl(lesson.id, lesson.mediaAsset);
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
      watermarkText: this.buildWatermarkText(mediaSession.user),
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

  async readProtectedMedia(lessonId: string, rawToken: string, sessionId?: string, request?: MediaRequestContext) {
    this.assertMediaRequestComesFromViewer(request);

    const tokenPayload = this.parseMediaToken(rawToken);
    if (tokenPayload.lessonId !== lessonId || tokenPayload.fingerprint !== this.mediaRequestFingerprint(request)) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

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
            role: true,
            tenantId: true,
            isSuperAdmin: true,
            adminPermissions: true
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
                    tenantId: true,
                    instructorId: true
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

    if (tokenPayload.userId !== mediaSession.userId) {
      throw new ForbiddenException("Lesson media session is invalid or expired");
    }

    const course = mediaSession.lesson.section.course;
    if (mediaSession.user.role === UserRole.STUDENT) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId: mediaSession.userId,
          courseId: mediaSession.courseId
        },
        select: { id: true }
      });

      if (!enrollment) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else if (mediaSession.user.role === UserRole.INSTRUCTOR) {
      if (course.instructorId !== mediaSession.userId || course.tenantId !== mediaSession.user.tenantId) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else if (mediaSession.user.role === UserRole.ADMIN) {
      const canReviewCourses =
        mediaSession.user.isSuperAdmin || mediaSession.user.adminPermissions.includes("REVIEW_COURSES");
      if (!canReviewCourses) {
        throw new ForbiddenException("You do not have access to this lesson");
      }
    } else {
      throw new ForbiddenException("Unsupported role for protected media");
    }

    if (!mediaSession.lesson.mediaAsset) {
      throw new NotFoundException("Lesson media not found");
    }

    await this.prisma.mediaSession.update({
      where: { id: mediaSession.id },
      data: { lastAccessedAt: new Date() }
    });

    const file = await this.lessonMediaStorageService.readMediaRef(mediaSession.lesson.mediaAsset);

    return {
      ...file,
      fileName: mediaSession.lesson.mediaFileName || file.fileName,
      contentType: mediaSession.lesson.mediaContentType || file.contentType,
      watermarkText: this.buildWatermarkText(mediaSession.user)
    };
  }

  async getProtectedPdfPageMetadata(lessonId: string, rawToken: string, sessionId: string | undefined, request?: MediaRequestContext) {
    const file = await this.readProtectedMedia(lessonId, rawToken, sessionId, request);
    if (file.contentType !== "application/pdf") {
      throw new NotFoundException("Protected PDF not found");
    }

    const pageCount = await this.pdfPageRendererService.getPageCount(
      `${lessonId}:${file.fileName}:${file.buffer.length}`,
      file.buffer
    );

    return {
      pageCount,
      watermarkText: file.watermarkText,
      contentType: "application/pdf"
    };
  }

  async renderProtectedPdfPage(
    lessonId: string,
    pageNumber: number,
    rawToken: string,
    sessionId: string | undefined,
    request?: MediaRequestContext
  ) {
    const file = await this.readProtectedMedia(lessonId, rawToken, sessionId, request);
    if (file.contentType !== "application/pdf") {
      throw new NotFoundException("Protected PDF not found");
    }

    const image = await this.pdfPageRendererService.renderWatermarkedPage({
      cacheKey: `${lessonId}:${file.fileName}:${file.buffer.length}`,
      pdfBuffer: file.buffer,
      pageNumber,
      watermarkText: file.watermarkText
    });

    return {
      image,
      fileName: `${file.fileName.replace(/\.pdf$/i, "")}-page-${pageNumber}.png`,
      contentType: "image/png"
    };
  }
}
