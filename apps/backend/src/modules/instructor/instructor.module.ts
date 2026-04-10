import { Module } from "@nestjs/common";
import { InstructorController } from "./controllers/instructor.controller";
import { InstructorService } from "./services/instructor.service";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersModule } from "../users/users.module";
import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [UsersModule, SubscriptionsModule, CoursesModule],
  controllers: [InstructorController],
  providers: [InstructorService]
})
export class InstructorModule {}
