import { ForbiddenException, Injectable } from "@nestjs/common";
import { AdminPermission, UserRole } from "@prisma/client";

import { ADMIN_PERMISSION_VALUES } from "../../../shared/auth/admin-permissions";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";

@Injectable()
export class AdminAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async loadAdminActor(currentUser: JwtPayload) {
    const actor = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: {
        id: true,
        role: true,
        isSuperAdmin: true,
        adminPermissions: true,
        isActive: true
      }
    });

    if (!actor || actor.role !== UserRole.ADMIN || !actor.isActive) {
      throw new ForbiddenException("Admin access is required.");
    }

    return actor;
  }

  async assertAdminPermission(currentUser: JwtPayload, permission: AdminPermission) {
    const actor = await this.loadAdminActor(currentUser);
    if (actor.isSuperAdmin) {
      return actor;
    }
    if (!actor.adminPermissions.includes(permission)) {
      throw new ForbiddenException(
        "You do not have permission to perform this admin action."
      );
    }
    return actor;
  }

  async assertSuperAdmin(currentUser: JwtPayload) {
    const actor = await this.loadAdminActor(currentUser);
    if (!actor.isSuperAdmin) {
      throw new ForbiddenException(
        "Only the super admin can manage admin accounts."
      );
    }
    return actor;
  }

  ensureDelegatableAdminPermissions(
    actor: { isSuperAdmin: boolean; adminPermissions: AdminPermission[] },
    permissions: AdminPermission[]
  ) {
    if (actor.isSuperAdmin) {
      return;
    }

    const invalid = permissions.find((permission) => !actor.adminPermissions.includes(permission));
    if (invalid) {
      throw new ForbiddenException(
        `You can only assign delegated admin permissions that you already hold yourself.`
      );
    }
  }

  ensureValidAdminPermissions(permissions: string[]) {
    const invalid = permissions.find(
      (permission) =>
        !ADMIN_PERMISSION_VALUES.includes(
          permission as (typeof ADMIN_PERMISSION_VALUES)[number]
        )
    );

    if (invalid) {
      throw new ForbiddenException(`Unknown admin permission: ${invalid}`);
    }
  }
}
