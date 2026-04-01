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

    const items = await this.prisma.courseInterviewSession.findMany({
      where: {
        courseId,
        ...(currentUser.role === UserRole.INSTRUCTOR
          ? {}
          : {
              status: {
                in: [InterviewSessionStatus.SCHEDULED, InterviewSessionStatus.COMPLETED]
              }
            })
      },
      orderBy: {
        scheduledAt: "asc"
      }
    });

    return items.map((item) => ({
      ...item,
      scheduledAt: item.scheduledAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      course: {
        id: course.id,
        title: course.title
      },
      canManage: currentUser.role === UserRole.INSTRUCTOR
    }));
  }

  async getOne(currentUser: JwtPayload, interviewId: string) {
    const interview = await this.prisma.courseInterviewSession.findUnique({
      where: { id: interviewId },
      include: {
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

    return {
      ...interview,
      scheduledAt: interview.scheduledAt.toISOString(),
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
      canManage: currentUser.role === UserRole.INSTRUCTOR
    };
  }

  async create(currentUser: JwtPayload, courseId: string, dto: CreateCourseInterviewDto) {
    const course = await this.getCourseAccess(currentUser, courseId, true);

    const created = await this.prisma.courseInterviewSession.create({
      data: {
        courseId,
        provider: dto.provider,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        meetingUrl: dto.meetingUrl.trim(),
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

    const updated = await this.prisma.courseInterviewSession.update({
      where: { id: interview.id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.provider ? { provider: dto.provider } : {}),
        ...(dto.meetingUrl ? { meetingUrl: dto.meetingUrl.trim() } : {}),
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
      canManage: true
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
      canManage: true
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
        meetingUrl: true,
        title: true
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
}
