import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { UserRole } from "../../../shared/types/auth.types";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsIn(["ADMIN", "INSTRUCTOR", "STUDENT"])
  role?: UserRole;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
