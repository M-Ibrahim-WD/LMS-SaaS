import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class UpdateGroupConversationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  studentIds?: string[];
}
