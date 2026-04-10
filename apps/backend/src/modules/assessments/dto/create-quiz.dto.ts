import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested
} from "class-validator";

class CreateQuizQuestionDto {
  @IsString()
  @MinLength(5)
  question!: string;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options!: string[];

  @IsString()
  @MinLength(1)
  correctAnswer!: string;
}

export class CreateQuizDto {
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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions!: CreateQuizQuestionDto[];
}

export { CreateQuizQuestionDto };
