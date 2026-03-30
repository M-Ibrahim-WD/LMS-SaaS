import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationJobStatus, NotificationType, Prisma } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";

interface CreateNotificationInput {
  userId: string;
  tenantId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        jobs: {
          create: {
            status: NotificationJobStatus.PENDING,
            channel: "IN_APP",
            payload: input.payload ?? {}
          }
        }
      },
      include: {
        jobs: true
      }
    });

    await this.prisma.notificationJob.updateMany({
      where: {
        notificationId: notification.id,
        status: NotificationJobStatus.PENDING
      },
      data: {
        status: NotificationJobStatus.PROCESSED,
        processedAt: new Date()
      }
    });

    return this.prisma.notification.findUnique({
      where: { id: notification.id }
    });
  }

  async myNotifications(user: JwtPayload) {
    return this.prisma.notification.findMany({
      where: {
        userId: user.sub
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async unreadCount(user: JwtPayload) {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.sub,
        isRead: false
      }
    });

    return { unreadCount: count };
  }

  async markAsRead(user: JwtPayload, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.sub
      },
      select: {
        id: true
      }
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  async markAllAsRead(user: JwtPayload) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.sub,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { updatedCount: result.count };
  }

  assertNotificationAccess(user: JwtPayload) {
    if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Unsupported role for notifications");
    }
  }
}
