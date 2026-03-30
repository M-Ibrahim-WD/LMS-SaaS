import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { extname, join } from "path";

export type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Injectable()
export class CourseThumbnailStorageService {
  private readonly thumbnailStorageDir = join(
    process.cwd(),
    "uploads",
    "course-thumbnails"
  );

  private readonly maxThumbnailBytes = 4 * 1024 * 1024;

  getPublicCourseThumbnailUrl(courseId: string, thumbnailImage?: string | null) {
    if (!thumbnailImage?.startsWith("local:")) {
      return thumbnailImage ?? null;
    }

    return `${this.getPublicServerBaseUrl()}/api/courses/${courseId}/thumbnail`;
  }

  async storeThumbnail(file: UploadedImageFile) {
    this.validateUploadedThumbnail(file);
    await fs.mkdir(this.thumbnailStorageDir, { recursive: true });

    const safeName = this.sanitizeFileName(
      file.originalname || "course-thumbnail"
    );
    const extension =
      extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;
    const target = join(this.thumbnailStorageDir, storedName);

    await fs.writeFile(target, file.buffer);
    return `local:${storedName}`;
  }

  async readLocalThumbnailRef(value: string) {
    const fileName = value.replace(/^local:/, "");
    const target = join(this.thumbnailStorageDir, fileName);
    const buffer = await fs.readFile(target).catch(() => {
      throw new NotFoundException("Course thumbnail not found");
    });

    return {
      buffer,
      fileName,
      contentType: this.contentTypeFromExtension(fileName)
    };
  }

  private validateUploadedThumbnail(file: UploadedImageFile) {
    const allowedMimeTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp"
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Thumbnail must be a PNG, JPG, or WEBP image");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Thumbnail file is empty");
    }

    if (file.size > this.maxThumbnailBytes) {
      throw new BadRequestException("Thumbnail must be 4 MB or smaller");
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
