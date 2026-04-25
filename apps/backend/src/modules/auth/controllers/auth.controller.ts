import { Body, Controller, Get, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { LoginDto } from "../dto/login.dto";
import { RegisterDto } from "../dto/register.dto";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { VerifyEmailDto } from "../dto/verify-email.dto";
import { RequestPasswordResetDto } from "../dto/request-password-reset.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("forgot-password")
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Get("google/start")
  async startGoogleAuth(
    @Query("intent") intent: "login" | "register" | undefined,
    @Query("role") role: "INSTRUCTOR" | "STUDENT" | undefined,
    @Query("organizationName") organizationName: string | undefined,
    @Query("inviteCode") inviteCode: string | undefined,
    @Res() response: Response
  ) {
    const redirectUrl = await this.authService.getGoogleStartUrl({
      intent,
      role,
      organizationName,
      inviteCode
    });

    response.redirect(redirectUrl);
  }

  @Get("google/callback")
  async handleGoogleCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: Response
  ) {
    if (!code || !state) {
      response.redirect(
        this.authService.getGoogleCallbackErrorRedirect("Missing Google callback data")
      );
      return;
    }

    const redirectUrl = await this.authService.buildGoogleCallbackRedirect(code, state);
    response.redirect(redirectUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("change-password")
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto);
  }
}
