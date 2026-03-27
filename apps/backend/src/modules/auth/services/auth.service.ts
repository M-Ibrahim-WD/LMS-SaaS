import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { StudentInstructorsService } from "../../student-instructors/services/student-instructors.service";
import { UsersService } from "../../users/services/users.service";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { TenantsService } from "../../tenants/services/tenants.service";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
    private readonly studentInstructorsService: StudentInstructorsService,
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const fullName = dto.fullName?.trim() || normalizedEmail.split("@")[0];
    const role = dto.role ?? "STUDENT";

    if (role === "INSTRUCTOR") {
      if (!dto.organizationName) {
        throw new BadRequestException("organizationName is required for INSTRUCTOR registration");
      }

      const instructor = await this.usersService.create({
        email: normalizedEmail,
        fullName,
        role: UserRole.INSTRUCTOR,
        tenantId: null,
        password: dto.password
      });

      const tenant = await this.tenantsService.create({
        name: dto.organizationName.trim(),
        ownerId: instructor.id
      });

      const updatedInstructor = await this.usersService.assignTenant(instructor.id, tenant.id);
      const token = await this.signToken(
        updatedInstructor.id,
        updatedInstructor.email,
        updatedInstructor.role,
        updatedInstructor.tenantId,
        updatedInstructor.isSuperAdmin,
        updatedInstructor.adminPermissions ?? [],
        updatedInstructor.mustChangePassword ?? false
      );

      await this.notificationsService.create({
        userId: updatedInstructor.id,
        tenantId: updatedInstructor.tenantId,
        type: "WELCOME",
        title: "Instructor account ready",
        message: `Your instructor workspace for ${tenant.name} is ready.`,
        payload: { tenantId: tenant.id, role: updatedInstructor.role }
      });

      return {
        ...token,
        user: updatedInstructor
      };
    }

    if (role === "STUDENT") {
      if (!dto.inviteCode) {
        throw new BadRequestException("inviteCode is required for STUDENT registration");
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { inviteCode: dto.inviteCode.trim().toUpperCase() },
        select: { id: true }
      });

      if (!tenant) {
        throw new BadRequestException("Invalid invite code");
      }

      await this.subscriptionsService.assertTenantCanAddStudent(tenant.id);

      const user = await this.usersService.create({
        email: normalizedEmail,
        fullName,
        role: UserRole.STUDENT,
        tenantId: null,
        password: dto.password
      });

      await this.studentInstructorsService.createRelationFromInviteCode(user.id, dto.inviteCode.trim().toUpperCase());
      const updatedUser = await this.usersService.findById(user.id, null);

      if (!updatedUser) {
        throw new BadRequestException("Student account could not be loaded");
      }

      const token = await this.signToken(
        updatedUser.id,
        updatedUser.email,
        updatedUser.role,
        updatedUser.tenantId,
        updatedUser.isSuperAdmin,
        updatedUser.adminPermissions ?? [],
        updatedUser.mustChangePassword ?? false
      );

      await this.notificationsService.create({
        userId: updatedUser.id,
        tenantId: updatedUser.tenantId,
        type: "WELCOME",
        title: "Student account ready",
        message: "Your student account was created successfully.",
        payload: { role: updatedUser.role }
      });

      return {
        ...token,
        user: updatedUser
      };
    }

    if (!dto.tenantId) {
      throw new BadRequestException("tenantId is required for ADMIN registration");
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new BadRequestException("Invalid tenantId");
    }

    const user = await this.usersService.create({
      email: normalizedEmail,
      fullName,
      role: UserRole.ADMIN,
      tenantId: tenant.id,
      password: dto.password
    });

    const token = await this.signToken(
      user.id,
      user.email,
      user.role,
      user.tenantId,
      user.isSuperAdmin,
      user.adminPermissions ?? [],
      user.mustChangePassword ?? false
    );

    await this.notificationsService.create({
      userId: user.id,
      tenantId: user.tenantId,
      type: "WELCOME",
      title: "Admin account ready",
      message: "Your admin account was created successfully.",
      payload: { role: user.role }
    });

    return {
      ...token,
      user
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findAuthUserByEmail(dto.email.trim().toLowerCase());

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("This account has been deactivated. Please contact support.");
    }

    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { isActive: true }
      });

      if (tenant && !tenant.isActive) {
        throw new UnauthorizedException("This workspace has been deactivated. Please contact support.");
      }
    }

    const token = await this.signToken(
      user.id,
      user.email,
      user.role,
      user.tenantId,
      user.isSuperAdmin,
      user.adminPermissions ?? [],
      user.mustChangePassword ?? false
    );
    const safeUser = await this.usersService.findById(user.id, user.tenantId);

    return {
      ...token,
      user: safeUser
    };
  }

  me(payload: JwtPayload) {
    return this.usersService.findById(payload.sub, payload.tenantId);
  }

  async changePassword(payload: JwtPayload, dto: ChangePasswordDto) {
    const updatedUser = await this.usersService.setPassword(payload.sub, payload.tenantId, dto.password, {
      clearMustChangePassword: true
    });

    if (!updatedUser) {
      throw new UnauthorizedException("User account could not be loaded");
    }

    const token = await this.signToken(
      updatedUser.id,
      updatedUser.email,
      updatedUser.role,
      updatedUser.tenantId,
      updatedUser.isSuperAdmin,
      updatedUser.adminPermissions ?? [],
      updatedUser.mustChangePassword ?? false
    );

    return {
      ...token,
      user: updatedUser
    };
  }

  private async signToken(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string | null,
    isSuperAdmin = false,
    adminPermissions: string[] = [],
    mustChangePassword = false
  ) {
    const payload = { sub: userId, email, role, tenantId, isSuperAdmin, adminPermissions, mustChangePassword };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: "Bearer"
    };
  }
}
