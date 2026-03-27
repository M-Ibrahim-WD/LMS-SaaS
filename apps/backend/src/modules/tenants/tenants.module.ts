import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { StudentInstructorsModule } from "../student-instructors/student-instructors.module";
import { TenantsController } from "./controllers/tenants.controller";
import { TenantsService } from "./services/tenants.service";

@Module({
  imports: [
    StudentInstructorsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("app.jwtSecret"),
        signOptions: { expiresIn: config.get<string>("app.jwtExpiresIn") ?? "1d" }
      })
    })
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService]
})
export class TenantsModule {}
