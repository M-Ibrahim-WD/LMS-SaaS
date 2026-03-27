import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PrismaService } from "../../../shared/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("app.jwtSecret")
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        tenantId: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        adminPermissions: true,
        tenant: {
          select: {
            isActive: true
          }
        }
      }
    });

    if (!user?.isActive) {
      throw new UnauthorizedException("This account has been deactivated.");
    }

    if (user.tenantId && user.tenant && !user.tenant.isActive) {
      throw new UnauthorizedException("This workspace has been deactivated.");
    }

    return {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      adminPermissions: user.adminPermissions
    };
  }
}
