import { IsOptional, IsString } from "class-validator";

export class JoinTenantDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

