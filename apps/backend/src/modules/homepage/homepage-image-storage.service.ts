import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { extname, join } from "path";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Injectable()
export class HomepageImageStorageService {
  private readonly homepageImageStorageDir = join(process.cwd(), "uploads", "homepage-images");
  private readonly maxImageBytes = 4 * 1024 * 1024;

  getPublicHomepageImageUrl(fileName: string) {
    return `${this.getPublicServerBaseUrl()}/api/homepage/images/${encodeURIComponent(fileName)}`;
  }

  async storeImage(file: UploadedImageFile) {
    this.validateUploadedImage(file);
    await fs.mkdir(this.homepageImageStorageDir, { recursive: true });

    const safeName = this.sanitizeFileName(file.originalname || "homepage-image");
    const extension = extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;

    await fs.writeFile(join(this.homepageImageStorageDir, storedName), file.buffer);

    return {
      fileName: storedName,
      imageUrl: this.getPublicHomepageImageUrl(storedName)
    };
  }

  async readImage(fileName: string) {
    const safeFileName = this.sanitizeFileName(fileName);
    const buffer = await fs.readFile(join(this.homepageImageStorageDir, safeFileName)).catch(() => {
      throw new NotFoundException("Homepage image not found");
    });

    return {
      buffer,
      fileName: safeFileName,
      contentType: this.contentTypeFromExtension(safeFileName)
    };
  }

  private validateUploadedImage(file: UploadedImageFile) {
    const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Homepage image must be a PNG, JPG, or WEBP image");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Homepage image file is empty");
    }

    if (file.size > this.maxImageBytes) {
      throw new BadRequestException("Homepage image must be 4 MB or smaller");
    }
  }

  private getPublicServerBaseUrl() {
    const explicitBaseUrl = process.env.PUBLIC_SERVER_URL?.trim();
    if (explicitBaseUrl) {
      return explicitBaseUrl.replace(/\/+$/, "");
    }

    const port = process.env.PORT?.trim() || "4000";
    return `http://localhost:${port}`;
  }

  private sanitizeFileName(name: string) {
    return name.replace(/[\\/:"*?<>|]+/g, "_").trim();
  }

  private extensionFromMime(mimeType: string) {
    const map: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp"
    };

    const derivedExtension = mimeType
      .split("/")[1]
      ?.replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

    return map[mimeType] ?? derivedExtension ?? "img";
  }

  private contentTypeFromExtension(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp"
    };

    return map[extension] ?? "application/octet-stream";
  }
}
