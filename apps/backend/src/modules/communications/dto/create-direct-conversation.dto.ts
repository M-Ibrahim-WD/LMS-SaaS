import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateDirectConversationDto {
  @IsUUID()
  targetUserId!: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;
}
