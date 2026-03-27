import { Module } from "@nestjs/common";
import { PaymentMethodsModule } from "../payment-methods/payment-methods.module";
import { PaymentsController } from "./controllers/payments.controller";
import { PaymentsService } from "./services/payments.service";

@Module({
  imports: [PaymentMethodsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
