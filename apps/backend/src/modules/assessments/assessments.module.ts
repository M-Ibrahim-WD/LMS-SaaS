import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AssessmentsController } from "./controllers/assessments.controller";
import { AssessmentsService } from "./services/assessments.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService]
})
export class AssessmentsModule {}
