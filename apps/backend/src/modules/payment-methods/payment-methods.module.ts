import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { PaymentMethodsController } from "./controllers/payment-methods.controller";
import { PaymentMethodsService } from "./services/payment-methods.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService]
})
export class PaymentMethodsModule {}
