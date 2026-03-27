import { IsString, MinLength } from "class-validator";

export class JoinStudentInstructorDto {
  @IsString()
  @MinLength(3)
  inviteCode!: string;
}
