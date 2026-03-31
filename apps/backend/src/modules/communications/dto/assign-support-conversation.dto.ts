import { IsUUID } from "class-validator";

export class AssignSupportConversationDto {
  @IsUUID()
  adminUserId!: string;
}
