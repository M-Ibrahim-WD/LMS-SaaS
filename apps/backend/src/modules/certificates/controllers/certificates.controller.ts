import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CertificatesService } from "../services/certificates.service";

@Controller("certificates")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
@Roles("STUDENT")
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get("my")
  myCertificates(@CurrentUser() user: JwtPayload) {
    return this.certificatesService.myCertificates(user);
  }

  @Get("courses/:courseId/status")
  getCourseCompletion(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.certificatesService.getCourseCompletion(user, courseId);
  }

  @Post("courses/:courseId/issue")
  issueForCourse(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.certificatesService.issueForCourse(user, courseId);
  }

  @Get(":id")
  getCertificate(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.certificatesService.getCertificate(user, id);
  }
}
