import { IsIn } from "class-validator";
import { CourseStatus } from "@prisma/client";

export class UpdateCourseStatusDto {
  @IsIn(["DRAFT", "PUBLISHED"])
  status!: CourseStatus;
}

