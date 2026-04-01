import { InterviewProvider } from "@prisma/client";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min, MinLength } from "class-validator";

export class UpdateCourseInterviewDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(InterviewProvider)
  provider?: InterviewProvider;

  @IsOptional()
  @IsUrl({
    require_protocol: true
  })
  meetingUrl?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}
