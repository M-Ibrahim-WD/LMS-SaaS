import { Controller, Get, Param, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import { HomepageImageStorageService } from "./homepage-image-storage.service";
import { HomepageService } from "./homepage.service";

@Controller("homepage")
export class HomepagePublicController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly homepageImageStorageService: HomepageImageStorageService
  ) {}

  @Get("published")
  getPublishedHomepage() {
    return this.homepageService.getPublishedHomepage();
  }

  @Get("images/:fileName")
  async getHomepageImage(@Param("fileName") fileName: string, @Res({ passthrough: true }) res: Response) {
    const payload = await this.homepageImageStorageService.readImage(fileName);
    const safeFileName = payload.fileName.replace(/"/g, "");

    res.setHeader("Content-Type", payload.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    return new StreamableFile(payload.buffer);
  }
}
