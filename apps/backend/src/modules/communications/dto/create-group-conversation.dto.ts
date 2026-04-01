import { ConversationGroupScope } from "@prisma/client";
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateGroupConversationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  @IsEnum(ConversationGroupScope)
  scopeType!: ConversationGroupScope;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("4", { each: true })
  studentIds?: string[];
}
