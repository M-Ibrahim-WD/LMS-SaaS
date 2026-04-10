import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import { LessonType } from "@prisma/client";

export class CreateLessonDto {
  @IsString()
  sectionId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(["VIDEO", "TEXT", "FILE"])
  type!: LessonType;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
