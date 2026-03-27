import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { UsersPublicController } from "./controllers/users-public.controller";
import { UsersController } from "./controllers/users.controller";
import { UsersService } from "./services/users.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [UsersController, UsersPublicController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
