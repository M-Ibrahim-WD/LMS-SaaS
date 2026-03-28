import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateAssignmentDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}
