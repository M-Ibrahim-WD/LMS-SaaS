import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
