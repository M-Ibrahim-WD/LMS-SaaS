import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { LessonsController } from "./controllers/lessons.controller";
import { LessonsService } from "./services/lessons.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService]
})
export class LessonsModule {}
