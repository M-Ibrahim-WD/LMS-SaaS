import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AdminPermission,
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
import { CreateMessageDto } from "../dto/create-message.dto";
import { CreateSupportConversationDto } from "../dto/create-support-conversation.dto";
import { UpdateConversationStatusDto } from "../dto/update-conversation-status.dto";
import { CommunicationEventsService } from "./communication-events.service";

type ConversationRecord = {
  id: string;
  tenantId: string | null;
  kind: ConversationKind;
  courseId: string | null;
  status: ConversationStatus;
  requesterUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  participants: Array<{
    userId: string;
    roleSnapshot: UserRole;
    lastReadAt: Date | null;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
      profileImage: string | null;
    };
  }>;
  requester: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    profileImage: string | null;
  } | null;
  supportAssignment: {
    admin: {
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
      profileImage: string | null;
    };
  } | null;
  messages: Array<{
    id: string;
    body: string;
    createdAt: Date;
    sender: {
      id: string;
      fullName: string;
      email: string;
      role: UserRole;
      profileImage: string | null;
    };
  }>;
};

const DIRECT_CONVERSATION_INCLUDE = {
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
          profileImage: true
        }
      }
    }
  },
  directStudent: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true
    }
  },
  directInstructor: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true
    }
  },
  requester: {
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true
    }
  },
  supportAssignment: {
    include: {
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
          role: true
        }
      }
    }
  },
  messages: {
    orderBy: {
      createdAt: "desc" as const
    },
    take: 1,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true
        }
      }
    }
  }
};

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
      orderBy: {
        lastMessageAt: "desc"
      },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    const items = await Promise.all(
      conversations.map((conversation) =>
        this.toConversationSummary(conversation, currentUser, isSupportAdmin)
      )
    );

    if (!query.unreadOnly) {
      return items;
    }

    return items.filter((conversation) => conversation.unreadCount > 0);
  }

  async listDirectTargets(currentUser: JwtPayload) {
    if (currentUser.role === "STUDENT") {
      const relations = await this.prisma.studentInstructor.findMany({
        where: {
          studentId: currentUser.sub
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          instructor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true,
              tenant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      return relations.map((relation) => relation.instructor);
    }

    if (currentUser.role === "INSTRUCTOR") {
      const relations = await this.prisma.studentInstructor.findMany({
        where: {
          instructorId: currentUser.sub
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true,
              tenantId: true
            }
          }
        }
      });

      return relations.map((relation) => relation.student);
    }

    throw new ForbiddenException("Direct chat targets are only available to students and instructors.");
  }

  async createDirectConversation(currentUser: JwtPayload, dto: CreateDirectConversationDto) {
    const { tenantId, studentId, instructorId } = await this.assertDirectConversationAllowed(
      currentUser,
      dto.targetUserId,
      dto.courseId
    );

    const existing = await this.prisma.conversation.findFirst({
      where: {
        kind: ConversationKind.DIRECT,
        tenantId,
        status: ConversationStatus.OPEN,
        directStudentId: studentId,
        directInstructorId: instructorId
      },
      include: DIRECT_CONVERSATION_INCLUDE
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
            {
              userId: studentId,
              roleSnapshot: UserRole.STUDENT,
              lastReadAt: currentUser.role === "STUDENT" ? new Date() : null
            },
            {
              userId: instructorId,
              roleSnapshot: UserRole.INSTRUCTOR,
              lastReadAt: currentUser.role === "INSTRUCTOR" ? new Date() : null
            }
          ]
        }
      },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    return this.toConversationSummary(created, currentUser, false);
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
        participants: {
          create: {
            userId: currentUser.sub,
            roleSnapshot: currentUser.role,
            lastReadAt: new Date()
          }
        },
        messages: {
          create: {
            senderUserId: currentUser.sub,
            body: dto.subject?.trim()
              ? `[${dto.subject.trim()}]\n${body}`
              : body
          }
        }
      },
      include: DIRECT_CONVERSATION_INCLUDE
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

    return {
      ...(await this.toConversationSummary(
        conversation,
        currentUser,
        await this.isSupportAdmin(currentUser)
      )),
      messages: await this.prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        }
      })
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
        data: {
          conversationId,
          senderUserId: currentUser.sub,
          body
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              profileImage: true
            }
          }
        }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: created.createdAt
        }
      });

      await tx.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: currentUser.sub
        },
        data: {
          lastReadAt: created.createdAt
        }
      });

      return created;
    });

    const refreshedConversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    if (!refreshedConversation) {
      throw new NotFoundException("Conversation not found");
    }

    const recipientUserIds = refreshedConversation.participants
      .map((participant) => participant.userId)
      .filter((userId) => userId !== currentUser.sub);

    await this.createNotificationsForMessage(
      refreshedConversation.kind,
      refreshedConversation,
      currentUser,
      recipientUserIds
    );

    this.communicationEventsService.publish({
      type: "conversation.message.created",
      conversationId,
      kind: refreshedConversation.kind,
      participantUserIds: refreshedConversation.participants.map((participant) => participant.userId),
      supportAdminIds: refreshedConversation.supportAssignment?.admin
        ? [refreshedConversation.supportAssignment.admin.id]
        : undefined
    });

    return message;
  }

  async markConversationAsRead(currentUser: JwtPayload, conversationId: string) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);

    if (conversation.kind === ConversationKind.SUPPORT && currentUser.role === "ADMIN") {
      await this.ensureAdminParticipant(conversation.id, currentUser);
    }

    const now = new Date();
    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.sub
        }
      },
      update: {
        lastReadAt: now
      },
      create: {
        conversationId,
        userId: currentUser.sub,
        roleSnapshot: currentUser.role,
        lastReadAt: now
      }
    });

    this.communicationEventsService.publish({
      type: "conversation.read.updated",
      conversationId,
      userId: currentUser.sub
    });

    return { updatedAt: now.toISOString() };
  }

  async updateConversationStatus(
    currentUser: JwtPayload,
    conversationId: string,
    dto: UpdateConversationStatusDto
  ) {
    const conversation = await this.getAccessibleConversation(currentUser, conversationId);

    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: dto.status
      },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    if (updated.kind === ConversationKind.SUPPORT && updated.requesterUserId && updated.requesterUserId !== currentUser.sub) {
      await this.notificationsService.create({
        userId: updated.requesterUserId,
        tenantId: updated.tenantId,
        type: NotificationType.SUPPORT_STATUS_CHANGED,
        title: dto.status === ConversationStatus.CLOSED ? "Support conversation closed" : "Support conversation reopened",
        message:
          dto.status === ConversationStatus.CLOSED
            ? "Your support conversation was marked as closed."
            : "Your support conversation was reopened."
      });
    }

    this.communicationEventsService.publish({
      type: "conversation.status.updated",
      conversationId: updated.id,
      kind: updated.kind,
      status: updated.status,
      participantUserIds: updated.participants.map((participant) => participant.userId),
      supportAdminIds: updated.supportAssignment?.admin
        ? [updated.supportAssignment.admin.id]
        : undefined
    });

    return this.toConversationSummary(updated, currentUser, await this.isSupportAdmin(currentUser));
  }

  async assignSupportConversation(
    currentUser: JwtPayload,
    conversationId: string,
    dto: AssignSupportConversationDto
  ) {
    await this.assertSupportPermission(currentUser);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    if (!conversation || conversation.kind !== ConversationKind.SUPPORT) {
      throw new NotFoundException("Support conversation not found.");
    }

    const adminUser = await this.prisma.user.findUnique({
      where: { id: dto.adminUserId },
      select: {
        id: true,
        role: true,
        isActive: true,
        isSuperAdmin: true,
        adminPermissions: true
      }
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
        update: {
          adminUserId: dto.adminUserId,
          assignedAt: new Date()
        },
        create: {
          conversationId,
          adminUserId: dto.adminUserId
        }
      });

      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: dto.adminUserId
          }
        },
        update: {},
        create: {
          conversationId,
          userId: dto.adminUserId,
          roleSnapshot: UserRole.ADMIN
        }
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
      include: DIRECT_CONVERSATION_INCLUDE
    });

    if (!refreshed) {
      throw new NotFoundException("Support conversation not found.");
    }

    return this.toConversationSummary(refreshed, currentUser, true);
  }

  async assertConversationAccess(currentUser: JwtPayload, conversationId: string) {
    await this.getAccessibleConversation(currentUser, conversationId);
  }

  private async buildConversationListWhere(
    currentUser: JwtPayload,
    query: ConversationQueryDto,
    isSupportAdmin: boolean
  ) {
    if (currentUser.role === "ADMIN" && isSupportAdmin) {
      return {
        kind: query.kind ?? ConversationKind.SUPPORT,
        status: query.status,
        ...(query.assignedToMe
          ? {
              supportAssignment: {
                adminUserId: currentUser.sub
              }
            }
          : query.unassignedOnly
            ? {
                supportAssignment: null
              }
            : {})
      };
    }

    return {
      kind: query.kind,
      status: query.status,
      participants: {
        some: {
          userId: currentUser.sub
        }
      }
    };
  }

  private async assertDirectConversationAllowed(
    currentUser: JwtPayload,
    targetUserId: string,
    courseId?: string
  ) {
    if (!["STUDENT", "INSTRUCTOR"].includes(currentUser.role)) {
      throw new ForbiddenException("Only students and instructors can start direct conversations.");
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        role: true,
        tenantId: true,
        isActive: true
      }
    });

    if (!target || !target.isActive) {
      throw new NotFoundException("Chat user not found.");
    }

    if (currentUser.role === "STUDENT") {
      if (target.role !== UserRole.INSTRUCTOR || !target.tenantId) {
        throw new ForbiddenException("Students can only message instructors.");
      }

      const relation = await this.prisma.studentInstructor.findFirst({
        where: {
          studentId: currentUser.sub,
          instructorId: target.id
        },
        select: { id: true }
      });

      if (!relation) {
        throw new ForbiddenException("Join this instructor before starting a chat.");
      }

      if (courseId) {
        const course = await this.prisma.course.findFirst({
          where: {
            id: courseId,
            tenantId: target.tenantId,
            instructorId: target.id
          },
          select: { id: true }
        });

        if (!course) {
          throw new ForbiddenException("Course context is not available for this instructor.");
        }
      }

      return {
        tenantId: target.tenantId,
        studentId: currentUser.sub,
        instructorId: target.id
      };
    }

    if (!currentUser.tenantId || target.role !== UserRole.STUDENT || target.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException("Instructors can only message students in their workspace.");
    }

    const relation = await this.prisma.studentInstructor.findFirst({
      where: {
        studentId: target.id,
        instructorId: currentUser.sub
      },
      select: { id: true }
    });

    if (!relation) {
      throw new ForbiddenException("This student is not part of your workspace.");
    }

    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: {
          id: courseId,
          tenantId: currentUser.tenantId,
          instructorId: currentUser.sub
        },
        select: { id: true }
      });

      if (!course) {
        throw new ForbiddenException("Course context is not available for this student.");
      }
    }

    return {
      tenantId: currentUser.tenantId,
      studentId: target.id,
      instructorId: currentUser.sub
    };
  }

  private async getAccessibleConversation(currentUser: JwtPayload, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: DIRECT_CONVERSATION_INCLUDE
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const isParticipant = conversation.participants.some(
      (participant: { userId: string }) => participant.userId === currentUser.sub
    );

    if (conversation.kind === ConversationKind.DIRECT) {
      if (!isParticipant) {
        throw new ForbiddenException("You do not have access to this conversation.");
      }

      return conversation;
    }

    if (isParticipant) {
      return conversation;
    }

    if (currentUser.role === "ADMIN" && (await this.isSupportAdmin(currentUser))) {
      return conversation;
    }

    throw new ForbiddenException("You do not have access to this support conversation.");
  }

  private async toConversationSummary(
    conversation: ConversationRecord,
    currentUser: JwtPayload,
    isSupportAdmin: boolean
  ) {
    const participantRecord = conversation.participants.find(
      (participant: ConversationRecord["participants"][number]) => participant.userId === currentUser.sub
    );
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderUserId: {
          not: currentUser.sub
        },
        ...(participantRecord?.lastReadAt
          ? {
              createdAt: {
                gt: participantRecord.lastReadAt
              }
            }
          : {})
      }
    });

    const latestMessage = conversation.messages[0] ?? null;
    const otherParticipant =
      conversation.kind === ConversationKind.DIRECT
        ? conversation.participants.find(
            (participant: ConversationRecord["participants"][number]) =>
              participant.userId !== currentUser.sub
          )?.user ?? null
        : conversation.requester;

    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      kind: conversation.kind,
      status: conversation.status,
      courseId: conversation.courseId,
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
      canReply:
        conversation.kind === ConversationKind.DIRECT
          ? true
          : isSupportAdmin || Boolean(participantRecord),
      isAssignedToCurrentAdmin:
        currentUser.role === "ADMIN" &&
        conversation.supportAssignment?.admin.id === currentUser.sub
    };
  }

  private async createNotificationsForMessage(
    kind: ConversationKind,
    conversation: any,
    currentUser: JwtPayload,
    recipientUserIds: string[]
  ) {
    const type =
      kind === ConversationKind.DIRECT
        ? NotificationType.DIRECT_MESSAGE_RECEIVED
        : NotificationType.SUPPORT_REPLY_RECEIVED;
    const title =
      kind === ConversationKind.DIRECT ? "New chat message" : "New support reply";
    const message =
      kind === ConversationKind.DIRECT
        ? "You have a new unread message."
        : "There is an update in a support conversation.";

    await Promise.all(
      recipientUserIds.map((userId) =>
        this.notificationsService.create({
          userId,
          tenantId: conversation.tenantId,
          type,
          title,
          message,
          payload: {
            conversationId: conversation.id,
            kind: conversation.kind
          }
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

    return this.adminAccessService.assertAdminPermission(currentUser, AdminPermission.HANDLE_SUPPORT);
  }

  private async ensureAdminParticipant(conversationId: string, currentUser: JwtPayload) {
    if (currentUser.role !== "ADMIN") {
      return;
    }

    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.sub
        }
      },
      update: {},
      create: {
        conversationId,
        userId: currentUser.sub,
        roleSnapshot: UserRole.ADMIN
      }
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
