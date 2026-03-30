import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { NotificationsService } from "../services/notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STUDENT", "INSTRUCTOR", "ADMIN")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("my")
  myNotifications(@CurrentUser() user: JwtPayload) {
    this.notificationsService.assertNotificationAccess(user);
    return this.notificationsService.myNotifications(user);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: JwtPayload) {
    this.notificationsService.assertNotificationAccess(user);
    return this.notificationsService.unreadCount(user);
  }

  @Patch(":id/read")
  markAsRead(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    this.notificationsService.assertNotificationAccess(user);
    return this.notificationsService.markAsRead(user, id);
  }

  @Patch("read-all")
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    this.notificationsService.assertNotificationAccess(user);
    return this.notificationsService.markAllAsRead(user);
  }
}
