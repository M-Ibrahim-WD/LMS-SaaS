import { Module } from "@nestjs/common";
import { AdminController } from "./controllers/admin.controller";
import { AdminService } from "./services/admin.service";
import { PlansModule } from "../plans/plans.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, PlansModule, SubscriptionsModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
