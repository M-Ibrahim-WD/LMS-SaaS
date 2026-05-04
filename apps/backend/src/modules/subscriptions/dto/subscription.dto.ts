import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsIn, IsObject, IsOptional, IsString } from "class-validator";
import { BillingPeriod, PlatformPaymentMethodType, SubscriptionPaymentProvider } from "@prisma/client";

export class SelectPlanDto {
  @IsString()
  planId!: string;

  @IsOptional()
  @IsEnum(BillingPeriod)
  billingPeriod?: BillingPeriod;
}

export class CreateSubscriptionPaymentDto {
  @IsString()
  planId!: string;

  @IsString()
  platformPaymentMethodId!: string;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;

  @IsOptional()
  @IsEnum(SubscriptionPaymentProvider)
  provider?: SubscriptionPaymentProvider;
}

export class CreateManualSubscriptionPaymentDto {
  @IsString()
  planId!: string;

  @IsString()
  platformPaymentMethodId!: string;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;
}

export class CreateOnlineSubscriptionPaymentDto {
  @IsString()
  planId!: string;

  @IsString()
  platformPaymentMethodId!: string;

  @IsEnum(BillingPeriod)
  billingPeriod!: BillingPeriod;
}

export class ReviewSubscriptionPaymentDto {
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class UpsertPlatformPaymentMethodDto {
  @IsEnum(PlatformPaymentMethodType)
  type!: PlatformPaymentMethodType;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isConfigured?: boolean;
}

export class UpsertManualPlatformPaymentMethodDto {
  @IsEnum(PlatformPaymentMethodType)
  type!: PlatformPaymentMethodType;

  @IsString()
  label!: string;

  @IsString()
  details!: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertStripePlatformPaymentMethodDto {
  @IsString()
  label!: string;

  @IsString()
  secretKey!: string;

  @IsString()
  webhookSecret!: string;

  @IsString()
  currency!: string;

  @IsString()
  successUrl!: string;

  @IsString()
  cancelUrl!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertPayPalPlatformPaymentMethodDto {
  @IsString()
  label!: string;

  @IsString()
  clientId!: string;

  @IsString()
  clientSecret!: string;

  @IsIn(["SANDBOX", "LIVE"])
  environment!: "SANDBOX" | "LIVE";

  @IsString()
  currency!: string;

  @IsString()
  returnUrl!: string;

  @IsString()
  cancelUrl!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertPayMobPlatformPaymentMethodDto {
  @IsString()
  label!: string;

  @IsString()
  secretKey!: string;

  @IsString()
  publicKey!: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsString()
  integrationId!: string;

  @IsOptional()
  @IsString()
  iframeId?: string;

  @IsString()
  hmacSecret!: string;

  @IsString()
  currency!: string;

  @IsString()
  callbackUrl!: string;

  @IsString()
  redirectUrl!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertPayTabsPlatformPaymentMethodDto {
  @IsString()
  label!: string;

  @IsString()
  profileId!: string;

  @IsString()
  serverKey!: string;

  @IsString()
  endpointUrl!: string;

  @IsString()
  currency!: string;

  @IsString()
  returnUrl!: string;

  @IsString()
  callbackUrl!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertPayoneerPlatformPaymentMethodDto {
  @IsString()
  label!: string;

  @IsString()
  apiBaseUrl!: string;

  @IsString()
  merchantId!: string;

  @IsString()
  programId!: string;

  @IsString()
  apiToken!: string;

  @IsString()
  currency!: string;

  @IsString()
  returnUrl!: string;

  @IsString()
  callbackUrl!: string;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
