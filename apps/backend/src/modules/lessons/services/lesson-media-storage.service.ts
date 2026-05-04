import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createHash, createHmac, randomUUID } from "crypto";
import { promises as fs } from "fs";
import { extname, join } from "path";

export type UploadedLessonMediaFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

type CloudflareMediaRef =
  | {
      provider: "cloudflare-stream";
      uid: string;
      playbackId?: string | null;
      filename: string;
      contentType: string;
      size: number;
      status?: string | null;
    }
  | {
      provider: "cloudflare-r2";
      key: string;
      filename: string;
      contentType: string;
      size: number;
    };

type StoredMediaFile = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

@Injectable()
export class LessonMediaStorageService {
  private readonly mediaStorageDir = join(process.cwd(), "uploads", "lesson-media");
  private readonly maxMediaBytes = 150 * 1024 * 1024;

  getPublicLessonMediaUrl(lessonId: string, mediaAsset?: string | null) {
    if (!mediaAsset) {
      return null;
    }

    const streamUrl = this.getCloudflareStreamViewerUrl(mediaAsset);
    if (streamUrl) {
      return streamUrl;
    }

    if (mediaAsset.startsWith("local:") || this.parseCloudflareRef(mediaAsset)?.provider === "cloudflare-r2") {
      return `${this.getPublicServerBaseUrl()}/api/lessons/${lessonId}/media`;
    }

    return null;
  }

  getPublicLessonPdfPagesUrl(lessonId: string, mediaAsset?: string | null) {
    if (!mediaAsset) {
      return null;
    }

    const parsedRef = this.parseCloudflareRef(mediaAsset);
    if (mediaAsset.startsWith("local:") || parsedRef?.provider === "cloudflare-r2") {
      return `${this.getPublicServerBaseUrl()}/api/lessons/${lessonId}/pdf-pages`;
    }

    return null;
  }

  async storeMedia(file: UploadedLessonMediaFile) {
    this.validateUploadedMedia(file);

    if (file.mimetype.startsWith("video/") && this.isCloudflareStreamConfigured()) {
      return this.storeVideoInCloudflareStream(file);
    }

    if (!file.mimetype.startsWith("video/") && this.isCloudflareR2Configured()) {
      return this.storeFileInCloudflareR2(file);
    }

    return this.storeMediaLocally(file);
  }

  async readMediaRef(value: string): Promise<StoredMediaFile> {
    const parsedRef = this.parseCloudflareRef(value);

    if (parsedRef?.provider === "cloudflare-r2") {
      return this.readCloudflareR2Ref(parsedRef);
    }

    if (parsedRef?.provider === "cloudflare-stream") {
      throw new BadRequestException("Cloudflare Stream videos must be opened through the protected Stream viewer");
    }

    return this.readLocalMediaRef(value);
  }

  async readLocalMediaRef(value: string): Promise<StoredMediaFile> {
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

  private async storeMediaLocally(file: UploadedLessonMediaFile) {
    await fs.mkdir(this.mediaStorageDir, { recursive: true });

    const safeName = this.sanitizeFileName(file.originalname || "lesson-media");
    const extension = extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const storedName = `${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;
    const target = join(this.mediaStorageDir, storedName);

    await fs.writeFile(target, file.buffer);
    return `local:${storedName}`;
  }

  private async storeVideoInCloudflareStream(file: UploadedLessonMediaFile) {
    const accountId = this.requireEnv("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = this.requireEnv("CLOUDFLARE_API_TOKEN");
    const safeName = this.sanitizeFileName(file.originalname || "lesson-video");

    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), safeName);
    formData.append(
      "meta",
      JSON.stringify({
        name: safeName,
        source: "athar-lms"
      })
    );

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`
      },
      body: formData
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          success?: boolean;
          errors?: Array<{ message?: string }>;
          result?: {
            uid?: string;
            playback?: {
              hls?: string;
              dash?: string;
            };
            readyToStream?: boolean;
            status?: {
              state?: string;
            };
          };
        }
      | null;

    if (!response.ok || !payload?.success || !payload.result?.uid) {
      throw new ServiceUnavailableException(
        payload?.errors?.[0]?.message || "Cloudflare Stream upload failed. Check Cloudflare media configuration."
      );
    }

