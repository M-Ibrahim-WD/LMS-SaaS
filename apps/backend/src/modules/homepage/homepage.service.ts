import { Injectable } from "@nestjs/common";
import { AdminPermission, Prisma, UserRole } from "@prisma/client";
import { PrismaService } from "../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../shared/types/auth.types";
import { AdminAccessService } from "../admin/services/admin-access.service";

const HOMEPAGE_KEY = "global-public-homepage";

type HomepageContentPayload = {
  rows?: Prisma.JsonValue[];
  containers?: Prisma.JsonValue[];
  updatedAt?: string;
};

const EMPTY_HOMEPAGE_CONTENT: Prisma.InputJsonObject = {
  rows: [],
  containers: []
};

@Injectable()
export class HomepageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminAccessService: AdminAccessService
  ) {}

  private async ensureHomepageRecord() {
    const existing = await this.prisma.homepageContent.findUnique({
      where: { key: HOMEPAGE_KEY }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.homepageContent.create({
      data: {
        key: HOMEPAGE_KEY,
        draftContent: EMPTY_HOMEPAGE_CONTENT,
        publishedContent: Prisma.DbNull
      }
    });
  }

  async assertHomepageAccess(currentUser: JwtPayload) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_HOMEPAGE
    );
  }

  async getPublishedHomepage() {
    const record = await this.ensureHomepageRecord();

    return {
      publishedAt: record.publishedAt,
      content:
        (record.publishedContent as HomepageContentPayload | null) ?? {
          rows: []
        }
    };
  }

  async getDraftHomepage(currentUser: JwtPayload) {
    await this.assertHomepageAccess(currentUser);
    const record = await this.ensureHomepageRecord();

    return {
      draftContent:
        (record.draftContent as HomepageContentPayload | null) ?? {
          rows: []
        },
      publishedContent:
        (record.publishedContent as HomepageContentPayload | null) ?? {
          rows: []
        },
      publishedAt: record.publishedAt,
      hasPublishedContent: Boolean(record.publishedContent)
    };
  }

  async saveDraftHomepage(currentUser: JwtPayload, content: HomepageContentPayload) {
    await this.assertHomepageAccess(currentUser);

    const record = await this.ensureHomepageRecord();

    return this.prisma.homepageContent.update({
      where: { id: record.id },
      data: {
        draftContent: content as Prisma.InputJsonValue
      },
      select: {
        draftContent: true,
        publishedAt: true
      }
    });
  }

  async publishDraftHomepage(currentUser: JwtPayload) {
    await this.assertHomepageAccess(currentUser);

    const record = await this.ensureHomepageRecord();

    return this.prisma.homepageContent.update({
      where: { id: record.id },
      data: {
        publishedContent: (record.draftContent ?? EMPTY_HOMEPAGE_CONTENT) as Prisma.InputJsonValue,
        publishedAt: new Date()
      },
      select: {
        publishedContent: true,
        publishedAt: true
      }
    });
  }

  async getInstructorCatalog(currentUser: JwtPayload) {
    await this.assertHomepageAccess(currentUser);

    const instructors = await this.prisma.user.findMany({
      where: {
        role: UserRole.INSTRUCTOR,
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        bio: true,
        profileImage: true,
        instructorCourses: {
          where: {
            status: "PUBLISHED"
          },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailImage: true,
            category: true,
            level: true,
            price: true,
            isPaid: true
          },
          orderBy: {
            updatedAt: "desc"
          }
        }
      },
      orderBy: {
        fullName: "asc"
      }
    });

    return instructors;
  }
}
