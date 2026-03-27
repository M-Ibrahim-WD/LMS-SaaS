import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import { promises as fs } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { PaymentMethodsService } from "../../payment-methods/services/payment-methods.service";
import { CreatePaymentDto } from "../dto/create-payment.dto";

interface ProofFilePayload {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

interface UploadedProofFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class PaymentsService {
  private readonly proofStorageDir = join(process.cwd(), "uploads", "payment-proofs");
  private readonly maxProofSizeBytes = 5 * 1024 * 1024;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly studentAccessService: StudentAccessService,
    private readonly notificationsService: NotificationsService
  ) {}

  async create(user: JwtPayload, dto: CreatePaymentDto, file: UploadedProofFile) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can create payments");
    }

    this.validateUploadedProof(file);

    const course = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, dto.courseId, {
      id: true,
      tenantId: true,
      isPaid: true,
      price: true
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (!course.isPaid) {
      throw new BadRequestException("Course is free and does not require payment");
    }

    if (!course.price || course.price <= 0) {
      throw new BadRequestException("Paid course has invalid price configuration");
    }

    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.sub,
        courseId: course.id,
        tenantId: course.tenantId
      },
      select: { id: true }
    });

    if (existingEnrollment) {
      throw new ConflictException("Already enrolled");
    }

    const existingPending = await this.prisma.payment.findFirst({
      where: {
        userId: user.sub,
        courseId: course.id,
        tenantId: course.tenantId,
        status: PaymentStatus.PENDING
      },
      select: { id: true }
    });

    if (existingPending) {
      throw new ConflictException("You already have a pending payment for this course");
    }

    const method = await this.paymentMethodsService.ensureManualMethodForCourse(
      course.tenantId,
      course.id,
      dto.methodId
    );

    const storedProofRef = await this.storeUploadedProof(file);

    const created = await this.prisma.payment.create({
      data: {
        userId: user.sub,
        courseId: course.id,
        tenantId: course.tenantId,
        methodId: method.id,
        amount: course.price,
        proof: storedProofRef,
        status: PaymentStatus.PENDING
      },
      include: {
        course: {
          select: { id: true, title: true, isPaid: true, price: true }
        },
        method: true
      }
    });

    await this.notificationsService.create({
      userId: user.sub,
      tenantId: course.tenantId,
      type: "PAYMENT_SUBMITTED",
      title: "Payment submitted",
      message: `Your payment for ${created.course.title} was submitted and is awaiting review.`,
      payload: { courseId: created.course.id, paymentId: created.id }
    });

    return this.serializePayment(created);
  }

  async my(user: JwtPayload) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access this endpoint");
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        userId: user.sub
      },
      include: {
        course: {
          select: { id: true, title: true, isPaid: true, price: true }
        },
        method: true
      },
      orderBy: { createdAt: "desc" }
    });

    return payments.map((payment) => this.serializePayment(payment));
  }

  async instructor(user: JwtPayload) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can access this endpoint");
    }

    if (!user.tenantId) {
      return [];
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId: user.tenantId,
        course: {
          instructorId: user.sub
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        course: {
          select: { id: true, title: true, price: true }
        },
        method: true
      },
      orderBy: { createdAt: "desc" }
    });

    return payments.map((payment) => this.serializePayment(payment));
  }

  async approve(user: JwtPayload, paymentId: string) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can approve payments");
    }

    if (!user.tenantId) {
      throw new ForbiddenException("Instructor must belong to a tenant");
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId: user.tenantId,
        course: {
          instructorId: user.sub
        }
      },
      select: {
        id: true,
        userId: true,
        courseId: true,
        tenantId: true,
        status: true
      }
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException("Only pending payments can be approved");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.APPROVED
        }
      });

      await tx.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId
          }
        },
        update: {},
        create: {
          userId: payment.userId,
          courseId: payment.courseId,
          tenantId: payment.tenantId
        }
      });

      const student = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { id: true }
      });

      if (student) {
        await this.notificationsService.create({
          userId: student.id,
          tenantId: payment.tenantId,
          type: "PAYMENT_APPROVED",
          title: "Payment approved",
          message: "Your payment was approved and your course access is now active.",
          payload: { paymentId: payment.id, courseId: payment.courseId }
        });
      }

      return updatedPayment;
    });
  }

  async reject(user: JwtPayload, paymentId: string) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can reject payments");
    }

    if (!user.tenantId) {
      throw new ForbiddenException("Instructor must belong to a tenant");
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        tenantId: user.tenantId,
        course: {
          instructorId: user.sub
        }
      },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException("Only pending payments can be rejected");
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REJECTED }
    });

    await this.notificationsService.create({
      userId: payment.userId,
      tenantId: user.tenantId,
      type: "PAYMENT_REJECTED",
      title: "Payment rejected",
      message: "Your payment was rejected. Review the proof and try again if needed.",
      payload: { paymentId: payment.id }
    });

    return updated;
  }

  async proofFile(user: JwtPayload, paymentId: string): Promise<ProofFilePayload> {
    const payment = await this.prisma.payment.findFirst({
      where: this.proofAccessWhere(user, paymentId),
      select: {
        id: true,
        proof: true
      }
    });

    if (!payment) {
      throw new NotFoundException("Payment proof not found");
    }

    const proof = payment.proof.trim();

    if (proof.startsWith("local:///")) {
      return this.readLocalProofRef(proof);
    }

    if (proof.startsWith("data:")) {
      return this.decodeDataUrlProof(proof);
    }

    throw new BadRequestException("Legacy external proof URLs are not supported");
  }

  private proofAccessWhere(user: JwtPayload, paymentId: string) {
    if (user.role === "STUDENT") {
      return { id: paymentId, userId: user.sub };
    }

    if (user.role === "INSTRUCTOR") {
      if (!user.tenantId) {
        throw new ForbiddenException("Instructor must belong to a tenant");
      }

      return {
        id: paymentId,
        tenantId: user.tenantId,
        course: {
          instructorId: user.sub
        }
      };
    }

    if (user.role === "ADMIN") {
      if (!user.tenantId) {
        throw new ForbiddenException("Admin must belong to a tenant");
      }

      return { id: paymentId, tenantId: user.tenantId };
    }

    throw new ForbiddenException("Unsupported role for proof access");
  }

  private serializePayment<T extends { id: string; proof: string }>(payment: T) {
    const proofPreviewUrl = `/payments/${payment.id}/proof`;
    const proofDownloadUrl = `/payments/${payment.id}/proof?download=true`;

    return {
      ...payment,
      proof: proofPreviewUrl,
      proofPreviewUrl,
      proofDownloadUrl,
      proofContentType: this.getProofContentType(payment.proof),
      proofFileName: this.getProofFileName(payment.proof)
    };
  }

  private async storeUploadedProof(file: UploadedProofFile): Promise<string> {
    const mimeType = String(file.mimetype || "application/octet-stream").toLowerCase();
    const extension = this.extensionFromMime(mimeType);
    const originalName = this.sanitizeFileName(file.originalname || `proof.${extension}`);
    const storedName = `${Date.now()}-${randomUUID()}.${extension}`;

    if (!this.isAllowedMimeType(mimeType)) {
      throw new BadRequestException("Unsupported proof file type");
    }

    const buffer = file.buffer;
    if (!buffer.length) {
      throw new BadRequestException("Empty proof file");
    }

    if (buffer.length > this.maxProofSizeBytes) {
      throw new BadRequestException("Proof file too large");
    }

    await fs.mkdir(this.proofStorageDir, { recursive: true });
    await fs.writeFile(join(this.proofStorageDir, storedName), buffer);

    return `local:///${storedName}?mime=${encodeURIComponent(mimeType)}&name=${encodeURIComponent(originalName)}`;
  }

  private async readLocalProofRef(proofRef: string): Promise<ProofFilePayload> {
    const parsed = this.parseLocalProofRef(proofRef);
    const fullPath = join(this.proofStorageDir, parsed.storedName);

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(fullPath);
    } catch {
      throw new NotFoundException("Stored proof file not found");
    }

    if (!fileBuffer.length) {
      throw new NotFoundException("Stored proof file is empty");
    }

    return {
      buffer: fileBuffer,
      mimeType: parsed.mimeType || this.contentTypeFromExtension(parsed.storedName),
      fileName: parsed.originalName || parsed.storedName
    };
  }

  private decodeDataUrlProof(dataUrl: string): ProofFilePayload {
    const parsed = this.parseDataUrl(dataUrl);
    const mimeType = parsed.mimeType.toLowerCase();

    const buffer = Buffer.from(parsed.base64Data, "base64");
    if (!buffer.length) {
      throw new NotFoundException("Proof data is empty");
    }

    return {
      buffer,
      mimeType,
      fileName: `proof.${this.extensionFromMime(mimeType)}`
    };
  }

  private getProofContentType(proofRef: string): string | null {
    const value = proofRef.trim();
    if (value.startsWith("local:///")) {
      return this.parseLocalProofRef(value).mimeType;
    }

    if (value.startsWith("data:")) {
      return this.parseDataUrl(value).mimeType;
    }

    return null;
  }

  private getProofFileName(proofRef: string): string | null {
    const value = proofRef.trim();
    if (value.startsWith("local:///")) {
      const local = this.parseLocalProofRef(value);
      return local.originalName || local.storedName;
    }

    if (value.startsWith("data:")) {
      return `proof.${this.extensionFromMime(this.parseDataUrl(value).mimeType)}`;
    }

    return null;
  }

  private parseDataUrl(value: string) {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(value.trim());
    if (!match) {
      throw new BadRequestException("proof must be a valid base64 data URL");
    }

    return {
      mimeType: match[1],
      base64Data: match[2]
    };
  }

  private parseLocalProofRef(value: string) {
    const clean = value.trim();
    if (!clean.startsWith("local:///")) {
      throw new BadRequestException("Invalid local proof reference");
    }

    const raw = clean.slice("local:///".length);
    const [storedNamePart, queryPart = ""] = raw.split("?");
    const storedName = this.sanitizeFileName(storedNamePart);

    if (!storedName) {
      throw new BadRequestException("Invalid stored proof filename");
    }

    const params = new URLSearchParams(queryPart);
    const mimeType = params.get("mime") ?? this.contentTypeFromExtension(storedName);
    const originalNameRaw = params.get("name") ?? "";
    const originalName = originalNameRaw ? this.sanitizeFileName(originalNameRaw) : null;

    return {
      storedName,
      mimeType,
      originalName
    };
  }

  private sanitizeFileName(name: string) {
    return name.replace(/[\\/:"*?<>|]+/g, "_").trim();
  }

  private isAllowedMimeType(mimeType: string) {
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType === "text/plain" ||
      mimeType === "application/zip" ||
      mimeType === "application/octet-stream"
    );
  }

  private extensionFromMime(mimeType: string) {
    const normalized = mimeType.toLowerCase();
    const map: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "application/zip": "zip",
      "application/octet-stream": "bin"
    };

    if (map[normalized]) {
      return map[normalized];
    }

    if (normalized.startsWith("image/")) {
      return normalized.split("/")[1] || "img";
    }

    return "bin";
  }

  private contentTypeFromExtension(fileName: string) {
    const ext = extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".zip": "application/zip"
    };

    return map[ext] ?? "application/octet-stream";
  }

  private validateUploadedProof(file: UploadedProofFile) {
    if (!file?.buffer) {
      throw new BadRequestException("Proof required");
    }

    const size = Number(file.size ?? file.buffer.length);
    if (!size || size <= 0) {
      throw new BadRequestException("Empty proof file");
    }

    if (size > this.maxProofSizeBytes) {
      throw new BadRequestException("Proof file too large");
    }

    const mimeType = String(file.mimetype || "").toLowerCase();
    if (!mimeType || !this.isAllowedMimeType(mimeType)) {
      throw new BadRequestException("Unsupported proof file type");
    }
  }
}
