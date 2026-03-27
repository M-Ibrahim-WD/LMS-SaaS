import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { StudentInstructorsService } from "../../student-instructors/services/student-instructors.service";
import { CreateTenantDto } from "../dto/create-tenant.dto";
import { JoinTenantDto } from "../dto/join-tenant.dto";
import { randomBytes } from "crypto";

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentInstructorsService: StudentInstructorsService
  ) {}

  private async generateUniqueInviteCode(): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const inviteCode = randomBytes(5).toString("hex").toUpperCase();
      const exists = await this.prisma.tenant.findUnique({
        where: { inviteCode },
        select: { id: true }
      });

      if (!exists) {
        return inviteCode;
      }
    }

    throw new ConflictException("Failed to generate unique invite code");
  }

  async create(input: CreateTenantDto & { ownerId: string }) {
    const inviteCode = await this.generateUniqueInviteCode();

    return this.prisma.tenant.create({
      data: {
        name: input.name,
        ownerId: input.ownerId,
        inviteCode
      }
    });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id }
    });
  }

  findByOwnerId(ownerId: string) {
    return this.prisma.tenant.findUnique({
      where: { ownerId }
    });
  }

  async setActiveStatus(tenantId: string, isActive: boolean) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isActive,
        deactivatedAt: isActive ? null : new Date()
      }
    });
  }

  findByIdScoped(id: string, tenantId: string | null) {
    if (!tenantId || id !== tenantId) {
      return null;
    }

    return this.prisma.tenant.findUnique({
      where: { id }
    });
  }

  findMe(tenantId: string | null) {
    if (!tenantId) {
      return null;
    }

    return this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });
  }

  async joinTenantForStudent(userId: string, dto: JoinTenantDto) {
    if (!dto.inviteCode) {
      throw new BadRequestException("inviteCode is required");
    }

    await this.studentInstructorsService.createRelationFromInviteCode(userId, dto.inviteCode);

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async getInviteCodeForTenant(tenantId: string | null) {
    if (!tenantId) {
      throw new BadRequestException("Tenant not found for current user");
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, inviteCode: true }
    });

    if (!tenant) {
      throw new BadRequestException("Tenant not found");
    }

    if (tenant.inviteCode) {
      return { inviteCode: tenant.inviteCode };
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { inviteCode },
      select: { inviteCode: true }
    });

    return { inviteCode: updated.inviteCode };
  }
}
