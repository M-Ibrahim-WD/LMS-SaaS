import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CoursesController, CoursesPublicController } from "./controllers/courses.controller";
import { CourseInterviewsService } from "./services/course-interviews.service";
import { CourseProgressService } from "./services/course-progress.service";
import { CourseThumbnailStorageService } from "./services/course-thumbnail-storage.service";
import { CoursesService } from "./services/courses.service";

@Module({
  imports: [SubscriptionsModule, NotificationsModule],
  controllers: [CoursesController, CoursesPublicController],
  providers: [
    CoursesService,
    CourseThumbnailStorageService,
    CourseProgressService,
    CourseInterviewsService
  ],
  exports: [CoursesService]
})
export class CoursesModule {}
