import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRE_TENANT_KEY } from "../decorators/require-tenant.decorator";
import type { JwtPayload } from "../types/auth.types";

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload; tenantId?: string | null }>();
    const user = request.user;
    const tenantId = user?.tenantId ?? null;
    request.tenantId = tenantId;

    const requireTenant = this.reflector.getAllAndOverride<boolean>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (requireTenant && user?.role !== "STUDENT" && !tenantId) {
      throw new ForbiddenException("User is not assigned to a tenant");
    }

    return true;
  }
}
