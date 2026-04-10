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
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { Res } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateLessonDto } from "../dto/create-lesson.dto";
import { CreateMediaSessionDto } from "../dto/create-media-session.dto";
import { LogProtectedContentEventDto } from "../dto/log-protected-content-event.dto";
import { ReorderLessonsDto } from "../dto/reorder-lessons.dto";
import { UpdateLessonDto } from "../dto/update-lesson.dto";
import { LessonsService } from "../services/lessons.service";

@Controller("lessons")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@Roles("INSTRUCTOR")
@RequireTenant()
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(user, dto);
  }

  @Patch("reorder")
  reorder(@CurrentUser() user: JwtPayload, @Body() dto: ReorderLessonsDto) {
    return this.lessonsService.reorder(user, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(user, id, dto);
  }

  @Patch(":id/media")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 150 * 1024 * 1024 } }))
  uploadMedia(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype: string;
      size: number;
      originalname: string;
    }
  ) {
    if (!file) {
      throw new BadRequestException("Lesson media file is required");
    }

    return this.lessonsService.uploadMedia(user, id, file);
  }

  @Delete(":id")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.lessonsService.remove(user, id);
  }
}

@Controller("lessons")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class LessonsAccessController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Roles("STUDENT", "INSTRUCTOR", "ADMIN")
  @Post(":id/media-session")
  createMediaSession(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateMediaSessionDto
  ) {
    return this.lessonsService.createMediaSession(user, id, dto);
  }

  @Roles("STUDENT", "INSTRUCTOR", "ADMIN")
  @Post(":id/security-events")
  logSecurityEvent(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: LogProtectedContentEventDto
  ) {
    return this.lessonsService.logProtectedContentEvent(user, id, dto);
  }
}

@Controller("lessons")
export class LessonsPublicController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(":id/media")
  async getMedia(
    @Param("id") id: string,
    @Query("token") token: string,
    @Query("session") sessionId: string | undefined,
    @Query("inline") inlineMode: string | undefined,
    @Query("download") downloadMode: string | undefined,
    @Query("filename") requestedFileName: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request
  ) {
    const file = await this.lessonsService.readProtectedMedia(id, token, sessionId);
    const shouldDownload = downloadMode === "1" && inlineMode !== "1";
    const disposition = shouldDownload ? "attachment" : "inline";
    const outputFileName = requestedFileName?.trim() || file.fileName;

    if (file.contentType.startsWith("video/")) {
      const range = req.headers.range;

      if (range) {
        const matches = /bytes=(\d+)-(\d*)/.exec(range);
        if (matches) {
          const start = Number(matches[1]);
          const requestedEnd = matches[2] ? Number(matches[2]) : file.buffer.length - 1;
          const end = Math.min(requestedEnd, file.buffer.length - 1);
          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= file.buffer.length) {
            throw new BadRequestException("Invalid media byte range");
          }
          const chunk = file.buffer.subarray(start, end + 1);
          res.status(206);
          res.setHeader("Content-Range", `bytes ${start}-${end}/${file.buffer.length}`);
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Length", String(chunk.length));
          res.setHeader("Content-Type", file.contentType);
          res.setHeader("Content-Disposition", `${disposition}; filename="${outputFileName}"`);
          res.setHeader("Cache-Control", "private, no-store");
          res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
          res.setHeader("X-Content-Type-Options", "nosniff");
          return new StreamableFile(chunk);
        }
      }
    }

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${outputFileName}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", String(file.buffer.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(file.buffer);
  }
}
