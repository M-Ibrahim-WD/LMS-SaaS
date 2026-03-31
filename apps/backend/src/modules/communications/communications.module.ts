import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AdminModule } from "../admin/admin.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CommunicationsController } from "./communications.controller";
import { CommunicationsGateway } from "./communications.gateway";
import { CommunicationEventsService } from "./services/communication-events.service";
import { CommunicationsService } from "./services/communications.service";

@Module({
  imports: [AdminModule, NotificationsModule, JwtModule.register({})],
  controllers: [CommunicationsController],
  providers: [CommunicationEventsService, CommunicationsGateway, CommunicationsService]
})
export class CommunicationsModule {}
