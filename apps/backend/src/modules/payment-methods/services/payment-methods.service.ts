import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  PaymentMethodCategory,
  PaymentMethodType,
  Prisma,
  type PaymentMethod
} from "@prisma/client";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreatePaymentMethodDto } from "../dto/create-payment-method.dto";

const MANUAL_TYPES = new Set<PaymentMethodType>([
  PaymentMethodType.INSTAPAY,
  PaymentMethodType.VODAFONE_CASH,
  PaymentMethodType.ORANGE_CASH,
  PaymentMethodType.ETISALAT_CASH,
  PaymentMethodType.WE_CASH,
  PaymentMethodType.FAWRY,
  PaymentMethodType.BANK,
  PaymentMethodType.CUSTOM
]);

const EWALLET_RULES: Partial<Record<PaymentMethodType, { prefix: string; maxLength: number; label: string }>> = {
  [PaymentMethodType.VODAFONE_CASH]: {
    prefix: "010",
    maxLength: 12,
    label: "VODAFONE_CASH"
  },
  [PaymentMethodType.ORANGE_CASH]: {
    prefix: "012",
    maxLength: 12,
    label: "ORANGE_CASH"
  },
  [PaymentMethodType.ETISALAT_CASH]: {
    prefix: "011",
    maxLength: 12,
    label: "ETISALAT_CASH"
  },
  [PaymentMethodType.WE_CASH]: {
    prefix: "015",
    maxLength: 11,
    label: "WE_CASH"
  }
};

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async create(user: JwtPayload, dto: CreatePaymentMethodDto) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can create payment methods");
    }

    if (!user.tenantId) {
      throw new BadRequestException("Instructor must belong to a tenant");
    }

    await this.subscriptionsService.assertPermission(user, "canUseManualPayments");

    const category = this.resolveCategory(dto.type);
    const details = this.normalizeAndValidateDetails(dto.type, category, dto.details);

    const existingMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        instructorId: user.sub,
        tenantId: user.tenantId,
        type: dto.type,
        details,
        isDeleted: false
      },
      select: {
        id: true
      }
    });

    if (existingMethod) {
      throw new BadRequestException("This payment account already exists for this method");
    }

    try {
      return await this.prisma.paymentMethod.create({
        data: {
          instructorId: user.sub,
          tenantId: user.tenantId,
          type: dto.type,
          category,
          label: dto.label.trim(),
          details,
          isActive: dto.isActive ?? true,
          isDeleted: false,
          deletedAt: null
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new BadRequestException("This payment account already exists for this method");
      }

      throw error;
    }
  }

  myMethods(user: JwtPayload) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can access this endpoint");
    }

    if (!user.tenantId) {
      return [];
    }

    return this.prisma.paymentMethod.findMany({
      where: {
        instructorId: user.sub,
        tenantId: user.tenantId,
        isDeleted: false
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async softDelete(user: JwtPayload, id: string) {
    if (user.role !== "INSTRUCTOR") {
      throw new ForbiddenException("Only instructors can delete payment methods");
    }

    if (!user.tenantId) {
      throw new BadRequestException("Instructor must belong to a tenant");
    }

    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        isDeleted: false
      },
      select: {
        id: true,
        instructorId: true
      }
    });

    if (!method) {
      throw new NotFoundException("Payment method not found");
    }

    if (method.instructorId !== user.sub) {
      throw new ForbiddenException("You are not allowed to delete this payment method");
    }

    return this.prisma.paymentMethod.update({
      where: { id: method.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    });
  }

  async methodsForCourse(user: JwtPayload, courseId: string) {
    const course =
      user.role === "STUDENT"
        ? await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, courseId, {
            id: true,
            tenantId: true,
            instructorId: true
          })
        : await this.prisma.course.findFirst({
            where: {
              id: courseId,
              ...(user.tenantId ? { tenantId: user.tenantId } : { id: "__missing__" })
            },
            select: {
              id: true,
              tenantId: true,
              instructorId: true
            }
          });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return this.prisma.paymentMethod.findMany({
      where: {
        tenantId: course.tenantId,
        instructorId: course.instructorId,
        isActive: true,
        isDeleted: false
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async ensureManualMethodForCourse(
    tenantId: string,
    courseId: string,
    methodId: string
  ): Promise<PaymentMethod> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, tenantId },
      select: { instructorId: true }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const method = await this.prisma.paymentMethod.findFirst({
      where: {
        id: methodId,
        tenantId,
        instructorId: course.instructorId,
        isActive: true,
        isDeleted: false
      }
    });

    if (!method) {
      throw new NotFoundException("Payment method not found");
    }

    if (method.category === PaymentMethodCategory.ONLINE) {
      throw new BadRequestException("Not supported yet");
    }

    return method;
  }

  private resolveCategory(type: PaymentMethodType): PaymentMethodCategory {
    return MANUAL_TYPES.has(type) ? PaymentMethodCategory.MANUAL : PaymentMethodCategory.ONLINE;
  }

  private normalizeAndValidateDetails(
    type: PaymentMethodType,
    category: PaymentMethodCategory,
    detailsInput: string | undefined
  ) {
    const details = (detailsInput ?? "").trim();

    if (category === PaymentMethodCategory.ONLINE) {
      return details;
    }

    if (!details) {
      throw new BadRequestException("details is required for manual methods");
    }

    const instapayPhoneRegex = /^01[012]\d{8}$/;
    const instapayUsernameRegex = /^[a-z0-9._-]+@instapay$/i;

    switch (type) {
      case PaymentMethodType.INSTAPAY:
        if (!instapayPhoneRegex.test(details) && !instapayUsernameRegex.test(details)) {
          throw new BadRequestException(
            "INSTAPAY must be a phone number starting with 010, 011, or 012, or a username ending with @instapay"
          );
        }
        break;
      case PaymentMethodType.VODAFONE_CASH:
      case PaymentMethodType.ORANGE_CASH:
      case PaymentMethodType.ETISALAT_CASH:
      case PaymentMethodType.WE_CASH: {
        const rule = EWALLET_RULES[type];
        if (!rule) {
          throw new BadRequestException("Unsupported wallet type");
        }

        if (type === PaymentMethodType.WE_CASH) {
          if (!/^015\d{8}$/.test(details)) {
            throw new BadRequestException("Invalid WE Cash number");
          }
          break;
        }

        const isValidWallet =
          /^\d+$/.test(details) &&
          details.startsWith(rule.prefix) &&
          details.length >= 11 &&
          details.length <= rule.maxLength;

        if (!isValidWallet) {
          throw new BadRequestException(
            `${rule.label} must start with ${rule.prefix} and be 11 to ${rule.maxLength} digits`
          );
        }
        break;
      }
      case PaymentMethodType.FAWRY:
        if (details.length < 4) {
          throw new BadRequestException("FAWRY details must include reference or instructions");
        }
        break;
      case PaymentMethodType.BANK: {
        const hasBank = /bank\s*:/i.test(details);
        const hasName = /name\s*:/i.test(details);
        const hasIbanOrAccount = /iban\s*:|account\s*:/i.test(details);
        if (!hasBank || !hasName || !hasIbanOrAccount) {
          throw new BadRequestException(
            "BANK details must include Bank, Name, and IBAN or Account"
          );
        }
        break;
      }
      case PaymentMethodType.CUSTOM:
        if (details.length < 4) {
          throw new BadRequestException("CUSTOM details are too short");
        }
        break;
      default:
        break;
    }

    return details;
  }
}
