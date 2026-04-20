import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AdminPermission, PaymentStatus, Prisma, ProtectedContentEventType, UserRole } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import {
  AdminCoursesQueryDto,
  AdminPaymentsQueryDto,
  AdminTenantsQueryDto,
  AdminUsersQueryDto
} from "../dto/admin-query.dto";
import { UsersService } from "../../users/services/users.service";
import { PlansService } from "../../plans/services/plans.service";
import { CreatePlanDto, UpdatePlanDto } from "../../plans/dto/plan.dto";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CoursesService } from "../../courses/services/courses.service";
import {
  AdminUsersListQueryDto,
  AdminAuditLogsQueryDto,
  CreateAdminUserDto,
  ResetAdminPasswordDto,
  UpdateAdminPermissionsDto,
} from "../dto/admin-users.dto";
import { ReviewCourseDto } from "../dto/review-course.dto";
import { AdminAccessService } from "./admin-access.service";
import { AdminAuditService } from "./admin-audit.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly coursesService: CoursesService,
    private readonly adminAccessService: AdminAccessService,
    private readonly adminAuditService: AdminAuditService
  ) {}

  async getOverview(currentUser: JwtPayload) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.VIEW_OVERVIEW
    );
    const [users, tenants, plans, courses, payments, unreadNotifications] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.tenant.count(),
      this.prisma.plan.count(),
      this.prisma.course.count(),
      this.prisma.payment.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { status: PaymentStatus.APPROVED }
      }),
      this.prisma.notification.count({ where: { isRead: false } })
    ]);

    return {
      totals: {
        users,
        tenants,
        plans,
        courses,
        approvedPayments: payments._count.id,
        approvedRevenue: payments._sum.amount ?? 0,
        unreadNotifications
      }
    };
  }

  async listTenants(currentUser: JwtPayload, query: AdminTenantsQueryDto) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_TENANTS
    );
    const where: Prisma.TenantWhereInput = {};

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: "insensitive" } },
        { inviteCode: { contains: query.search.trim().toUpperCase() } }
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    const tenants = await this.prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true
          }
        },
        _count: {
          select: {
            users: true,
            courses: true,
            payments: true,
            enrollments: true
          }
        },
        plan: true
      }
    });

    return tenants.map((tenant) => ({
      ...tenant,
      usage: {
        usersCount: tenant._count.users,
        coursesCount: tenant._count.courses,
        paymentsCount: tenant._count.payments,
        enrollmentsCount: tenant._count.enrollments
      }
    }));
  }

  async getTenantDetail(currentUser: JwtPayload, id: string) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_TENANTS
    );
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isActive: true
          }
        },
        plan: true,
        users: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        courses: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            isPaid: true,
            price: true,
            createdAt: true,
            instructor: {
              select: {
                id: true,
                fullName: true
              }
            },
            _count: {
              select: {
                enrollments: true
              }
            }
          }
        }
      }
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const [payments, approvedRevenue, recentNotifications, usage, subscription] = await Promise.all([
      this.prisma.payment.count({ where: { tenantId: id } }),
      this.prisma.payment.aggregate({
        where: { tenantId: id, status: PaymentStatus.APPROVED },
        _sum: { amount: true }
      }),
      this.prisma.notification.findMany({
        where: { tenantId: id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          createdAt: true
        }
      }),
      this.plansService.getTenantUsage(id),
      this.subscriptionsService.getAdminTenantSubscription(id)
    ]);

    return {
      ...tenant,
      usage: {
        usersCount: tenant.users.length,
        coursesCount: tenant.courses.length,
        studentsCount: usage.studentsCount,
        instructorsCount: usage.instructorsCount,
        adminsCount: usage.adminsCount,
        storageUsedMb: usage.storageUsedMb,
        paymentsCount: payments,
        approvedRevenue: approvedRevenue._sum.amount ?? 0
      },
      recentNotifications,
      subscription
    };
  }

  async setTenantStatus(currentUser: JwtPayload, id: string, isActive: boolean) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_TENANTS
    );
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        isActive,
        deactivatedAt: isActive ? null : new Date()
      }
    });
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: isActive ? "TENANT_REACTIVATED" : "TENANT_DEACTIVATED",
      summary: `${isActive ? "Reactivated" : "Deactivated"} tenant ${tenant.name}.`,
      targetTenantId: tenant.id
    });
    return updated;
  }

  async listPlans(currentUser: JwtPayload) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_PLANS
    );
    return this.plansService.listPlans();
  }

  async createPlan(currentUser: JwtPayload, dto: CreatePlanDto) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_PLANS
    );
    const plan = await this.plansService.createPlan(dto);
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "PLAN_CREATED",
      summary: `Created subscription plan ${plan.name}.`,
      targetPlanId: plan.id
    });
    return plan;
  }

  async updatePlan(currentUser: JwtPayload, planId: string, dto: UpdatePlanDto) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_PLANS
    );
    const plan = await this.plansService.updatePlan(planId, dto);
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "PLAN_UPDATED",
      summary: `Updated subscription plan ${plan.name}.`,
      targetPlanId: plan.id
    });
    return plan;
  }

  async archivePlan(currentUser: JwtPayload, planId: string) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_PLANS
    );
    const plan = await this.plansService.archivePlan(planId);
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "PLAN_ARCHIVED",
      summary: `Archived subscription plan ${plan.name}.`,
      targetPlanId: plan.id
    });
    return plan;
  }

  async listUsers(currentUser: JwtPayload, query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};
    const actor = await this.adminAccessService.loadAdminActor(currentUser);

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }

    if (query.role) {
      if (query.role === "STUDENT") {
        await this.adminAccessService.assertAdminPermission(
          currentUser,
          AdminPermission.REVIEW_STUDENTS
        );
      }
      if (query.role === "INSTRUCTOR") {
        await this.adminAccessService.assertAdminPermission(
          currentUser,
          AdminPermission.REVIEW_INSTRUCTORS
        );
      }
      if (query.role === "ADMIN") {
        throw new ForbiddenException("Admin accounts are managed separately.");
      }
      where.role = query.role as UserRole;
    } else {
      const allowedRoles: UserRole[] = [];
      if (actor.isSuperAdmin || actor.adminPermissions.includes(AdminPermission.REVIEW_STUDENTS)) {
        allowedRoles.push(UserRole.STUDENT);
      }
      if (actor.isSuperAdmin || actor.adminPermissions.includes(AdminPermission.REVIEW_INSTRUCTORS)) {
        allowedRoles.push(UserRole.INSTRUCTOR);
      }
      if (!allowedRoles.length) {
        return [];
      }
      where.role = { in: allowedRoles };
    }

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === "true";
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        _count: {
          select: {
            instructorCourses: true,
            enrollments: true,
            certificates: true,
            joinedInstructors: true,
            followedByStudents: true
          }
        }
      }
    });

    return users;
  }

  async getUserDetail(currentUser: JwtPayload, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        bio: true,
        profileImage: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        _count: {
          select: {
            instructorCourses: true,
            enrollments: true,
            certificates: true,
            joinedInstructors: true,
            followedByStudents: true,
            payments: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException("Admin accounts are managed separately.");
    }

    if (user.role === UserRole.STUDENT) {
      await this.adminAccessService.assertAdminPermission(
        currentUser,
        AdminPermission.REVIEW_STUDENTS
      );
    }
    if (user.role === UserRole.INSTRUCTOR) {
      await this.adminAccessService.assertAdminPermission(
        currentUser,
        AdminPermission.REVIEW_INSTRUCTORS
      );
    }

    const [recentPayments, recentEnrollments] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          course: { select: { id: true, title: true } }
        }
      }),
      this.prisma.enrollment.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          createdAt: true,
          course: { select: { id: true, title: true } }
        }
      })
    ]);

    return {
      user: {
        ...user,
        profileImage: this.usersService.resolveProfileImageUrl(user.id, user.profileImage)
      },
      recentPayments,
      recentEnrollments
    };
  }

  async setUserStatus(currentUser: JwtPayload, id: string, isActive: boolean) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.MANAGE_USERS
    );
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isSuperAdmin: true, fullName: true }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role === UserRole.ADMIN || user.isSuperAdmin) {
      throw new ForbiddenException("Platform admin accounts cannot be managed from the regular users list.");
    }

    const updated = await this.usersService.setActiveStatus(id, isActive);
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      summary: `${isActive ? "Reactivated" : "Deactivated"} user ${user.fullName}.`,
      targetUserId: user.id
    });
    return updated;
  }

  async listCourses(currentUser: JwtPayload, query: AdminCoursesQueryDto) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_COURSES
    );
    const where: Prisma.CourseWhereInput = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
    if (query.instructorId) {
      where.instructorId = query.instructorId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } }
      ];
    }

    return this.prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true, isActive: true } },
        instructor: { select: { id: true, fullName: true, email: true, isActive: true } },
        _count: { select: { enrollments: true, payments: true, reviews: true } }
      }
    }).then((courses) =>
      courses.map((course) => ({
        ...course,
        thumbnailImage: this.coursesService.resolveCourseThumbnailUrl(
          course.id,
          course.thumbnailImage ?? null
        )
      }))
    );
  }

  async reviewCourse(currentUser: JwtPayload, courseId: string, dto: ReviewCourseDto) {
    const actor = await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_COURSES
    );
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId
      },
      select: {
        id: true,
        title: true,
        status: true,
        tenantId: true,
        instructorId: true
      }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const report = dto.report.trim();
    const stopCourse = Boolean(dto.stopCourse);
    const updatedCourse = stopCourse
      ? await this.prisma.course.update({
          where: { id: course.id },
          data: { status: "DRAFT" }
        })
      : await this.prisma.course.findUniqueOrThrow({
          where: { id: course.id }
        });

    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: stopCourse ? "COURSE_STOPPED_FOR_REVIEW" : "COURSE_REVIEW_REPORTED",
      summary: stopCourse
        ? `Stopped course ${course.title} and submitted a review report.`
        : `Submitted a review report for course ${course.title}.`,
      targetTenantId: course.tenantId,
      targetUserId: course.instructorId,
      metadata: {
        courseId: course.id,
        courseTitle: course.title,
        previousStatus: course.status,
        currentStatus: updatedCourse.status,
        report
      }
    });

    return {
      id: updatedCourse.id,
      title: updatedCourse.title,
      status: updatedCourse.status,
      reviewSubmitted: true,
      stopCourse,
      report
    };
  }

  async listPayments(currentUser: JwtPayload, query: AdminPaymentsQueryDto) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_PAYMENTS
    );
    const where: Prisma.PaymentWhereInput = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
    if (query.instructorId) {
      where.course = { instructorId: query.instructorId };
    }
    if (query.status) {
      where.status = query.status as PaymentStatus;
    }

    return this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true, isActive: true } },
        course: {
          select: {
            id: true,
            title: true,
            instructor: { select: { id: true, fullName: true, email: true } }
          }
        },
        user: { select: { id: true, fullName: true, email: true, isActive: true } },
        method: { select: { id: true, label: true, type: true } }
      }
    });
  }

  async getActivity(currentUser: JwtPayload) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.VIEW_OVERVIEW
    );
    const [recentUsers, recentCourses, recentPayments, recentNotifications] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, fullName: true, role: true, createdAt: true }
      }),
      this.prisma.course.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, status: true, createdAt: true }
      }),
      this.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          user: { select: { fullName: true } },
          course: { select: { title: true } }
        }
      }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, type: true, title: true, message: true, createdAt: true }
      })
    ]);

    return {
      recentUsers,
      recentCourses,
      recentPayments,
      recentNotifications
    };
  }

  async listContentSecurityEvents(
    currentUser: JwtPayload,
    query: {
      courseId?: string;
      studentId?: string;
      eventType?: string;
    }
  ) {
    await this.adminAccessService.assertAdminPermission(
      currentUser,
      AdminPermission.REVIEW_COURSES
    );

    const where: Prisma.ProtectedContentEventWhereInput = {};

    if (!currentUser.isSuperAdmin && !currentUser.adminPermissions?.includes(AdminPermission.REVIEW_COURSES)) {
      where.tenantId = currentUser.tenantId ?? undefined;
    }
    if (query.courseId?.trim()) {
      where.courseId = query.courseId.trim();
    }
    if (query.studentId?.trim()) {
      where.userId = query.studentId.trim();
    }
    if (query.eventType?.trim()) {
      where.eventType = query.eventType.trim() as ProtectedContentEventType;
    }

    return this.prisma.protectedContentEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
  }

  async listAdminUsers(currentUser: JwtPayload, query: AdminUsersListQueryDto) {
    await this.adminAccessService.assertSuperAdmin(currentUser);
    const where: Prisma.UserWhereInput = {
      role: UserRole.ADMIN,
      isSuperAdmin: false
    };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        adminPermissions: true,
        createdAt: true
      }
    });
  }

  async createAdminUser(currentUser: JwtPayload, dto: CreateAdminUserDto) {
    const actor = await this.adminAccessService.assertSuperAdmin(currentUser);
    this.adminAccessService.ensureValidAdminPermissions(dto.permissions);
    const admin = await this.usersService.create({
      email: dto.email.trim().toLowerCase(),
      fullName: dto.fullName.trim(),
      password: dto.password,
      role: UserRole.ADMIN,
      tenantId: null,
      isSuperAdmin: false,
      adminPermissions: dto.permissions,
      mustChangePassword: true
    });
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_CREATED",
      summary: `Created delegated admin ${admin.fullName}.`,
      targetUserId: admin.id,
      metadata: { permissions: dto.permissions }
    });
    return admin;
  }

  async updateAdminPermissions(currentUser: JwtPayload, adminUserId: string, dto: UpdateAdminPermissionsDto) {
    const actor = await this.adminAccessService.assertSuperAdmin(currentUser);
    this.adminAccessService.ensureValidAdminPermissions(dto.permissions);

    const target = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, isSuperAdmin: true }
    });

    if (!target || target.role !== UserRole.ADMIN) {
      throw new NotFoundException("Admin account not found");
    }
    if (target.isSuperAdmin) {
      throw new ForbiddenException("The super admin account cannot be modified.");
    }

    const updated = await this.prisma.user.update({
      where: { id: adminUserId },
      data: { adminPermissions: dto.permissions as AdminPermission[] },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        adminPermissions: true,
        createdAt: true
      }
    });
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_PERMISSIONS_UPDATED",
      summary: `Updated delegated admin permissions for ${updated.fullName}.`,
      targetUserId: updated.id,
      metadata: { permissions: dto.permissions }
    });
    return updated;
  }

  async setManagedAdminStatus(currentUser: JwtPayload, adminUserId: string, isActive: boolean) {
    const actor = await this.adminAccessService.assertSuperAdmin(currentUser);
    const target = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, isSuperAdmin: true, fullName: true }
    });

    if (!target || target.role !== UserRole.ADMIN) {
      throw new NotFoundException("Admin account not found");
    }
    if (target.isSuperAdmin) {
      throw new ForbiddenException("The super admin account cannot be deactivated or managed.");
    }

    const updated = await this.usersService.setActiveStatus(adminUserId, isActive);
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: isActive ? "ADMIN_REACTIVATED" : "ADMIN_DEACTIVATED",
      summary: `${isActive ? "Reactivated" : "Deactivated"} delegated admin ${target.fullName}.`,
      targetUserId: target.id
    });
    return updated;
  }

  async resetManagedAdminPassword(currentUser: JwtPayload, adminUserId: string, dto: ResetAdminPasswordDto) {
    const actor = await this.adminAccessService.assertSuperAdmin(currentUser);
    const target = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, role: true, isSuperAdmin: true, fullName: true }
    });

    if (!target || target.role !== UserRole.ADMIN) {
      throw new NotFoundException("Admin account not found");
    }
    if (target.isSuperAdmin) {
      throw new ForbiddenException("The super admin password cannot be reset here.");
    }

    const updated = await this.usersService.setPassword(target.id, null, dto.password, {
      mustChangePassword: true
    });
    if (!updated) {
      throw new NotFoundException("Admin account not found");
    }
    await this.adminAuditService.recordAuditLog({
      actorUserId: actor.id,
      action: "ADMIN_PASSWORD_RESET",
      summary: `Reset password for delegated admin ${target.fullName}.`,
      targetUserId: target.id
    });
    return updated;
  }

  async listAuditLogs(currentUser: JwtPayload, query: AdminAuditLogsQueryDto) {
    await this.adminAccessService.assertSuperAdmin(currentUser);
    return this.adminAuditService.listAuditLogs(query);
  }
}
