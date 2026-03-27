import { Module } from "@nestjs/common";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { CertificatesController } from "./controllers/certificates.controller";
import { CertificatesPublicController } from "./controllers/certificates-public.controller";
import { CertificatesService } from "./services/certificates.service";

@Module({
  imports: [SubscriptionsModule],
  controllers: [CertificatesController, CertificatesPublicController],
  providers: [CertificatesService],
  exports: [CertificatesService]
})
export class CertificatesModule {}
