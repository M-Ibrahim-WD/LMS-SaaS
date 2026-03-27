import { Type } from "class-transformer";
import { IsBoolean, IsBooleanString, IsIn, IsOptional, IsString } from "class-validator";

export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["ADMIN", "INSTRUCTOR", "STUDENT"])
  role?: "ADMIN" | "INSTRUCTOR" | "STUDENT";

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

export class AdminTenantsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}

export class AdminCoursesQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsOptional()
  @IsIn(["DRAFT", "PUBLISHED"])
  status?: "DRAFT" | "PUBLISHED";

  @IsOptional()
  @IsString()
  search?: string;
}

export class AdminPaymentsQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsOptional()
  @IsIn(["PENDING", "APPROVED", "REJECTED"])
  status?: "PENDING" | "APPROVED" | "REJECTED";
}

export class UpdateAdminStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive!: boolean;
}
