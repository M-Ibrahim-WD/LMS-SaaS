import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { StudentInstructorsController } from "./controllers/student-instructors.controller";
import { StudentInstructorsService } from "./services/student-instructors.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [StudentInstructorsController],
  providers: [StudentInstructorsService],
  exports: [StudentInstructorsService]
})
export class StudentInstructorsModule {}
