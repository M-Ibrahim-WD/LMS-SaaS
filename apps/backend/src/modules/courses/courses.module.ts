import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CoursesController, CoursesPublicController } from "./controllers/courses.controller";
import { CourseProgressService } from "./services/course-progress.service";
import { CourseThumbnailStorageService } from "./services/course-thumbnail-storage.service";
import { CoursesService } from "./services/courses.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [CoursesController, CoursesPublicController],
  providers: [CoursesService, CourseThumbnailStorageService, CourseProgressService],
  exports: [CoursesService]
})
export class CoursesModule {}
