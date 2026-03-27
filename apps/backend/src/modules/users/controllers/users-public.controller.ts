import { Controller, Get, Param, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { UsersService } from "../services/users.service";

@Controller("users")
export class UsersPublicController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id/profile-image")
  async getProfileImage(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const payload = await this.usersService.readProfileImage(id);
    const safeFileName = payload.fileName.replace(/"/g, "");

    res.setHeader("Content-Type", payload.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    return new StreamableFile(payload.buffer);
  }
}
