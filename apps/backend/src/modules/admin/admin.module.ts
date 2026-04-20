import { Module } from "@nestjs/common";
import { AdminController } from "./controllers/admin.controller";
import { AdminService } from "./services/admin.service";
import { AdminAccessService } from "./services/admin-access.service";
import { AdminAuditService } from "./services/admin-audit.service";
import { PlansModule } from "../plans/plans.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CoursesModule } from "../courses/courses.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule, PlansModule, SubscriptionsModule, CoursesModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAccessService, AdminAuditService],
  exports: [AdminAccessService, AdminAuditService]
})
export class AdminModule {}
