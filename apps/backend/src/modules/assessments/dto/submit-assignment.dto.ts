import { IsString, MinLength } from "class-validator";

export class SubmitAssignmentDto {
  @IsString()
  @MinLength(3)
  content!: string;
}
