import { InterviewSessionStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateCourseInterviewStatusDto {
  @IsEnum(InterviewSessionStatus)
  status!: InterviewSessionStatus;
}
