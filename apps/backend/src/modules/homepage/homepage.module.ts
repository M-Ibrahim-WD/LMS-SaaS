import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
import { HomepageAdminController } from "./homepage.admin.controller";
import { HomepagePublicController } from "./homepage.public.controller";
import { HomepageService } from "./homepage.service";

@Module({
  imports: [AdminModule],
  controllers: [HomepageAdminController, HomepagePublicController],
  providers: [HomepageService],
  exports: [HomepageService]
})
export class HomepageModule {}
