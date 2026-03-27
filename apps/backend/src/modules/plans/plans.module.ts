import { Module } from "@nestjs/common";
import { PlansService } from "./services/plans.service";

@Module({
  providers: [PlansService],
  exports: [PlansService]
})
export class PlansModule {}
