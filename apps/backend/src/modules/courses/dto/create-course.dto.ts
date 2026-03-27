import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf
} from "class-validator";
import { CourseLevel } from "@prisma/client";

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  category?: string;

  @IsOptional()
  @IsEnum(CourseLevel)
  level?: CourseLevel;

  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ValidateIf((obj: CreateCourseDto) => Boolean(obj.isPaid))
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  price?: number;
}
