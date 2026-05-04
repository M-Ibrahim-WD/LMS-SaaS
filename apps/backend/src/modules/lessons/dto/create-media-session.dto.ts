import { IsOptional, IsString } from "class-validator";

export class CreateMediaSessionDto {
  @IsOptional()
  @IsString()
  deviceLabel?: string;

  @IsOptional()
  @IsString()
  token?: string;
}
