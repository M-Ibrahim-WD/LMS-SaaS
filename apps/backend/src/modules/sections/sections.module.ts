import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { SectionsController } from "./controllers/sections.controller";
import { SectionsService } from "./services/sections.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService]
})
export class SectionsModule {}
