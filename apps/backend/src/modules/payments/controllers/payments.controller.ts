import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { PaymentsService } from "../services/payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles("STUDENT")
  @Post()
  @UseInterceptors(
    FileInterceptor("proof", {
      limits: {
        fileSize: 5 * 1024 * 1024
      }
    })
  )
  create(
    @CurrentUser() user: JwtPayload,
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname?: string;
          mimetype?: string;
          size?: number;
        }
      | undefined,
    @Body() rawBody: Record<string, unknown>
  ) {
    if (!file) {
      throw new BadRequestException("Proof required");
    }

    const courseIdRaw = rawBody?.courseId ?? rawBody?.course_id;
    const methodIdRaw = rawBody?.methodId ?? rawBody?.method_id;
    const courseId = typeof courseIdRaw === "string" ? courseIdRaw.trim() : "";
    const methodId = typeof methodIdRaw === "string" ? methodIdRaw.trim() : "";

    if (!courseId) {
      throw new BadRequestException("courseId is required");
    }

    if (!methodId) {
      throw new BadRequestException("methodId is required");
    }

    if (courseId.length > 191 || methodId.length > 191) {
      throw new BadRequestException("Invalid payment input");
    }

    const dto: CreatePaymentDto = {
      courseId,
      methodId
    };

    return this.paymentsService.create(user, dto, file);
  }

  @Roles("STUDENT")
  @Get("my")
  my(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.my(user);
  }

  @Roles("INSTRUCTOR")
  @Get("instructor")
  instructor(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.instructor(user);
  }

  @Roles("INSTRUCTOR")
  @Patch(":id/approve")
  approve(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.paymentsService.approve(user, id);
  }

  @Roles("INSTRUCTOR")
  @Patch(":id/reject")
  reject(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.paymentsService.reject(user, id);
  }

  @Roles("STUDENT", "INSTRUCTOR", "ADMIN")
  @Get(":id/proof")
  async proof(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query("download") download: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const payload = await this.paymentsService.proofFile(user, id);
    const asDownload = String(download).toLowerCase() === "true";
    const safeFileName = (payload.fileName || "proof.bin").replace(/"/g, "");

    res.setHeader("Content-Type", payload.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `${asDownload ? "attachment" : "inline"}; filename="${safeFileName}"`
    );
    res.setHeader("Cache-Control", "private, max-age=60");

    return new StreamableFile(payload.buffer);
  }
}
