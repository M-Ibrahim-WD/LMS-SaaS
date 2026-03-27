import { Controller, Get, Param } from "@nestjs/common";
import { CertificatesService } from "../services/certificates.service";

@Controller("certificate-verification")
export class CertificatesPublicController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get(":certificateNumber")
  verifyCertificate(@Param("certificateNumber") certificateNumber: string) {
    return this.certificatesService.verifyCertificate(certificateNumber);
  }
}