    return this.serializeCloudflareRef({
      provider: "cloudflare-stream",
      uid: payload.result.uid,
      playbackId: payload.result.uid,
      filename: safeName,
      contentType: file.mimetype,
      size: file.size,
      status: payload.result.status?.state ?? (payload.result.readyToStream ? "ready" : "processing")
    });
  }

  private async storeFileInCloudflareR2(file: UploadedLessonMediaFile) {
    const safeName = this.sanitizeFileName(file.originalname || "lesson-file");
    const extension = extname(safeName) || `.${this.extensionFromMime(file.mimetype)}`;
    const key = `lesson-media/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}${extension.toLowerCase()}`;

    await this.r2Request("PUT", key, file.buffer, file.mimetype);

    return this.serializeCloudflareRef({
      provider: "cloudflare-r2",
      key,
      filename: safeName,
      contentType: file.mimetype,
      size: file.size
    });
  }

  private async readCloudflareR2Ref(ref: Extract<CloudflareMediaRef, { provider: "cloudflare-r2" }>) {
    const response = await this.r2Request("GET", ref.key);
    const arrayBuffer = await response.arrayBuffer();

    return {
      buffer: Buffer.from(arrayBuffer),
      fileName: ref.filename,
      contentType: ref.contentType
    };
  }

  private async r2Request(method: "GET" | "PUT", key: string, body?: Buffer, contentType = "application/octet-stream") {
    const accountId = this.requireEnv("CLOUDFLARE_ACCOUNT_ID");
    const bucket = this.requireEnv("CLOUDFLARE_R2_BUCKET");
    const accessKeyId = this.requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = this.requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    const encodedKey = key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const path = `/${bucket}/${encodedKey}`;
    const endpoint = `https://${host}${path}`;
    const payloadHash = method === "PUT" && body ? createHash("sha256").update(body).digest("hex") : "UNSIGNED-PAYLOAD";
    const now = new Date();
    const amzDate = this.toAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    };

    if (method === "PUT") {
      headers["content-type"] = contentType;
    }

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((headerName) => `${headerName}:${headers[headerName]}\n`)
      .join("");
    const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex")
    ].join("\n");
    const signingKey = this.getAwsV4SigningKey(secretAccessKey, dateStamp);
    const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method,
      headers: {
        ...headers,
        Authorization: authorization
      },
      body: method === "PUT" && body ? new Uint8Array(body) : undefined
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Cloudflare R2 ${method} failed for protected lesson media`);
    }

    return response;
  }

  private getCloudflareStreamViewerUrl(mediaAsset: string) {
    const parsedRef = this.parseCloudflareRef(mediaAsset);
    if (parsedRef?.provider !== "cloudflare-stream") {
      return null;
    }

    return `https://iframe.videodelivery.net/${parsedRef.playbackId || parsedRef.uid}`;
  }

  private isCloudflareStreamConfigured() {
    return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_API_TOKEN?.trim());
  }

  private isCloudflareR2Configured() {
    return Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
        process.env.CLOUDFLARE_R2_BUCKET?.trim() &&
        process.env.CLOUDFLARE_R2_ACCESS_KEY_ID?.trim() &&
        process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY?.trim()
    );
  }

  private serializeCloudflareRef(ref: CloudflareMediaRef) {
    return `cfmedia:${Buffer.from(JSON.stringify(ref), "utf8").toString("base64url")}`;
  }

  private parseCloudflareRef(value?: string | null): CloudflareMediaRef | null {
    if (!value?.startsWith("cfmedia:")) {
      return null;
    }

    try {
      const parsed = JSON.parse(Buffer.from(value.replace(/^cfmedia:/, ""), "base64url").toString("utf8")) as
        | CloudflareMediaRef
        | null;
      if (parsed?.provider === "cloudflare-stream" || parsed?.provider === "cloudflare-r2") {
        return parsed;
      }
    } catch {
      return null;
    }

    return null;
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
      throw new BadRequestException("Lesson media must be a browser-viewable video, PDF, image, audio, or text file");
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

  private requireEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new ServiceUnavailableException(`${name} is required for Cloudflare lesson media storage`);
    }
    return value;
  }

  private toAmzDate(value: Date) {
    return value.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  private getAwsV4SigningKey(secretAccessKey: string, dateStamp: string) {
    const dateKey = createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
    const regionKey = createHmac("sha256", dateKey).update("auto").digest();
    const serviceKey = createHmac("sha256", regionKey).update("s3").digest();
    return createHmac("sha256", serviceKey).update("aws4_request").digest();
  }
}
