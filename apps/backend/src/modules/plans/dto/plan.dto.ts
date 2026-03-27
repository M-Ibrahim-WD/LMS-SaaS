import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

class PlanPermissionFields {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxCourses!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSectionsPerCourse!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxLessonsPerSection!: number;

  @Type(() => Boolean)
  @IsBoolean()
  canPublishCourses!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canCreatePaidCourses!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStudentsTotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStudentsPerCourse!: number;

  @Type(() => Boolean)
  @IsBoolean()
  canUseQuizzes!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canUseAssignments!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canIssueCertificates!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canUseAnalytics!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canUseReviews!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxStorageMb!: number;

  @Type(() => Boolean)
  @IsBoolean()
  canUploadThumbnails!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canUploadProfileImage!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  canUseManualPayments!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  hasAdvancedAnalytics!: boolean;

  @Type(() => Boolean)
  @IsBoolean()
  hasOnlinePayments!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAdminUsers!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxInstructorUsers!: number;
}

export class CreatePlanDto extends PlanPermissionFields {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  monthlyPrice!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearlyPrice!: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyPrice?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxCourses?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxSectionsPerCourse?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLessonsPerSection?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canPublishCourses?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canCreatePaidCourses?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudentsTotal?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudentsPerCourse?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUseQuizzes?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUseAssignments?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canIssueCertificates?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUseAnalytics?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUseReviews?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStorageMb?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUploadThumbnails?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUploadProfileImage?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  canUseManualPayments?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  hasAdvancedAnalytics?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  hasOnlinePayments?: boolean;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAdminUsers?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  maxInstructorUsers?: number;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
