import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class ReviewCourseDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  report!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  stopCourse?: boolean;
}
