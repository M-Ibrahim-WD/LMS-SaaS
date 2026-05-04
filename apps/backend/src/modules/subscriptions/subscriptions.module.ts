import { Module } from "@nestjs/common";
import { SubscriptionWebhooksController, SubscriptionsController } from "./controllers/subscriptions.controller";
import {
  PayMobSubscriptionGatewayService,
  PayoneerSubscriptionGatewayService,
  PayPalSubscriptionGatewayService,
  PayTabsSubscriptionGatewayService,
  StripeSubscriptionGatewayService
} from "./services/subscription-gateway.services";
import { SubscriptionPolicyService } from "./services/subscription-policy.service";
import { SubscriptionsService } from "./services/subscriptions.service";
import { PlansModule } from "../plans/plans.module";

@Module({
  imports: [PlansModule],
  controllers: [SubscriptionsController, SubscriptionWebhooksController],
  providers: [
    SubscriptionsService,
    SubscriptionPolicyService,
    StripeSubscriptionGatewayService,
    PayPalSubscriptionGatewayService,
    PayMobSubscriptionGatewayService,
    PayTabsSubscriptionGatewayService,
    PayoneerSubscriptionGatewayService
  ],
  exports: [SubscriptionsService]
})
export class SubscriptionsModule {}
