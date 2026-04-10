import { Module } from "@nestjs/common";
import { EnrollmentsController } from "./controllers/enrollments.controller";
import { EnrollmentsService } from "./services/enrollments.service";
import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [CoursesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService]
})
export class EnrollmentsModule {}
