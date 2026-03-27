import { IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

export class CreateSectionDto {
  @IsString()
  courseId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

