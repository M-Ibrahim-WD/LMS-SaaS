import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateAssignmentDto {
  @IsString()
  courseId!: string;

  @IsIn(["LESSON", "SECTION", "COURSE"])
  scopeType!: "LESSON" | "SECTION" | "COURSE";

  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

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
