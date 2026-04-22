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
export class ConversationGroupImageStorageService {
  private readonly groupImageStorageDir = join(
    process.cwd(),
    "uploads",
    "conversation-group-images"
  );

  private readonly maxImageBytes = 4 * 1024 * 1024;

  getPublicGroupImageUrl(conversationId: string, groupImage?: string | null) {
    if (!groupImage?.startsWith("local:")) {
      return groupImage ?? null;
    }

    return `${this.getPublicServerBaseUrl()}/api/conversations/${conversationId}/group-image`;
  }

  async storeGroupImage(file: UploadedImageFile) {
    this.validateUploadedImage(file);
    await fs.mkdir(this.groupImageStorageDir, { recursive: true });

    const safeName = this.sanitizeFileName(file.originalname || "group-image");
    const extension =
      extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;

    await fs.writeFile(join(this.groupImageStorageDir, storedName), file.buffer);
    return `local:${storedName}`;
  }

  async readLocalGroupImageRef(value: string) {
    const fileName = value.replace(/^local:/, "");
    const buffer = await fs.readFile(join(this.groupImageStorageDir, fileName)).catch(() => {
      throw new NotFoundException("Group image not found");
    });

    return {
      buffer,
      fileName,
      contentType: this.contentTypeFromExtension(fileName)
    };
  }

  private validateUploadedImage(file: UploadedImageFile) {
    const allowedMimeTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp"
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Group image must be a PNG, JPG, or WEBP image");
    }

    if (!file.buffer?.length) {
      throw new BadRequestException("Group image file is empty");
    }

    if (file.size > this.maxImageBytes) {
      throw new BadRequestException("Group image must be 4 MB or smaller");
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
