import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { ExternalAuthProvider, UserRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { CompleteGoogleRegistrationDto } from "../dto/complete-google-registration.dto";
import { StudentInstructorsService } from "../../student-instructors/services/student-instructors.service";
import { UsersService } from "../../users/services/users.service";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { TenantsService } from "../../tenants/services/tenants.service";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { MailerService } from "../../mailer/mailer.service";

type GoogleStartQuery = {
  intent?: "login" | "register";
  role?: "INSTRUCTOR" | "STUDENT";
  organizationName?: string;
  inviteCode?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
};

type GoogleRegistrationPayload = {
  kind: "google-registration";
  providerUserId: string;
  email: string;
  fullName: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
    private readonly studentInstructorsService: StudentInstructorsService,
    private readonly notificationsService: NotificationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {}

  private getPublicWebUrl() {
    return (this.configService.get<string>("app.publicWebUrl") ?? "http://localhost:3000").replace(
      /\/+$/,
      ""
    );
  }

  private getGoogleRedirectUri() {
    const configured = this.configService.get<string>("app.google.redirectUri") ?? "";
    if (configured) {
      return configured;
    }

    const publicServerUrl = (
      this.configService.get<string>("app.publicServerUrl") ?? "http://localhost:4000"
    ).replace(/\/+$/, "");
    return `${publicServerUrl}/api/auth/google/callback`;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private createOpaqueToken() {
    return randomBytes(32).toString("hex");
  }

  private buildWebUrl(path: string, params?: Record<string, string>) {
    const url = new URL(path, `${this.getPublicWebUrl()}/`);
    Object.entries(params ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }

  getGoogleCallbackErrorRedirect(message: string) {
    return this.buildWebUrl("/auth/google/callback", { error: message });
  }

  private getGoogleDisplayName(googleUser: GoogleUserInfo) {
    return googleUser.name?.trim() || googleUser.email.trim().toLowerCase().split("@")[0];
  }

  private async createGoogleRegistrationToken(googleUser: GoogleUserInfo) {
    return this.jwtService.signAsync(
      {
        kind: "google-registration",
        providerUserId: googleUser.sub,
        email: googleUser.email.trim().toLowerCase(),
        fullName: this.getGoogleDisplayName(googleUser)
      },
      {
        expiresIn: "20m"
      }
    );
  }

  private async buildGoogleCompletionRedirect(googleUser: GoogleUserInfo) {
    const registrationToken = await this.createGoogleRegistrationToken(googleUser);
    return this.buildWebUrl("/auth/google/callback", {
      registrationToken,
      email: googleUser.email.trim().toLowerCase(),
      fullName: this.getGoogleDisplayName(googleUser)
    });
  }

  private async findGoogleUser(googleUser: GoogleUserInfo) {
    const normalizedEmail = googleUser.email.trim().toLowerCase();

    const linkedIdentity = await this.prisma.externalAuthIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: ExternalAuthProvider.GOOGLE,
          providerUserId: googleUser.sub
        }
      },
      include: {
        user: true
      }
    });

    if (linkedIdentity?.user) {
      return linkedIdentity.user;
    }

    const existingUser = await this.usersService.findAuthUserByEmail(normalizedEmail);
    if (!existingUser) {
      return null;
    }

    if (existingUser.role === UserRole.ADMIN) {
      throw new Error("Google sign-in is not available for admin accounts.");
    }

    await this.prisma.externalAuthIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: ExternalAuthProvider.GOOGLE,
          providerUserId: googleUser.sub
        }
      },
      update: {
        userId: existingUser.id,
        email: normalizedEmail
      },
      create: {
        userId: existingUser.id,
        provider: ExternalAuthProvider.GOOGLE,
        providerUserId: googleUser.sub,
        email: normalizedEmail
      }
    });

    if (!existingUser.emailVerifiedAt) {
      await this.usersService.markEmailVerified(existingUser.id);
    }

    return this.usersService.findAuthUserByEmail(normalizedEmail);
  }

  private async signInResolvedUser(user: Awaited<ReturnType<UsersService["findAuthUserByEmail"]>>) {
    if (!user) {
      throw new Error("Account could not be loaded.");
    }

    if (!user.isActive) {
      throw new Error("This account has been deactivated. Please contact support.");
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

  private async issueEmailVerification(user: {
    id: string;
    email: string;
    fullName: string;
  }) {
    const token = this.createOpaqueToken();
    const tokenHash = this.hashToken(token);
    const verificationUrl = this.buildWebUrl("/verify-email", { token });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: "Verify your ATHAR LMS account",
      text: `Hello ${user.fullName}, verify your account by opening this link: ${verificationUrl}`,
      html: `<p>Hello <strong>${user.fullName}</strong>,</p><p>Please verify your ATHAR LMS account by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link expires in 24 hours.</p>`
    });
  }

  private async issuePasswordReset(user: {
    id: string;
    email: string;
    fullName: string;
  }) {
    const token = this.createOpaqueToken();
    const tokenHash = this.hashToken(token);
    const resetUrl = this.buildWebUrl("/reset-password", { token });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60)
      }
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: "Reset your ATHAR LMS password",
      text: `Hello ${user.fullName}, reset your password by opening this link: ${resetUrl}`,
      html: `<p>Hello <strong>${user.fullName}</strong>,</p><p>You requested a password reset. Use the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
    });
  }

  private async createInstructorAccount(input: {
    email: string;
    fullName: string;
    password: string;
    organizationName: string;
    emailVerifiedAt: Date | null;
    primaryAuthProvider: ExternalAuthProvider;
  }) {
    const instructor = await this.usersService.create({
      email: input.email,
      fullName: input.fullName,
      role: UserRole.INSTRUCTOR,
      tenantId: null,
      password: input.password,
      emailVerifiedAt: input.emailVerifiedAt,
      primaryAuthProvider: input.primaryAuthProvider
    });

    const tenant = await this.tenantsService.create({
      name: input.organizationName.trim(),
      ownerId: instructor.id
    });

    const updatedInstructor = await this.usersService.assignTenant(instructor.id, tenant.id);

    await this.notificationsService.create({
      userId: updatedInstructor.id,
      tenantId: updatedInstructor.tenantId,
      type: "WELCOME",
      title: "Instructor account ready",
      message: `Your instructor workspace for ${tenant.name} is ready.`,
      payload: { tenantId: tenant.id, role: updatedInstructor.role }
    });

    return updatedInstructor;
  }

  private async createStudentAccount(input: {
    email: string;
    fullName: string;
    password: string;
    inviteCode: string;
    emailVerifiedAt: Date | null;
    primaryAuthProvider: ExternalAuthProvider;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { inviteCode: input.inviteCode.trim().toUpperCase() },
      select: { id: true }
    });

    if (!tenant) {
      throw new BadRequestException("Invalid invite code");
    }

    await this.subscriptionsService.assertTenantCanAddStudent(tenant.id);

    const user = await this.usersService.create({
      email: input.email,
      fullName: input.fullName,
      role: UserRole.STUDENT,
      tenantId: null,
      password: input.password,
      emailVerifiedAt: input.emailVerifiedAt,
      primaryAuthProvider: input.primaryAuthProvider
    });

    await this.studentInstructorsService.createRelationFromInviteCode(
      user.id,
      input.inviteCode.trim().toUpperCase()
    );

    const updatedUser = await this.usersService.findById(user.id, null);

    if (!updatedUser) {
      throw new BadRequestException("Student account could not be loaded");
    }

    await this.notificationsService.create({
      userId: updatedUser.id,
      tenantId: updatedUser.tenantId,
      type: "WELCOME",
      title: "Student account ready",
      message: "Your student account was created successfully.",
      payload: { role: updatedUser.role }
    });

    return updatedUser;
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const fullName = dto.fullName?.trim() || normalizedEmail.split("@")[0];
    const role = dto.role ?? "STUDENT";

    if (role === "INSTRUCTOR") {
      if (!dto.organizationName) {
        throw new BadRequestException("organizationName is required for INSTRUCTOR registration");
      }

      const instructor = await this.createInstructorAccount({
        email: normalizedEmail,
        fullName,
        password: dto.password,
        organizationName: dto.organizationName,
        emailVerifiedAt: null,
        primaryAuthProvider: ExternalAuthProvider.LOCAL
      });

      await this.issueEmailVerification(instructor);

      return {
        requiresEmailVerification: true,
        email: instructor.email,
        message:
          "Your account was created. Please check your email and verify your account before logging in."
      };
    }

    if (role === "STUDENT") {
      if (!dto.inviteCode) {
        throw new BadRequestException("inviteCode is required for STUDENT registration");
      }

      const student = await this.createStudentAccount({
        email: normalizedEmail,
        fullName,
        password: dto.password,
        inviteCode: dto.inviteCode,
        emailVerifiedAt: null,
        primaryAuthProvider: ExternalAuthProvider.LOCAL
      });

      await this.issueEmailVerification(student);

      return {
        requiresEmailVerification: true,
        email: student.email,
        message:
          "Your account was created. Please check your email and verify your account before logging in."
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
      password: dto.password,
      emailVerifiedAt: new Date(),
      primaryAuthProvider: ExternalAuthProvider.LOCAL
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

    if (user.role !== UserRole.ADMIN && !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        "Please verify your email address before logging in."
      );
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

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(token.trim()) },
      include: { user: true }
    });

    if (
      !verification ||
      verification.consumedAt ||
      verification.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException("This verification link is invalid or expired.");
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { consumedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerifiedAt: verification.user.emailVerifiedAt ?? new Date() }
      })
    ]);

    return {
      message: "Your email address has been verified successfully."
    };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findAuthUserByEmail(normalizedEmail);

    if (user && user.isActive && (user.role === UserRole.ADMIN || user.emailVerifiedAt)) {
      await this.issuePasswordReset(user);
    }

    return {
      message:
        "If an account exists for that email, a password reset link has been sent."
    };
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token.trim()) },
      include: { user: true }
    });

    if (!resetToken || resetToken.consumedAt || resetToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("This password reset link is invalid or expired.");
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumedAt: new Date() }
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: await bcrypt.hash(password, 10)
        }
      })
    ]);

    return {
      message: "Your password has been updated successfully."
    };
  }

  async completeGoogleRegistration(dto: CompleteGoogleRegistrationDto) {
    const payload = await this.jwtService.verifyAsync<GoogleRegistrationPayload>(dto.token, {
      ignoreExpiration: false
    });

    if (payload.kind !== "google-registration") {
      throw new BadRequestException("Invalid Gmail registration session.");
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const existingUser = await this.usersService.findAuthUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException("An account already exists for this Gmail address. Please log in instead.");
    }

    let createdUser;

    if (dto.role === "INSTRUCTOR") {
      if (!dto.organizationName?.trim()) {
        throw new BadRequestException("Organization name is required for instructor registration.");
      }

      createdUser = await this.createInstructorAccount({
        email: normalizedEmail,
        fullName: payload.fullName,
        password: dto.password,
        organizationName: dto.organizationName.trim(),
        emailVerifiedAt: new Date(),
        primaryAuthProvider: ExternalAuthProvider.LOCAL
      });
    } else {
      if (!dto.inviteCode?.trim()) {
        throw new BadRequestException("Instructor invite code is required for student registration.");
      }

      createdUser = await this.createStudentAccount({
        email: normalizedEmail,
        fullName: payload.fullName,
        password: dto.password,
        inviteCode: dto.inviteCode.trim().toUpperCase(),
        emailVerifiedAt: new Date(),
        primaryAuthProvider: ExternalAuthProvider.LOCAL
      });
    }

    await this.prisma.externalAuthIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider: ExternalAuthProvider.GOOGLE,
          providerUserId: payload.providerUserId
        }
      },
      update: {
        userId: createdUser.id,
        email: normalizedEmail
      },
      create: {
        userId: createdUser.id,
        provider: ExternalAuthProvider.GOOGLE,
        providerUserId: payload.providerUserId,
        email: normalizedEmail
      }
    });

    const result = await this.signInResolvedUser(
      await this.usersService.findAuthUserByEmail(normalizedEmail)
    );

    return {
      ...result,
      message: "Your account was created successfully with Gmail."
    };
  }

  async getGoogleStartUrl(query: GoogleStartQuery) {
    const clientId = this.configService.get<string>("app.google.clientId") ?? "";
    if (!clientId) {
      throw new BadRequestException("Google sign-in is not configured.");
    }

    const state = await this.jwtService.signAsync(
      {
        kind: "google-oauth",
        intent: query.intent ?? "login",
        role: query.role,
        organizationName: query.organizationName?.trim(),
        inviteCode: query.inviteCode?.trim().toUpperCase()
      },
      {
        expiresIn: "10m"
      }
    );

    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", this.getGoogleRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("prompt", "select_account");
    url.searchParams.set("state", state);

    return url.toString();
  }

  async buildGoogleCallbackRedirect(code: string, stateToken: string) {
    try {
      const state = await this.jwtService.verifyAsync<{
        kind: string;
        intent: "login" | "register";
        role?: "INSTRUCTOR" | "STUDENT";
        organizationName?: string;
        inviteCode?: string;
      }>(stateToken);

      if (state.kind !== "google-oauth") {
        throw new Error("Invalid OAuth state.");
      }

      const googleUser = await this.fetchGoogleUser(code);

      if (!googleUser.email_verified) {
        throw new Error("Google did not return a verified email address.");
      }

      const user = await this.findGoogleUser(googleUser);
      if (!user) {
        return this.buildGoogleCompletionRedirect(googleUser);
      }

      const result = await this.signInResolvedUser(user);
      if (!result.user) {
        throw new Error("Google account could not be loaded after sign-in.");
      }

      return this.buildWebUrl("/auth/google/callback", {
        accessToken: result.accessToken,
        nextPath:
          result.user.role === "INSTRUCTOR"
            ? "/subscription"
            : result.user.mustChangePassword && result.user.role === "ADMIN"
              ? "/admin/change-password"
              : "/dashboard"
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed. Please try again.";
      return this.buildWebUrl("/auth/google/callback", { error: message });
    }
  }

  private async fetchGoogleUser(code: string): Promise<GoogleUserInfo> {
    const clientId = this.configService.get<string>("app.google.clientId") ?? "";
    const clientSecret = this.configService.get<string>("app.google.clientSecret") ?? "";

    if (!clientId || !clientSecret) {
      throw new BadRequestException("Google sign-in is not configured.");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.getGoogleRedirectUri(),
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      throw new Error("Google token exchange failed.");
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw new Error("Google did not return an access token.");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`
      }
    });

    if (!profileResponse.ok) {
      throw new Error("Failed to load Google profile.");
    }

    return (await profileResponse.json()) as GoogleUserInfo;
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
