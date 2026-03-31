import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../shared/guards/roles.guard";
import type { JwtPayload } from "../../shared/types/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AssignSupportConversationDto } from "./dto/assign-support-conversation.dto";
import { ConversationQueryDto } from "./dto/conversation-query.dto";
import { CreateDirectConversationDto } from "./dto/create-direct-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { CreateSupportConversationDto } from "./dto/create-support-conversation.dto";
import { UpdateConversationStatusDto } from "./dto/update-conversation-status.dto";
import { CommunicationsService } from "./services/communications.service";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("STUDENT", "INSTRUCTOR", "ADMIN")
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get("conversations")
  listConversations(@CurrentUser() user: JwtPayload, @Query() query: ConversationQueryDto) {
    return this.communicationsService.listConversations(user, query);
  }

  @Get("conversations/direct-targets")
  listDirectTargets(@CurrentUser() user: JwtPayload) {
    return this.communicationsService.listDirectTargets(user);
  }

  @Post("conversations/direct")
  createDirectConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateDirectConversationDto) {
    return this.communicationsService.createDirectConversation(user, dto);
  }

  @Post("conversations/support")
  createSupportConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupportConversationDto) {
    return this.communicationsService.createSupportConversation(user, dto);
  }

  @Get("conversations/:id")
  getConversation(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.communicationsService.getConversation(user, id);
  }

  @Post("conversations/:id/messages")
  createMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateMessageDto
  ) {
    return this.communicationsService.createMessage(user, id, dto);
  }

  @Patch("conversations/:id/read")
  markAsRead(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.communicationsService.markConversationAsRead(user, id);
  }

  @Patch("conversations/:id/status")
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateConversationStatusDto
  ) {
    return this.communicationsService.updateConversationStatus(user, id, dto);
  }

  @Patch("support/conversations/:id/assign")
  assignSupportConversation(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AssignSupportConversationDto
  ) {
    return this.communicationsService.assignSupportConversation(user, id, dto);
  }
}
