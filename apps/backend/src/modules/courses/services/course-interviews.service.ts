import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  InterviewSessionStatus,
  NotificationType,
  UserRole
} from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { CreateCourseInterviewDto } from "../dto/create-course-interview.dto";
import { UpdateCourseInterviewDto } from "../dto/update-course-interview.dto";
import { UpdateCourseInterviewStatusDto } from "../dto/update-course-interview-status.dto";

@Injectable()
export class CourseInterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async listForCourse(currentUser: JwtPayload, courseId: string) {
    const course = await this.getCourseAccess(currentUser, courseId);
    const now = new Date();

    const items = await this.prisma.courseInterviewSession.findMany({
      where: {
        courseId,
        status: InterviewSessionStatus.SCHEDULED
      },
      orderBy: {
        scheduledAt: "asc"
      }
    });

    return items
      .filter((item) => this.getInterviewEndAt(item).getTime() > now.getTime())
      .map((item) => ({
        ...item,
        scheduledAt: item.scheduledAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        course: {
          id: course.id,
          title: course.title
        },
        canManage: currentUser.role === UserRole.INSTRUCTOR,
        isJoinReady: this.isJoinReady(item.scheduledAt, item.durationMinutes)
      }));
  }

  async listForInstructorDashboard(currentUser: JwtPayload) {
    if (currentUser.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException("Instructor access is required.");
    }

    const now = new Date();
    const items = await this.prisma.courseInterviewSession.findMany({
      where: {
        createdByInstructorId: currentUser.sub
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      include: {
        course: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return items
      .filter((item) =>
        item.status === InterviewSessionStatus.DRAFT ||
        this.getInterviewEndAt(item).getTime() > now.getTime()
      )
      .map((item) => ({
        ...item,
        scheduledAt: item.scheduledAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        canManage: true,
        canEdit: this.canEditInterview(item.scheduledAt),
        isJoinReady: this.isJoinReady(item.scheduledAt, item.durationMinutes)
      }));
  }

  async getOne(currentUser: JwtPayload, interviewId: string) {
    const interview = await this.prisma.courseInterviewSession.findUnique({
      where: { id: interviewId },
      include: {
        attendances: {
          select: {
            studentId: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            instructorId: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundException("Interview session not found.");
    }

    await this.getCourseAccess(currentUser, interview.courseId);

    if (
      currentUser.role === UserRole.STUDENT &&
      interview.status === InterviewSessionStatus.DRAFT
    ) {
      throw new ForbiddenException("Draft interview sessions are not visible yet.");
    }

    const [instructorCreatedCount, studentAttendedCount] = await Promise.all([
      this.prisma.courseInterviewSession.count({
        where: {
          createdByInstructorId: interview.createdByInstructorId,
          status: {
            in: [InterviewSessionStatus.SCHEDULED, InterviewSessionStatus.COMPLETED]
          }
        }
      }),
      currentUser.role === UserRole.STUDENT
        ? this.prisma.courseInterviewAttendance.count({
          where: {
              studentId: currentUser.sub
            }
          })
        : Promise.resolve(0)
    ]);

    return {
      ...interview,
      scheduledAt: interview.scheduledAt.toISOString(),
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
      canManage: currentUser.role === UserRole.INSTRUCTOR,
      canEdit:
        currentUser.role === UserRole.INSTRUCTOR
          ? this.canEditInterview(interview.scheduledAt)
          : false,
      isJoinReady: this.isJoinReady(interview.scheduledAt, interview.durationMinutes),
      attendanceCount: interview.attendances.length,
      studentAttendedCount,
      instructorCreatedCount
    };
  }

  async recordAttendance(currentUser: JwtPayload, interviewId: string) {
    const interview = await this.prisma.courseInterviewSession.findUnique({
      where: { id: interviewId },
      include: {
        course: {
          select: {
            id: true
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundException("Interview session not found.");
    }

    await this.getCourseAccess(currentUser, interview.courseId);

    if (interview.status !== InterviewSessionStatus.SCHEDULED) {
      throw new BadRequestException("Only scheduled interviews can be joined.");
    }

    if (!this.isJoinReady(interview.scheduledAt, interview.durationMinutes)) {
      throw new BadRequestException(
        "This interview will be available only at its scheduled time."
      );
    }

    if (currentUser.role === UserRole.STUDENT) {
      await this.prisma.courseInterviewAttendance.upsert({
        where: {
          interviewId_studentId: {
            interviewId,
            studentId: currentUser.sub
          }
        },
        update: {},
        create: {
          interviewId,
          studentId: currentUser.sub
        }
      });
    }

    const [attendanceCount, studentAttendedCount, instructorCreatedCount] = await Promise.all([
      this.prisma.courseInterviewAttendance.count({
        where: {
          interviewId
        }
      }),
      currentUser.role === UserRole.STUDENT
        ? this.prisma.courseInterviewAttendance.count({
            where: {
              studentId: currentUser.sub
            }
          })
        : Promise.resolve(0),
      this.prisma.courseInterviewSession.count({
        where: {
          createdByInstructorId: interview.createdByInstructorId,
          status: {
            in: [InterviewSessionStatus.SCHEDULED, InterviewSessionStatus.COMPLETED]
          }
        }
      })
    ]);

    return {
      attendanceCount,
      studentAttendedCount,
      instructorCreatedCount
    };
  }

  async create(currentUser: JwtPayload, courseId: string, dto: CreateCourseInterviewDto) {
    const course = await this.getCourseAccess(currentUser, courseId, true);
    const meetingUrl = this.validateMeetingUrl(dto.provider, dto.meetingUrl);

    const created = await this.prisma.courseInterviewSession.create({
      data: {
        courseId,
        provider: dto.provider,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        meetingUrl,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? null,
        status: InterviewSessionStatus.DRAFT,
        createdByInstructorId: currentUser.sub
      }
    });

    return {
      ...created,
      scheduledAt: created.scheduledAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      course: {
        id: course.id,
        title: course.title
      },
      canManage: true
    };
  }

  async update(currentUser: JwtPayload, interviewId: string, dto: UpdateCourseInterviewDto) {
    const interview = await this.getInterviewForInstructor(currentUser, interviewId);
    if (!this.canEditInterview(interview.scheduledAt)) {
      throw new ForbiddenException(
        "Interview editing locks 30 minutes before the scheduled time."
      );
    }

    const updated = await this.prisma.courseInterviewSession.update({
      where: { id: interview.id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.provider ? { provider: dto.provider } : {}),
        ...((dto.meetingUrl || dto.provider)
          ? {
              meetingUrl: this.validateMeetingUrl(
                dto.provider ?? interview.provider,
                dto.meetingUrl ?? interview.meetingUrl
              )
            }
          : {}),
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes ?? null } : {})
      }
    });

    if (updated.status !== InterviewSessionStatus.DRAFT) {
      await this.notifyCourseLearners(
        interview.courseId,
        updated.title,
        NotificationType.INTERVIEW_UPDATED,
        "Interview updated",
        `${updated.title} was updated for ${updated.scheduledAt.toLocaleString()}.`
      );
    }

    return {
      ...updated,
      scheduledAt: updated.scheduledAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      canManage: true,
      canEdit: this.canEditInterview(updated.scheduledAt),
      isJoinReady: this.isJoinReady(updated.scheduledAt, updated.durationMinutes)
    };
  }

  async updateStatus(
    currentUser: JwtPayload,
    interviewId: string,
    dto: UpdateCourseInterviewStatusDto
  ) {
    const interview = await this.getInterviewForInstructor(currentUser, interviewId);
    if (
      dto.status === InterviewSessionStatus.SCHEDULED &&
      !interview.meetingUrl.trim()
    ) {
      throw new BadRequestException("Interview link is required before scheduling.");
    }

    if (dto.status === InterviewSessionStatus.SCHEDULED) {
      this.validateMeetingUrl(interview.provider, interview.meetingUrl);
    }

    const updated = await this.prisma.courseInterviewSession.update({
      where: { id: interview.id },
      data: {
        status: dto.status
      }
    });

    if (dto.status === InterviewSessionStatus.SCHEDULED) {
      await this.notifyCourseLearners(
        interview.courseId,
        updated.title,
        NotificationType.INTERVIEW_SCHEDULED,
        "New interview session",
        `${updated.title} is scheduled for ${updated.scheduledAt.toLocaleString()}.`
      );
    } else if (dto.status === InterviewSessionStatus.COMPLETED) {
      await this.notifyCourseLearners(
        interview.courseId,
        updated.title,
        NotificationType.INTERVIEW_COMPLETED,
        "Interview session completed",
        `${updated.title} has been marked as completed.`
      );
    }

    return {
      ...updated,
      scheduledAt: updated.scheduledAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      canManage: true,
      canEdit: this.canEditInterview(updated.scheduledAt),
      isJoinReady: this.isJoinReady(updated.scheduledAt, updated.durationMinutes)
    };
  }

  async remove(currentUser: JwtPayload, interviewId: string) {
    const interview = await this.getInterviewForInstructor(currentUser, interviewId);

    await this.prisma.courseInterviewSession.delete({
      where: { id: interview.id }
    });

    return { deleted: true };
  }

  private async getCourseAccess(
    currentUser: JwtPayload,
    courseId: string,
    requireInstructor = false
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        instructorId: true,
        tenantId: true
      }
    });

    if (!course) {
      throw new NotFoundException("Course not found.");
    }

    if (currentUser.role === UserRole.INSTRUCTOR) {
      if (course.instructorId !== currentUser.sub) {
        throw new ForbiddenException("This course is not part of your workspace.");
      }
      return course;
    }

    if (currentUser.role === UserRole.ADMIN) {
      const canReviewCourses =
        currentUser.isSuperAdmin || currentUser.adminPermissions?.includes("REVIEW_COURSES");
      if (!canReviewCourses) {
        throw new ForbiddenException("You do not have permission to review course interviews.");
      }
      return course;
    }

    if (requireInstructor) {
      throw new ForbiddenException("Instructor access is required.");
    }

    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException("Unsupported role for course interviews.");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        courseId,
        userId: currentUser.sub
      },
      select: {
        id: true
      }
    });

    if (!enrollment) {
      throw new ForbiddenException("Enroll in this course before opening interview sessions.");
    }

    return course;
  }

  private async getInterviewForInstructor(currentUser: JwtPayload, interviewId: string) {
    const interview = await this.prisma.courseInterviewSession.findUnique({
      where: { id: interviewId },
      select: {
        id: true,
        courseId: true,
        createdByInstructorId: true,
        provider: true,
        meetingUrl: true,
        title: true,
        scheduledAt: true
      }
    });

    if (!interview) {
      throw new NotFoundException("Interview session not found.");
    }

    if (currentUser.role !== UserRole.INSTRUCTOR || interview.createdByInstructorId !== currentUser.sub) {
      throw new ForbiddenException("Only the course instructor can manage this interview.");
    }

    return interview;
  }

  private async notifyCourseLearners(
    courseId: string,
    interviewTitle: string,
    type: NotificationType,
    title: string,
    message: string
  ) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      select: {
        userId: true,
        tenantId: true
      }
    });

    await Promise.all(
      enrollments.map((enrollment) =>
        this.notificationsService.create({
          userId: enrollment.userId,
          tenantId: enrollment.tenantId,
          type,
          title,
          message,
          payload: {
            courseId,
            interviewTitle
          }
        })
      )
    );
  }

  private canEditInterview(scheduledAt: Date) {
    const cutoff = scheduledAt.getTime() - 30 * 60 * 1000;
    return Date.now() < cutoff;
  }

  private isJoinReady(scheduledAt: Date, durationMinutes: number | null = null) {
    const now = Date.now();
    const joinWindowStartsAt = scheduledAt.getTime() - 5 * 60 * 1000;
    return (
      joinWindowStartsAt <= now &&
      this.getInterviewEndAt({ scheduledAt, durationMinutes }).getTime() >= now
    );
  }

  private validateMeetingUrl(provider: "ZOOM" | "GOOGLE_MEET", rawUrl: string) {
    const meetingUrl = rawUrl.trim();

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(meetingUrl);
    } catch {
      throw new BadRequestException("Interview link must be a valid URL.");
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    if (provider === "GOOGLE_MEET") {
      const isMeetHost =
        hostname === "meet.google.com" ||
        (hostname === "g.co" && pathname.startsWith("/meet"));
      const hasMeetCode =
        /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(pathname) ||
        pathname.startsWith("/meet");

      if (!isMeetHost || !hasMeetCode) {
        throw new BadRequestException(
          "Google Meet links must use a valid meet.google.com room link or g.co/meet link."
        );
      }
    }

    if (provider === "ZOOM") {
      const isZoomHost =
        hostname === "zoom.us" ||
        hostname.endsWith(".zoom.us") ||
        hostname === "zoomgov.com" ||
        hostname.endsWith(".zoomgov.com");
      const hasZoomPath =
        pathname.startsWith("/j/") ||
        pathname.startsWith("/wc/") ||
        pathname.startsWith("/my/");

      if (!isZoomHost || !hasZoomPath) {
        throw new BadRequestException(
          "Zoom links must use a valid zoom.us or zoomgov.com meeting link."
        );
      }
    }

    return meetingUrl;
  }

  private getInterviewEndAt(interview: {
    scheduledAt: Date;
    durationMinutes: number | null;
  }) {
    const durationMinutes = interview.durationMinutes ?? 60;
    return new Date(interview.scheduledAt.getTime() + durationMinutes * 60 * 1000);
  }
}
