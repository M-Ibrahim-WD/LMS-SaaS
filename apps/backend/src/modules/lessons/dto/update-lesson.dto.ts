import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { LessonType } from "@prisma/client";

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(["VIDEO", "TEXT", "FILE"])
  type?: LessonType;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
