import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../shared/prisma/prisma.service";
import {
  AdminAuditLogsQueryDto,
  type AdminAuditCategory
} from "../dto/admin-users.dto";

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAuditLog(input: {
    actorUserId: string;
    action: string;
    summary: string;
    targetUserId?: string | null;
    targetTenantId?: string | null;
    targetPlanId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        summary: input.summary,
        targetUserId: input.targetUserId ?? null,
        targetTenantId: input.targetTenantId ?? null,
        targetPlanId: input.targetPlanId ?? null,
        metadata: input.metadata
      }
    });
  }

  async listAuditLogs(query: AdminAuditLogsQueryDto) {
    const take = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const categoryActions = this.getAuditActionsForCategory(query.category);

    return this.prisma.adminAuditLog.findMany({
      where: categoryActions ? { action: { in: categoryActions } } : undefined,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isSuperAdmin: true
          }
        }
      }
    });
  }

  private getAuditActionsForCategory(category?: AdminAuditCategory) {
    switch (category) {
      case "ADMINS":
        return [
          "ADMIN_CREATED",
          "ADMIN_PERMISSIONS_UPDATED",
          "ADMIN_DEACTIVATED",
          "ADMIN_REACTIVATED",
          "ADMIN_PASSWORD_RESET"
        ];
      case "PLANS":
        return ["PLAN_CREATED", "PLAN_UPDATED", "PLAN_ARCHIVED"];
      case "TENANTS":
        return [
          "TENANT_ACTIVATED",
          "TENANT_DEACTIVATED",
          "TENANT_SUBSCRIPTION_UPDATED",
          "TENANT_TRIAL_RESTARTED",
          "TENANT_SUBSCRIPTION_ENDED"
        ];
      case "USERS":
        return ["USER_ACTIVATED", "USER_DEACTIVATED"];
      default:
        return undefined;
    }
  }
}
