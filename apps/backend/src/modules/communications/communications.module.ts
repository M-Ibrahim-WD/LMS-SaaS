import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AdminModule } from "../admin/admin.module";
import { CoursesModule } from "../courses/courses.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";
import { CommunicationsController, CommunicationsPublicController } from "./communications.controller";
import { CommunicationsGateway } from "./communications.gateway";
import { CommunicationEventsService } from "./services/communication-events.service";
import { ConversationGroupImageStorageService } from "./services/conversation-group-image-storage.service";
import { CommunicationsService } from "./services/communications.service";

@Module({
  imports: [AdminModule, NotificationsModule, UsersModule, CoursesModule, JwtModule.register({})],
  controllers: [CommunicationsController, CommunicationsPublicController],
  providers: [
    CommunicationEventsService,
    CommunicationsGateway,
    CommunicationsService,
    ConversationGroupImageStorageService
  ]
})
export class CommunicationsModule {}
