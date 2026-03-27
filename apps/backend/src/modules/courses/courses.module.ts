import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CoursesController, CoursesPublicController } from "./controllers/courses.controller";
import { CoursesService } from "./services/courses.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [CoursesController, CoursesPublicController],
  providers: [CoursesService],
  exports: [CoursesService]
})
export class CoursesModule {}
