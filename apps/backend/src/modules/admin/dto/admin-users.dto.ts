import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { ADMIN_PERMISSION_VALUES, type AdminPermissionValue } from "../../../shared/auth/admin-permissions";

export const ADMIN_AUDIT_CATEGORIES = ["ADMINS", "PLANS", "TENANTS", "USERS", "ALL"] as const;
export type AdminAuditCategory = (typeof ADMIN_AUDIT_CATEGORIES)[number];

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  fullName!: string;

  @IsArray()
  permissions!: AdminPermissionValue[];
}

export class UpdateAdminPermissionsDto {
  @IsArray()
  permissions!: AdminPermissionValue[];
}

export class AdminUsersListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class ResetAdminPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class AdminAuditLogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsIn(ADMIN_AUDIT_CATEGORIES)
  category?: AdminAuditCategory;
}

export const ADMIN_PERMISSION_OPTIONS = ADMIN_PERMISSION_VALUES;
