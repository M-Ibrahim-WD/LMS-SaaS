import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { BillingPeriod } from "@prisma/client";

export class SelectPlanDto {
  @IsString()
  planId!: string;
}

export class AdminUpsertSubscriptionDto {
  @IsString()
  planId!: string;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isTrial?: boolean;

  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class AdminUpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  markCanceled?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  restartTrial?: boolean;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
