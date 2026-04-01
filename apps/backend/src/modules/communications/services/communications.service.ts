
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AdminPermission,
  ConversationGroupScope,
  ConversationKind,
  ConversationStatus,
  NotificationType,
  UserRole
} from "@prisma/client";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AdminAccessService } from "../../admin/services/admin-access.service";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { AssignSupportConversationDto } from "../dto/assign-support-conversation.dto";
import { ConversationQueryDto } from "../dto/conversation-query.dto";
import { CreateDirectConversationDto } from "../dto/create-direct-conversation.dto";
import { CreateGroupConversationDto } from "../dto/create-group-conversation.dto";
import { CreateMessageDto } from "../dto/create-message.dto";
import { CreateSupportConversationDto } from "../dto/create-support-conversation.dto";
import { UpdateGroupConversationDto } from "../dto/update-group-conversation.dto";
import { UpdateConversationStatusDto } from "../dto/update-conversation-status.dto";
import { CommunicationEventsService } from "./communication-events.service";

const CONVERSATION_INCLUDE = {
  participants: {
    select: {
      id: true,
      userId: true,
      roleSnapshot: true,
      lastReadAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true,
          tenantId: true,
          tenant: { select: { id: true, name: true } }
        }
      }
    }
  },
  course: { select: { id: true, title: true } },
  requester: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } }
    }
  },
  groupInstructor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true,
      tenantId: true,
      tenant: { select: { id: true, name: true } }
    }
  },
  supportAssignment: {
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true,
          tenantId: true,
          tenant: { select: { id: true, name: true } }
        }
      }
    }
  },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true,
          tenantId: true,
          tenant: { select: { id: true, name: true } }
        }
      }
    }
  }
} as const;

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly adminAccessService: AdminAccessService,
    private readonly communicationEventsService: CommunicationEventsService
  ) {}

  async listConversations(currentUser: JwtPayload, query: ConversationQueryDto) {
    const isSupportAdmin = await this.isSupportAdmin(currentUser);
    const conversations = await this.prisma.conversation.findMany({
      where: await this.buildConversationListWhere(currentUser, query, isSupportAdmin),
      orderBy: { lastMessageAt: "desc" },
      include: CONVERSATION_INCLUDE
    });

    const items = await Promise.all(
      conversations.map((conversation) => this.toConversationSummary(conversation, currentUser, isSupportAdmin))
    );

    return query.unreadOnly ? items.filter((conversation) => conversation.unreadCount > 0) : items;
  }

  async listDirectTargets(currentUser: JwtPayload) {
    if (currentUser.role === "STUDENT") {
      const relations = await this.prisma.studentInstructor.findMany({
        where: { studentId: currentUser.sub },
        orderBy: { createdAt: "desc" },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } }
            }
          }
        }
      });

      return relations.map((relation) => relation.instructor);
    }

    if (currentUser.role === "INSTRUCTOR") {
      const relations = await this.prisma.studentInstructor.findMany({
        where: { instructorId: currentUser.sub },
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } }
            }
          }
        }
      });

      return relations.map((relation) => relation.student);
    }

    throw new ForbiddenException("Direct chat targets are only available to students and instructors.");
  }

  async listGroupTargets(currentUser: JwtPayload) {
    if (currentUser.role !== "INSTRUCTOR" || !currentUser.tenantId) {
      throw new ForbiddenException("Only instructors can create group chats.");
    }

    const [courses, relations] = await Promise.all([
      this.prisma.course.findMany({
        where: { instructorId: currentUser.sub, tenantId: currentUser.tenantId },
        orderBy: { title: "asc" },
        select: { id: true, title: true }
      }),
      this.prisma.studentInstructor.findMany({
        where: { instructorId: currentUser.sub },
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);

    const students = relations.map((relation) => relation.student);
    return { courses, followers: students, students };
  }

  async createDirectConversation(currentUser: JwtPayload, dto: CreateDirectConversationDto) {
    const { tenantId, studentId, instructorId } = await this.assertDirectConversationAllowed(currentUser, dto.targetUserId, dto.courseId);
    const existing = await this.prisma.conversation.findFirst({
      where: {
        kind: ConversationKind.DIRECT,
        tenantId,
        status: ConversationStatus.OPEN,
        directStudentId: studentId,
        directInstructorId: instructorId
      },
      include: CONVERSATION_INCLUDE
    });

    if (existing) {
      return this.toConversationSummary(existing, currentUser, false);
    }

    const created = await this.prisma.conversation.create({
      data: {
        tenantId,
        courseId: dto.courseId ?? null,
        kind: ConversationKind.DIRECT,
        createdByUserId: currentUser.sub,
        directStudentId: studentId,
        directInstructorId: instructorId,
        participants: {
          create: [
            { userId: studentId, roleSnapshot: UserRole.STUDENT, lastReadAt: currentUser.role === "STUDENT" ? new Date() : null },
            { userId: instructorId, roleSnapshot: UserRole.INSTRUCTOR, lastReadAt: currentUser.role === "INSTRUCTOR" ? new Date() : null }
          ]
        }
      },
      include: CONVERSATION_INCLUDE
    });

    return this.toConversationSummary(created, currentUser, false);
  }

  async createGroupConversation(currentUser: JwtPayload, dto: CreateGroupConversationDto) {
    if (currentUser.role !== "INSTRUCTOR" || !currentUser.tenantId) {
      throw new ForbiddenException("Only instructors can create group chats.");
    }

    const { participantIds, courseId } = await this.resolveGroupParticipants(currentUser, dto);
    const created = await this.prisma.conversation.create({
      data: {
        tenantId: currentUser.tenantId,
        kind: ConversationKind.GROUP,
        courseId,
        createdByUserId: currentUser.sub,
        groupInstructorId: currentUser.sub,
        groupScope: dto.scopeType,
        groupTitle: dto.title.trim(),
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            roleSnapshot: userId === currentUser.sub ? UserRole.INSTRUCTOR : UserRole.STUDENT,
            lastReadAt: userId === currentUser.sub ? new Date() : null
          }))
        }
      },
      include: CONVERSATION_INCLUDE
    });

    await Promise.all(
      participantIds
        .filter((userId) => userId !== currentUser.sub)
        .map((userId) =>
          this.notificationsService.create({
            userId,
            tenantId: created.tenantId,
            type: NotificationType.GROUP_ADDED,
            title: "You were added to a group chat",
            message: `You were added to ${created.groupTitle ?? "a group conversation"}.`,
            payload: { conversationId: created.id, kind: created.kind }
          })
        )
    );

    return this.toConversationSummary(created, currentUser, false);
  }

  async updateGroupConversation(
    currentUser: JwtPayload,
    conversationId: string,
    dto: UpdateGroupConversationDto
  ) {
    if (currentUser.role !== "INSTRUCTOR" || !currentUser.tenantId) {
      throw new ForbiddenException("Only instructors can update group chats.");
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!conversation || conversation.kind !== ConversationKind.GROUP) {
      throw new NotFoundException("Group conversation not found.");
    }

    if (conversation.groupInstructorId !== currentUser.sub) {
      throw new ForbiddenException("Only the instructor who created this group can update it.");
    }

    const nextStudentIds = await this.resolveUpdatedGroupParticipants(
      currentUser,
      conversation,
      dto.studentIds
    );

    const participantIds = Array.from(new Set([currentUser.sub, ...nextStudentIds]));
    const existingParticipantIds = conversation.participants.map((participant) => participant.userId);
    const addedUserIds = participantIds.filter((userId) => !existingParticipantIds.includes(userId));

    await this.prisma.$transaction(async (tx) => {
      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          ...(dto.title ? { groupTitle: dto.title.trim() } : {})
        }
      });

      await tx.conversationParticipant.deleteMany({
        where: {
          conversationId,
          userId: {
            notIn: participantIds
          }
        }
      });

      for (const userId of participantIds) {
        await tx.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId,
              userId
            }
          },
          update: {},
          create: {
            conversationId,
            userId,
            roleSnapshot: userId === currentUser.sub ? UserRole.INSTRUCTOR : UserRole.STUDENT,
            lastReadAt: userId === currentUser.sub ? new Date() : null
          }
        });
      }
    });

    if (addedUserIds.length > 0) {
      const title = dto.title?.trim() || conversation.groupTitle || "a group conversation";
      await Promise.all(
        addedUserIds
          .filter((userId) => userId !== currentUser.sub)
          .map((userId) =>
            this.notificationsService.create({
              userId,
              tenantId: conversation.tenantId,
              type: NotificationType.GROUP_ADDED,
              title: "You were added to a group chat",
              message: `You were added to ${title}.`,
              payload: { conversationId, kind: ConversationKind.GROUP }
            })
          )
      );
    }

    const refreshed = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!refreshed) {
      throw new NotFoundException("Group conversation not found.");
    }

    return this.toConversationSummary(refreshed, currentUser, false);
  }

  async createSupportConversation(currentUser: JwtPayload, dto: CreateSupportConversationDto) {
    if (!["STUDENT", "INSTRUCTOR"].includes(currentUser.role)) {
      throw new ForbiddenException("Only students and instructors can create support conversations.");
    }

    const body = dto.message.trim();
    if (!body) {
      throw new BadRequestException("Support message cannot be empty.");
    }

    const created = await this.prisma.conversation.create({
      data: {
        tenantId: currentUser.tenantId,
        kind: ConversationKind.SUPPORT,
        createdByUserId: currentUser.sub,
        requesterUserId: currentUser.sub,
        participants: { create: { userId: currentUser.sub, roleSnapshot: currentUser.role, lastReadAt: new Date() } },
        messages: { create: { senderUserId: currentUser.sub, body: dto.subject?.trim() ? `[${dto.subject.trim()}]\n${body}` : body } }
      },
      include: CONVERSATION_INCLUDE
    });

    this.communicationEventsService.publish({
      type: "conversation.message.created",
      conversationId: created.id,
      kind: created.kind,
      participantUserIds: created.participants.map((participant) => participant.userId)
    });

    return this.toConversationSummary(created, currentUser, await this.isSupportAdmin(currentUser));
  }

  async getConversation(currentUser: JwtPayload, conversationId: string) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);

    if (conversation.kind === ConversationKind.SUPPORT && currentUser.role === "ADMIN") {
      await this.ensureAdminParticipant(conversation.id, currentUser);
    }

    const [summary, messages] = await Promise.all([
      this.toConversationSummary(conversation, currentUser, await this.isSupportAdmin(currentUser)),
      this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } }
            }
          }
        }
      })
    ]);

    return {
      ...summary,
      messages: messages.map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender
      }))
    };
  }

  async createMessage(currentUser: JwtPayload, conversationId: string, dto: CreateMessageDto) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);
    const body = dto.body.trim();

    if (!body) {
      throw new BadRequestException("Message body cannot be empty.");
    }

    if (conversation.status !== ConversationStatus.OPEN) {
      throw new BadRequestException("This conversation is closed.");
    }

    await this.ensureParticipantForSender(conversation, currentUser);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderUserId: currentUser.sub, body },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: { select: { id: true, name: true } }
            }
          }
        }
      });

      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });
      await tx.conversationParticipant.updateMany({
        where: { conversationId, userId: currentUser.sub },
        data: { lastReadAt: created.createdAt }
      });

      return created;
    });

    const refreshedConversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!refreshedConversation) {
      throw new NotFoundException("Conversation not found");
    }

    const recipientUserIds = refreshedConversation.participants
      .map((participant) => participant.userId)
      .filter((userId) => userId !== currentUser.sub);

    await this.createNotificationsForMessage(refreshedConversation.kind, refreshedConversation, recipientUserIds);

    this.communicationEventsService.publish({
      type: "conversation.message.created",
      conversationId,
      kind: refreshedConversation.kind,
      participantUserIds: refreshedConversation.participants.map((participant) => participant.userId),
      supportAdminIds: refreshedConversation.supportAssignment?.admin ? [refreshedConversation.supportAssignment.admin.id] : undefined
    });

    return {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender
    };
  }

  async markConversationAsRead(currentUser: JwtPayload, conversationId: string) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);

    if (conversation.kind === ConversationKind.SUPPORT && currentUser.role === "ADMIN") {
      await this.ensureAdminParticipant(conversation.id, currentUser);
    }

    const now = new Date();
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: currentUser.sub } },
      update: { lastReadAt: now },
      create: { conversationId, userId: currentUser.sub, roleSnapshot: currentUser.role, lastReadAt: now }
    });

    this.communicationEventsService.publish({ type: "conversation.read.updated", conversationId, userId: currentUser.sub });
    return { updatedAt: now.toISOString() };
  }

  async updateConversationStatus(currentUser: JwtPayload, conversationId: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);
    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: dto.status },
      include: CONVERSATION_INCLUDE
    });

    if (updated.kind === ConversationKind.SUPPORT && updated.requesterUserId && updated.requesterUserId !== currentUser.sub) {
      await this.notificationsService.create({
        userId: updated.requesterUserId,
        tenantId: updated.tenantId,
        type: NotificationType.SUPPORT_STATUS_CHANGED,
        title: dto.status === ConversationStatus.CLOSED ? "Support conversation closed" : "Support conversation reopened",
        message: dto.status === ConversationStatus.CLOSED ? "Your support conversation was marked as closed." : "Your support conversation was reopened."
      });
    }

    this.communicationEventsService.publish({
      type: "conversation.status.updated",
      conversationId: updated.id,
      kind: updated.kind,
      status: updated.status,
      participantUserIds: updated.participants.map((participant) => participant.userId),
      supportAdminIds: updated.supportAssignment?.admin ? [updated.supportAssignment.admin.id] : undefined
    });

    return this.toConversationSummary(updated, currentUser, await this.isSupportAdmin(currentUser));
  }

  async assignSupportConversation(currentUser: JwtPayload, conversationId: string, dto: AssignSupportConversationDto) {
    await this.assertSupportPermission(currentUser);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!conversation || conversation.kind !== ConversationKind.SUPPORT) {
      throw new NotFoundException("Support conversation not found.");
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: dto.adminUserId },
      select: { id: true, role: true, isActive: true, isSuperAdmin: true, adminPermissions: true }
    });

    if (!adminUser || adminUser.role !== UserRole.ADMIN || !adminUser.isActive) {
      throw new BadRequestException("Assigned support admin is not available.");
    }

    if (!adminUser.isSuperAdmin && !adminUser.adminPermissions.includes(AdminPermission.HANDLE_SUPPORT)) {
      throw new BadRequestException("Assigned admin does not have support permission.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supportAssignment.upsert({
        where: { conversationId },
        update: { adminUserId: dto.adminUserId, assignedAt: new Date() },
        create: { conversationId, adminUserId: dto.adminUserId }
      });

      await tx.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId, userId: dto.adminUserId } },
        update: {},
        create: { conversationId, userId: dto.adminUserId, roleSnapshot: UserRole.ADMIN }
      });
    });

    await this.notificationsService.create({
      userId: dto.adminUserId,
      tenantId: conversation.tenantId,
      type: NotificationType.SUPPORT_ASSIGNED,
      title: "Support conversation assigned",
      message: "A support conversation was assigned to you."
    });

    this.communicationEventsService.publish({
      type: "support.assignment.updated",
      conversationId,
      adminUserId: dto.adminUserId,
      requesterUserId: conversation.requesterUserId
    });

    const refreshed = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!refreshed) {
      throw new NotFoundException("Support conversation not found.");
    }

    return this.toConversationSummary(refreshed, currentUser, true);
  }

  async deleteGroupConversation(currentUser: JwtPayload, conversationId: string) {
    if (currentUser.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can delete group chats.");
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, kind: true, groupInstructorId: true }
    });

    if (!conversation || conversation.kind !== ConversationKind.GROUP) {
      throw new NotFoundException("Group conversation not found.");
    }

    if (conversation.groupInstructorId !== currentUser.sub) {
      throw new ForbiddenException("Only the instructor who created this group can delete it.");
    }

    await this.prisma.conversation.delete({ where: { id: conversationId } });
    return { deleted: true };
  }

  async assertConversationAccess(currentUser: JwtPayload, conversationId: string) {
    await this.getAccessibleConversation(currentUser, conversationId);
  }

  private async buildConversationListWhere(currentUser: JwtPayload, query: ConversationQueryDto, isSupportAdmin: boolean) {
    if (currentUser.role === "ADMIN" && isSupportAdmin) {
      return {
        kind: query.kind ?? ConversationKind.SUPPORT,
        status: query.status,
        ...(query.assignedToMe
          ? { supportAssignment: { adminUserId: currentUser.sub } }
          : query.unassignedOnly
            ? { supportAssignment: null }
            : {})
      };
    }

    return {
      kind: query.kind,
      status: query.status,
      participants: { some: { userId: currentUser.sub } }
    };
  }

  private async assertDirectConversationAllowed(currentUser: JwtPayload, targetUserId: string, courseId?: string) {
    if (!["STUDENT", "INSTRUCTOR"].includes(currentUser.role)) {
      throw new ForbiddenException("Only students and instructors can start direct conversations.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, tenantId: true, isActive: true }
    });

    if (!target || !target.isActive) {
      throw new NotFoundException("Chat user not found.");
    }

    if (currentUser.role === "STUDENT") {
      if (target.role !== UserRole.INSTRUCTOR || !target.tenantId) {
        throw new ForbiddenException("Students can only message instructors.");
      }

      const relation = await this.prisma.studentInstructor.findFirst({
        where: { studentId: currentUser.sub, instructorId: target.id },
        select: { id: true }
      });

      if (!relation) {
        throw new ForbiddenException("Join this instructor before starting a chat.");
      }

      if (courseId) {
        const course = await this.prisma.course.findFirst({
          where: { id: courseId, tenantId: target.tenantId, instructorId: target.id },
          select: { id: true }
        });

        if (!course) {
          throw new ForbiddenException("Course context is not available for this instructor.");
        }
      }

      return { tenantId: target.tenantId, studentId: currentUser.sub, instructorId: target.id };
    }

    if (!currentUser.tenantId || target.role !== UserRole.STUDENT || target.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException("Instructors can only message students in their workspace.");
    }

    const relation = await this.prisma.studentInstructor.findFirst({
      where: { studentId: target.id, instructorId: currentUser.sub },
      select: { id: true }
    });

    if (!relation) {
      throw new ForbiddenException("This student is not part of your workspace.");
    }

    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, tenantId: currentUser.tenantId, instructorId: currentUser.sub },
        select: { id: true }
      });

      if (!course) {
        throw new ForbiddenException("Course context is not available for this student.");
      }
    }

    return { tenantId: currentUser.tenantId, studentId: target.id, instructorId: currentUser.sub };
  }

  private async resolveGroupParticipants(currentUser: JwtPayload, dto: CreateGroupConversationDto) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException("Group title is required.");
    }

    if (!currentUser.tenantId) {
      throw new ForbiddenException("Instructor workspace is required.");
    }

    let courseId: string | null = null;
    let studentIds: string[] = [];

    if (dto.scopeType === ConversationGroupScope.COURSE) {
      if (!dto.courseId) {
        throw new BadRequestException("Course group chats need a course.");
      }

      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, instructorId: currentUser.sub, tenantId: currentUser.tenantId },
        select: { id: true, enrollments: { select: { userId: true } } }
      });

      if (!course) {
        throw new ForbiddenException("Course group target is not available.");
      }

      courseId = course.id;
      studentIds = course.enrollments.map((enrollment) => enrollment.userId);
    } else if (dto.scopeType === ConversationGroupScope.FOLLOWERS) {
      const relations = await this.prisma.studentInstructor.findMany({
        where: { instructorId: currentUser.sub },
        select: { studentId: true }
      });

      studentIds = relations.map((relation) => relation.studentId);
    } else {
      const requestedIds = Array.from(new Set(dto.studentIds ?? []));
      if (!requestedIds.length) {
        throw new BadRequestException("Select at least one student.");
      }

      const relations = await this.prisma.studentInstructor.findMany({
        where: { instructorId: currentUser.sub, studentId: { in: requestedIds } },
        select: { studentId: true }
      });

      studentIds = relations.map((relation) => relation.studentId);
      if (studentIds.length !== requestedIds.length) {
        throw new ForbiddenException("One or more selected students are not part of your workspace.");
      }
    }

    const participantIds = Array.from(new Set([currentUser.sub, ...studentIds]));
    if (participantIds.length < 2) {
      throw new BadRequestException("This group does not include any students yet.");
    }

    return { title, courseId, participantIds };
  }

  private async resolveUpdatedGroupParticipants(
    currentUser: JwtPayload,
    conversation: any,
    requestedStudentIds?: string[]
  ) {
    if (!currentUser.tenantId) {
      throw new ForbiddenException("Instructor workspace is required.");
    }

    if (conversation.groupScope === ConversationGroupScope.COURSE) {
      if (!conversation.courseId) {
        throw new BadRequestException("Course-linked group is missing its course reference.");
      }

      const course = await this.prisma.course.findFirst({
        where: {
          id: conversation.courseId,
          instructorId: currentUser.sub,
          tenantId: currentUser.tenantId
        },
        select: { id: true }
      });

      if (!course) {
        throw new ForbiddenException("Course group target is no longer available.");
      }

      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId: course.id },
        select: { userId: true }
      });

      return enrollments.map((enrollment) => enrollment.userId);
    }

    if (conversation.groupScope === ConversationGroupScope.FOLLOWERS) {
      const relations = await this.prisma.studentInstructor.findMany({
        where: { instructorId: currentUser.sub },
        select: { studentId: true }
      });
      return relations.map((relation) => relation.studentId);
    }

    const selectedIds = Array.from(new Set(requestedStudentIds ?? []));
    if (!selectedIds.length) {
      throw new BadRequestException("Select at least one student for this group.");
    }

    const relations = await this.prisma.studentInstructor.findMany({
      where: {
        instructorId: currentUser.sub,
        studentId: {
          in: selectedIds
        }
      },
      select: { studentId: true }
    });

    const studentIds = relations.map((relation) => relation.studentId);
    if (studentIds.length !== selectedIds.length) {
      throw new ForbiddenException("One or more selected students are not part of your workspace.");
    }

    return studentIds;
  }

  private async getAccessibleConversation(currentUser: JwtPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const isParticipant = conversation.participants.some((participant) => participant.userId === currentUser.sub);

    if (conversation.kind === ConversationKind.SUPPORT) {
      if (isParticipant) {
        return conversation;
      }

      if (currentUser.role === "ADMIN" && (await this.isSupportAdmin(currentUser))) {
        return conversation;
      }

      throw new ForbiddenException("You do not have access to this support conversation.");
    }

    if (!isParticipant) {
      throw new ForbiddenException("You do not have access to this conversation.");
    }

    return conversation;
  }

  private async toConversationSummary(conversation: any, currentUser: JwtPayload, isSupportAdmin: boolean) {
    const participantRecord = conversation.participants.find(
      (participant: { userId: string; lastReadAt: Date | null }) => participant.userId === currentUser.sub
    );
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderUserId: { not: currentUser.sub },
        ...(participantRecord?.lastReadAt ? { createdAt: { gt: participantRecord.lastReadAt } } : {})
      }
    });

    const latestMessage = conversation.messages[0] ?? null;
    const participantPreview = conversation.participants
      .filter((participant: { userId: string }) => participant.userId !== currentUser.sub)
      .map((participant: { user: unknown }) => participant.user);

    const otherParticipant =
      conversation.kind === ConversationKind.DIRECT
        ? conversation.participants.find((participant: { userId: string }) => participant.userId !== currentUser.sub)?.user ?? null
        : null;

    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      kind: conversation.kind,
      status: conversation.status,
      courseId: conversation.courseId,
      groupTitle: conversation.groupTitle ?? null,
      groupScope: conversation.groupScope ?? null,
      groupInstructor: conversation.groupInstructor ?? null,
      participantPreview,
      participantCount: conversation.participants.length,
      course: conversation.course ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt.toISOString(),
      unreadCount,
      otherParticipant,
      requester: conversation.requester,
      assignedAdmin: conversation.supportAssignment?.admin ?? null,
      latestMessage: latestMessage
        ? {
            id: latestMessage.id,
            body: latestMessage.body,
            createdAt: latestMessage.createdAt.toISOString(),
            sender: latestMessage.sender
          }
        : null,
      canReply: conversation.kind === ConversationKind.SUPPORT ? isSupportAdmin || Boolean(participantRecord) : Boolean(participantRecord),
      isAssignedToCurrentAdmin:
        currentUser.role === "ADMIN" && conversation.supportAssignment?.admin.id === currentUser.sub
    };
  }

  private async createNotificationsForMessage(kind: ConversationKind, conversation: any, recipientUserIds: string[]) {
    const type =
      kind === ConversationKind.DIRECT
        ? NotificationType.DIRECT_MESSAGE_RECEIVED
        : kind === ConversationKind.GROUP
          ? NotificationType.GROUP_MESSAGE_RECEIVED
          : NotificationType.SUPPORT_REPLY_RECEIVED;
    const title =
      kind === ConversationKind.DIRECT
        ? "New chat message"
        : kind === ConversationKind.GROUP
          ? "New group message"
          : "New support reply";
    const message =
      kind === ConversationKind.DIRECT
        ? "You have a new unread message."
        : kind === ConversationKind.GROUP
          ? `There is a new message in ${conversation.groupTitle ?? "your group chat"}.`
          : "There is an update in a support conversation.";

    await Promise.all(
      recipientUserIds.map((userId) =>
        this.notificationsService.create({
          userId,
          tenantId: conversation.tenantId,
          type,
          title,
          message,
          payload: { conversationId: conversation.id, kind: conversation.kind }
        })
      )
    );
  }

  private async isSupportAdmin(currentUser: JwtPayload) {
    if (currentUser.role !== "ADMIN") {
      return false;
    }

    const actor = await this.adminAccessService.loadAdminActor(currentUser);
    return actor.isSuperAdmin || actor.adminPermissions.includes(AdminPermission.HANDLE_SUPPORT);
  }

  private async assertSupportPermission(currentUser: JwtPayload) {
    if (currentUser.role !== "ADMIN") {
      throw new ForbiddenException("Support admin access is required.");
    }

    const actor = await this.adminAccessService.loadAdminActor(currentUser);
    if (!actor.isSuperAdmin && !actor.adminPermissions.includes(AdminPermission.HANDLE_SUPPORT)) {
      throw new ForbiddenException("Support admin access is required.");
    }

    return actor;
  }

  private async ensureAdminParticipant(conversationId: string, currentUser: JwtPayload) {
    if (currentUser.role !== "ADMIN") {
      return;
    }

    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: currentUser.sub } },
      update: {},
      create: { conversationId, userId: currentUser.sub, roleSnapshot: UserRole.ADMIN }
    });
  }

  private async ensureParticipantForSender(conversation: any, currentUser: JwtPayload) {
    if (conversation.participants.some((participant: { userId: string }) => participant.userId === currentUser.sub)) {
      return;
    }

    if (conversation.kind === ConversationKind.SUPPORT && currentUser.role === "ADMIN") {
      await this.ensureAdminParticipant(conversation.id, currentUser);
      return;
    }

    throw new ForbiddenException("You cannot send messages in this conversation.");
  }
}

