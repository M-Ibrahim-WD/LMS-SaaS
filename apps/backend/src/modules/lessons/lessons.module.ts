import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import {
  LessonsAccessController,
  LessonsController,
  LessonsPublicController
} from "./controllers/lessons.controller";
import { LessonMediaStorageService } from "./services/lesson-media-storage.service";
import { LessonsService } from "./services/lessons.service";
import { PdfPageRendererService } from "./services/pdf-page-renderer.service";

@Module({
  imports: [SubscriptionsModule, NotificationsModule],
  controllers: [LessonsController, LessonsAccessController, LessonsPublicController],
  providers: [LessonsService, LessonMediaStorageService, PdfPageRendererService],
  exports: [LessonsService]
})
export class LessonsModule {}
