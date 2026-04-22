import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { Res } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../shared/guards/roles.guard";
import type { JwtPayload } from "../../shared/types/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AssignSupportConversationDto } from "./dto/assign-support-conversation.dto";
import { ConversationQueryDto } from "./dto/conversation-query.dto";
import { CreateDirectConversationDto } from "./dto/create-direct-conversation.dto";
import { CreateGroupConversationDto } from "./dto/create-group-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { CreateSupportConversationDto } from "./dto/create-support-conversation.dto";
import { UpdateGroupConversationDto } from "./dto/update-group-conversation.dto";
import { UpdateConversationStatusDto } from "./dto/update-conversation-status.dto";
import { CommunicationsService } from "./services/communications.service";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

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

  @Get("conversations/group-targets")
  listGroupTargets(@CurrentUser() user: JwtPayload) {
    return this.communicationsService.listGroupTargets(user);
  }

  @Post("conversations/direct")
  createDirectConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateDirectConversationDto) {
    return this.communicationsService.createDirectConversation(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Post("conversations/group")
  createGroupConversation(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupConversationDto) {
    return this.communicationsService.createGroupConversation(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("conversations/:id/group")
  updateGroupConversation(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateGroupConversationDto
  ) {
    return this.communicationsService.updateGroupConversation(user, id, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("conversations/:id/group-image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 4 * 1024 * 1024 } }))
  uploadGroupImage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @UploadedFile() file: UploadedImageFile | undefined
  ) {
    if (!file) {
      throw new BadRequestException("Group image is required");
    }

    return this.communicationsService.uploadGroupImage(user, id, file);
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

  @Roles("INSTRUCTOR")
  @Delete("conversations/:id/group")
  deleteGroupConversation(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.communicationsService.deleteGroupConversation(user, id);
  }
}

@Controller("conversations")
export class CommunicationsPublicController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Get(":id/group-image")
  async getGroupImage(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.communicationsService.readGroupImage(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return new StreamableFile(file.buffer);
  }
}
