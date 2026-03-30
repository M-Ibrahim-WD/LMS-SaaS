import { Module } from "@nestjs/common";
import { SubscriptionsController } from "./controllers/subscriptions.controller";
import { SubscriptionPolicyService } from "./services/subscription-policy.service";
import { SubscriptionsService } from "./services/subscriptions.service";
import { PlansModule } from "../plans/plans.module";

@Module({
  imports: [PlansModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionPolicyService],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
