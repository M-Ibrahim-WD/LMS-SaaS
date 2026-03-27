import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateAssignmentDto {
  @IsString()
  courseId!: string;

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
