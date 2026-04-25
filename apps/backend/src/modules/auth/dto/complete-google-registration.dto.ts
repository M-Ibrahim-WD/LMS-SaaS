import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CompleteGoogleRegistrationDto {
  @IsString()
  token!: string;

  @IsIn(["INSTRUCTOR", "STUDENT"])
  role!: "INSTRUCTOR" | "STUDENT";

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
