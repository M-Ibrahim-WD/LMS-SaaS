import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSupportConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}
