import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";

@Injectable()
export class StudentInstructorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async createRelationFromInviteCode(studentId: string, inviteCode: string) {
    const normalizedInviteCode = inviteCode.trim().toUpperCase();
    if (!normalizedInviteCode) {
      throw new BadRequestException("inviteCode is required");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { inviteCode: normalizedInviteCode },
      select: {
        id: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!tenant?.ownerId || !tenant.owner) {
      throw new NotFoundException("Invalid invite code");
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        role: true,
        tenantId: true
      }
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    if (student.role !== "STUDENT") {
      throw new ForbiddenException("Only students can join instructors");
    }

    const existing = await this.prisma.studentInstructor.findUnique({
      where: {
        studentId_instructorId: {
          studentId,
          instructorId: tenant.ownerId
        }
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException("Already joined this instructor");
    }

    await this.subscriptionsService.assertTenantCanAddStudent(tenant.id);

    await this.prisma.studentInstructor.create({
      data: {
        studentId,
        instructorId: tenant.ownerId
      }
    });

    if (!student.tenantId) {
      await this.prisma.user.update({
        where: { id: studentId },
        data: {
          tenantId: tenant.id
        }
      });
    }

    await this.notificationsService.create({
      userId: studentId,
      tenantId: tenant.id,
      type: "INSTRUCTOR_JOINED",
      title: "Instructor joined",
      message: `You joined ${tenant.owner.fullName}'s workspace.`,
      payload: { instructorId: tenant.owner.id, tenantId: tenant.id }
    });

    return {
      instructor: tenant.owner,
      tenant: {
        id: tenant.id
      }
    };
  }

  getStudentInstructors(studentId: string) {
    return this.prisma.studentInstructor.findMany({
      where: {
        studentId
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        createdAt: true,
        instructor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            tenant: {
              select: {
                id: true,
                name: true,
                inviteCode: true
              }
            }
          }
        }
      }
    });
  }

  async getInstructorIdsForStudent(studentId: string) {
    const relations = await this.prisma.studentInstructor.findMany({
      where: {
        studentId
      },
      select: {
        instructorId: true
      }
    });

    return relations.map((relation) => relation.instructorId);
  }

  async studentFollowsInstructor(studentId: string, instructorId: string) {
    const relation = await this.prisma.studentInstructor.findUnique({
      where: {
        studentId_instructorId: {
          studentId,
          instructorId
        }
      },
      select: { id: true }
    });

    return Boolean(relation);
  }
}
