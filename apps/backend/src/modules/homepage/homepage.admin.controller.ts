import { BadRequestException, Body, Controller, Get, Post, Put, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../shared/guards/roles.guard";
import type { JwtPayload } from "../../shared/types/auth.types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { HomepageImageStorageService } from "./homepage-image-storage.service";
import { HomepageService } from "./homepage.service";

@Controller("admin/homepage")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class HomepageAdminController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly homepageImageStorageService: HomepageImageStorageService
  ) {}

  @Get()
  getDraftHomepage(@CurrentUser() user: JwtPayload) {
    return this.homepageService.getDraftHomepage(user);
  }

  @Put("draft")
  saveDraftHomepage(
    @CurrentUser() user: JwtPayload,
    @Body() body: { rows?: Prisma.JsonValue[]; containers?: Prisma.JsonValue[]; updatedAt?: string }
  ) {
    return this.homepageService.saveDraftHomepage(user, body);
  }

  @Post("publish")
  publishDraftHomepage(@CurrentUser() user: JwtPayload) {
    return this.homepageService.publishDraftHomepage(user);
  }

  @Get("catalog")
  getInstructorCatalog(@CurrentUser() user: JwtPayload) {
    return this.homepageService.getInstructorCatalog(user);
  }

  @Post("upload-image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 4 * 1024 * 1024 } }))
  async uploadHomepageImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined
  ) {
    await this.homepageService.assertHomepageAccess(user);

    if (!file) {
      throw new BadRequestException("Homepage image file is required");
    }

    return this.homepageImageStorageService.storeImage({
      buffer: file.buffer,
      originalname: file.originalname ?? "homepage-image",
      mimetype: file.mimetype ?? "application/octet-stream",
      size: file.size ?? file.buffer.length
    });
  }
}
