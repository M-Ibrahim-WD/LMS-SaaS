import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class LogProtectedContentEventDto {
  @IsIn([
    "MEDIA_SESSION_ENDED",
    "TAB_HIDDEN",
    "FULLSCREEN_EXITED",
    "PRINT_ATTEMPT",
    "COPY_ATTEMPT",
    "CONTEXT_MENU_ATTEMPT"
  ])
  eventType!:
    | "MEDIA_SESSION_ENDED"
    | "TAB_HIDDEN"
    | "FULLSCREEN_EXITED"
    | "PRINT_ATTEMPT"
    | "COPY_ATTEMPT"
    | "CONTEXT_MENU_ATTEMPT";

  @IsOptional()
  @IsString()
  mediaSessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
