import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import { extname, join } from "path";

export type UploadedLessonMediaFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Injectable()
export class LessonMediaStorageService {
  private readonly mediaStorageDir = join(process.cwd(), "uploads", "lesson-media");
  private readonly maxMediaBytes = 150 * 1024 * 1024;

  getPublicLessonMediaUrl(lessonId: string, mediaAsset?: string | null) {
    if (!mediaAsset?.startsWith("local:")) {
      return null;
    }

    return `${this.getPublicServerBaseUrl()}/api/lessons/${lessonId}/media`;
  }

  async storeMedia(file: UploadedLessonMediaFile) {
    this.validateUploadedMedia(file);
    await fs.mkdir(this.mediaStorageDir, { recursive: true });

    const safeName = this.sanitizeFileName(file.originalname || "lesson-media");
    const extension = extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;
    const target = join(this.mediaStorageDir, storedName);

    await fs.writeFile(target, file.buffer);
    return `local:${storedName}`;
  }

  async readLocalMediaRef(value: string) {
    const fileName = value.replace(/^local:/, "");
    const target = join(this.mediaStorageDir, fileName);
    const buffer = await fs.readFile(target).catch(() => {
      throw new NotFoundException("Lesson media not found");
    });

    return {
      buffer,
      fileName,
      contentType: this.contentTypeFromExtension(fileName)
    };
  }

  private validateUploadedMedia(file: UploadedLessonMediaFile) {
    const allowedMimeTypes = new Set([
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "text/plain"
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        "Lesson media must be a browser-viewable video, PDF, image, audio, or text file"
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Lesson media file is empty");
    }

    if (file.size > this.maxMediaBytes) {
      throw new BadRequestException("Lesson media must be 150 MB or smaller");
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
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
      "application/pdf": "pdf",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "audio/mpeg": "mp3",
      "audio/mp3": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "text/plain": "txt"
    };

    const derivedExtension = mimeType
      .split("/")[1]
      ?.replace(/[^a-z0-9]/gi, "")
      .toLowerCase();

    return map[mimeType] ?? derivedExtension ?? "bin";
  }

  private contentTypeFromExtension(fileName: string) {
    const extension = extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".pdf": "application/pdf",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".txt": "text/plain"
    };

    return map[extension] ?? "application/octet-stream";
  }
}
