import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ConversationKind } from "@prisma/client";
import type { Server, Socket } from "socket.io";
import type { JwtPayload } from "../../shared/types/auth.types";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AdminAccessService } from "../admin/services/admin-access.service";
import { CommunicationEventsService } from "./services/communication-events.service";
import { CommunicationsService } from "./services/communications.service";

interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

@Injectable()
@WebSocketGateway({
  namespace: "/conversations",
  cors: {
    origin: true,
    credentials: true
  }
})
export class CommunicationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly communicationsService: CommunicationsService,
    private readonly communicationEventsService: CommunicationEventsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly adminAccessService: AdminAccessService
  ) {
    this.communicationEventsService.events$.subscribe((event) => {
      if (!this.server) {
        return;
      }

      if (event.type === "conversation.message.created") {
        this.server.to(`conversation:${event.conversationId}`).emit(event.type, event);
        event.participantUserIds.forEach((userId) => {
          this.server.to(`user:${userId}`).emit(event.type, event);
        });
        if (event.kind === ConversationKind.SUPPORT) {
          this.server.to("support-admins").emit(event.type, event);
        }
        return;
      }

      if (event.type === "conversation.read.updated") {
        this.server.to(`conversation:${event.conversationId}`).emit(event.type, event);
        this.server.to(`user:${event.userId}`).emit(event.type, event);
        return;
      }

      if (event.type === "conversation.status.updated") {
        this.server.to(`conversation:${event.conversationId}`).emit(event.type, event);
        event.participantUserIds.forEach((userId) => {
          this.server.to(`user:${userId}`).emit(event.type, event);
        });
        if (event.kind === ConversationKind.SUPPORT) {
          this.server.to("support-admins").emit(event.type, event);
        }
        return;
      }

      this.server.to(`conversation:${event.conversationId}`).emit(event.type, event);
      this.server.to(`user:${event.adminUserId}`).emit(event.type, event);
      if (event.requesterUserId) {
        this.server.to(`user:${event.requesterUserId}`).emit(event.type, event);
      }
      this.server.to("support-admins").emit(event.type, event);
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect();
      throw new UnauthorizedException("Missing conversation auth token.");
    }

    const payload = await this.verifyToken(token);
    client.data.user = payload;
    client.join(`user:${payload.sub}`);

    if (payload.role === "ADMIN") {
      const actor = await this.adminAccessService.loadAdminActor(payload);
      if (actor.isSuperAdmin || actor.adminPermissions.includes("HANDLE_SUPPORT")) {
        client.join("support-admins");
      }
    }
  }

  handleDisconnect(_client: AuthenticatedSocket) {}

  @SubscribeMessage("conversation.join")
  async joinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string }
  ) {
    const user = this.requireUser(client);
    const conversationId = body?.conversationId;
    if (!conversationId) {
      throw new ForbiddenException("Conversation id is required.");
    }

    await this.communicationsService.assertConversationAccess(user, conversationId);
    client.join(`conversation:${conversationId}`);

    return { ok: true };
  }

  @SubscribeMessage("conversation.leave")
  leaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: { conversationId?: string }
  ) {
    if (!body?.conversationId) {
      return { ok: true };
    }

    client.leave(`conversation:${body.conversationId}`);
    return { ok: true };
  }

  private requireUser(client: AuthenticatedSocket) {
    if (!client.data.user) {
      throw new UnauthorizedException("Missing socket session.");
    }

    return client.data.user;
  }

  private extractToken(client: AuthenticatedSocket) {
    const authToken =
      typeof client.handshake.auth?.token === "string"
        ? client.handshake.auth.token
        : undefined;

    if (authToken) {
      return authToken.replace(/^Bearer\s+/i, "");
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === "string") {
      return header.replace(/^Bearer\s+/i, "");
    }

    return null;
  }

  private async verifyToken(token: string) {
    const secret = this.configService.get<string>("app.jwtSecret");
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        tenantId: true,
        email: true,
        isSuperAdmin: true,
        adminPermissions: true,
        mustChangePassword: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("This account is not available for chat access.");
    }

    return {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      adminPermissions: user.adminPermissions,
      mustChangePassword: user.mustChangePassword
    } satisfies JwtPayload;
  }
}
