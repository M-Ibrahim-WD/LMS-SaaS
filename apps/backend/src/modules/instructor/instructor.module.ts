import { Module } from "@nestjs/common";
import { InstructorController } from "./controllers/instructor.controller";
import { InstructorService } from "./services/instructor.service";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, SubscriptionsModule],
  controllers: [InstructorController],
  providers: [InstructorService]
})
export class InstructorModule {}
