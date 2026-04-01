import { InterviewProvider } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator";

export class CreateCourseInterviewDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(InterviewProvider)
  provider!: InterviewProvider;

  @IsUrl({
    require_protocol: true
  })
  meetingUrl!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}
