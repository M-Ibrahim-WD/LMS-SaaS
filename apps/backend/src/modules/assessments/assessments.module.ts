import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { AssessmentsController } from "./controllers/assessments.controller";
import { AssessmentAuthoringService } from "./services/assessment-authoring.service";
import { AssessmentsService } from "./services/assessments.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AssessmentAuthoringService],
  exports: [AssessmentsService]
})
export class AssessmentsModule {}
