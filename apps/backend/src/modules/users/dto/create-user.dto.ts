import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  fullName!: string;

  @IsIn(["ADMIN", "INSTRUCTOR", "STUDENT"])
  role!: UserRole;
}
