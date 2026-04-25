import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AdminPermission, ExternalAuthProvider, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { promises as fs } from "fs";
import { extname, join } from "path";
import { randomUUID } from "crypto";

interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role: UserRole | "INSTRUCTOR" | "STUDENT" | "ADMIN";
  tenantId: string | null;
  isSuperAdmin?: boolean;
  adminPermissions?: AdminPermission[];
  mustChangePassword?: boolean;
  emailVerifiedAt?: Date | null;
  primaryAuthProvider?: ExternalAuthProvider;
}

@Injectable()
export class UsersService {
  private readonly profileImageStorageDir = join(process.cwd(), "uploads", "profile-images");
  private readonly maxProfileImageBytes = 3 * 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private getPublicServerBaseUrl() {
    const explicitBaseUrl = process.env.PUBLIC_SERVER_URL?.trim();
    if (explicitBaseUrl) {
      return explicitBaseUrl.replace(/\/+$/, "");
    }

    const port = process.env.PORT?.trim() || "4000";
    return `http://localhost:${port}`;
  }

  private readonly userSelect = {
    id: true,
    email: true,
    fullName: true,
    bio: true,
    profileImage: true,
    role: true,
    emailVerifiedAt: true,
    primaryAuthProvider: true,
    isSuperAdmin: true,
    adminPermissions: true,
    mustChangePassword: true,
    isActive: true,
    deactivatedAt: true,
    tenantId: true,
    tenant: {
      select: {
        id: true,
        name: true,
        isActive: true,
        deactivatedAt: true
      }
    },
    createdAt: true,
    updatedAt: true
  };

  private toPublicUser<T extends { id: string; profileImage?: string | null }>(user: T) {
    return {
      ...user,
      profileImage: this.resolveProfileImageUrl(user.id, user.profileImage ?? null)
    };
  }

  resolveProfileImageUrl(userId: string, profileImage: string | null) {
    if (!profileImage) {
      return null;
    }

    if (profileImage.startsWith("local:///")) {
      return `${this.getPublicServerBaseUrl()}/api/users/${userId}/profile-image`;
    }

    return profileImage;
  }

  findById(id: string, tenantId: string | null) {
    return this.prisma.user
      .findFirst({
      where: tenantId ? { id, tenantId } : { id },
      select: this.userSelect
      })
      .then((user) => (user ? this.toPublicUser(user) : null));
  }

  findAuthUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: this.normalizeEmail(email)
      }
    });
  }

  async create(data: CreateUserInput) {
    const password = await bcrypt.hash(data.password, 10);

    try {
      return await this.prisma.user.create({
        data: {
          email: this.normalizeEmail(data.email),
          fullName: data.fullName,
          role: data.role as UserRole,
          tenantId: data.tenantId,
          password,
          isSuperAdmin: data.isSuperAdmin ?? false,
          adminPermissions: data.adminPermissions ?? [],
          mustChangePassword: data.mustChangePassword ?? false,
          emailVerifiedAt: data.emailVerifiedAt ?? null,
          primaryAuthProvider: data.primaryAuthProvider ?? ExternalAuthProvider.LOCAL
        },
        select: this.userSelect
      });
    } catch {
      throw new ConflictException("User with this email already exists");
    }
  }

  getProfile(userId: string, tenantId: string | null) {
    return this.findById(userId, tenantId);
  }

  async markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date()
      },
      select: this.userSelect
    });
  }

  async getProfileSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        bio: true,
        profileImage: true,
        role: true,
        isSuperAdmin: true,
        adminPermissions: true,
        mustChangePassword: true,
        isActive: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            instructorCourses: true,
            followedByStudents: true,
            joinedInstructors: true,
            certificates: true,
            enrollments: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return this.toPublicUser({
      ...user,
      stats:
        user.role === "INSTRUCTOR"
          ? {
              studentsCount: user._count.followedByStudents,
              coursesCount: user._count.instructorCourses
            }
          : {
              coursesCount: user._count.enrollments,
              certificatesCount: user._count.certificates,
              followingCount: user._count.joinedInstructors
            }
    });
  }

  async updateProfile(userId: string, tenantId: string | null, dto: UpdateProfileDto) {
    const data: {
      fullName?: string;
      bio?: string | null;
      profileImage?: string | null;
      password?: string;
      mustChangePassword?: boolean;
    } = {};

    if (dto.fullName) {
      data.fullName = dto.fullName;
    }

    if (dto.bio !== undefined) {
      data.bio = dto.bio.trim() || null;
    }

    if (dto.profileImage !== undefined) {
      data.profileImage = dto.profileImage.trim() || null;
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const target = await this.prisma.user.findFirst({
      where: tenantId ? { id: userId, tenantId } : { id: userId },
      select: { id: true }
    });

    if (!target) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data,
      select: this.userSelect
    }).then((user) => this.toPublicUser(user));
  }

  async setPassword(
    userId: string,
    tenantId: string | null,
    password: string,
    options?: { clearMustChangePassword?: boolean; mustChangePassword?: boolean }
  ) {
    const target = await this.prisma.user.findFirst({
      where: tenantId ? { id: userId, tenantId } : { id: userId },
      select: { id: true }
    });

    if (!target) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data: {
        password: await bcrypt.hash(password, 10),
        ...(options?.clearMustChangePassword ? { mustChangePassword: false } : {}),
        ...(options?.mustChangePassword !== undefined ? { mustChangePassword: options.mustChangePassword } : {})
      },
      select: this.userSelect
    }).then((user) => this.toPublicUser(user));
  }

  async assignTenant(userId: string, tenantId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { tenantId },
      select: this.userSelect
    }).then((user) => this.toPublicUser(user));
  }

  async setActiveStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        deactivatedAt: isActive ? null : new Date()
      },
      select: this.userSelect
    }).then((user) => this.toPublicUser(user));
  }

  async uploadProfileImage(
    userId: string,
    tenantId: string | null,
    file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }
  ) {
    this.validateUploadedProfileImage(file);

    const target = await this.prisma.user.findFirst({
      where: tenantId ? { id: userId, tenantId } : { id: userId },
      select: { id: true }
    });

    if (!target) {
      throw new NotFoundException("User not found");
    }

    const storedRef = await this.storeProfileImage(file);

    return this.prisma.user.update({
      where: { id: target.id },
      data: { profileImage: storedRef },
      select: this.userSelect
    }).then((user) => this.toPublicUser(user));
  }

  async readProfileImage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profileImage: true
      }
    });

    if (!user?.profileImage) {
      throw new NotFoundException("Profile image not found");
    }

    if (!user.profileImage.startsWith("local:///")) {
      throw new NotFoundException("Stored profile image is not a local upload");
    }

    return this.readLocalProfileImageRef(user.profileImage);
  }

  private async storeProfileImage(file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) {
    const mimeType = String(file.mimetype || "application/octet-stream").toLowerCase();
    const extension = this.extensionFromMime(mimeType);
    const originalName = this.sanitizeFileName(file.originalname || `profile.${extension}`);
    const storedName = `${Date.now()}-${randomUUID()}.${extension}`;

    await fs.mkdir(this.profileImageStorageDir, { recursive: true });
    await fs.writeFile(join(this.profileImageStorageDir, storedName), file.buffer);

    return `local:///${storedName}?mime=${encodeURIComponent(mimeType)}&name=${encodeURIComponent(originalName)}`;
  }

  private async readLocalProfileImageRef(value: string) {
    const clean = value.trim();
    const raw = clean.slice("local:///".length);
    const [storedNamePart, queryPart = ""] = raw.split("?");
    const storedName = this.sanitizeFileName(storedNamePart);
    const params = new URLSearchParams(queryPart);
    const mimeType = params.get("mime") ?? this.contentTypeFromExtension(storedName);
    const originalName = params.get("name") ?? storedName;
    const buffer = await fs.readFile(join(this.profileImageStorageDir, storedName));

    return {
      buffer,
      mimeType,
      fileName: this.sanitizeFileName(originalName)
    };
  }

  private validateUploadedProfileImage(file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) {
    if (!file?.buffer?.length) {
      throw new BadRequestException("Profile image file is required");
    }

    const size = Number(file.size ?? file.buffer.length);
    if (size > this.maxProfileImageBytes) {
      throw new BadRequestException("Profile image file is too large");
    }

    const mimeType = String(file.mimetype || "").toLowerCase();
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mimeType)) {
      throw new BadRequestException("Unsupported profile image type");
    }
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

    const derivedExtension = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase();

    return map[mimeType] ?? derivedExtension ?? "img";
  }

  private contentTypeFromExtension(fileName: string) {
    const ext = extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp"
    };

    return map[ext] ?? "application/octet-stream";
  }
}
