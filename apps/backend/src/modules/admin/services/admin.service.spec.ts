import assert from "node:assert/strict";
import test from "node:test";
import { AdminService } from "./admin.service";
import { createAsyncMock } from "../../../test/mock-utils";

const adminActor = {
  sub: "admin-1",
  email: "admin@example.com",
  role: "ADMIN" as const,
  tenantId: null,
  isSuperAdmin: true,
  adminPermissions: [],
  mustChangePassword: false
};

test("getOverview returns aggregated platform totals", async () => {
  const prisma = {
    user: {
      count: createAsyncMock(async () => 15),
      findUnique: createAsyncMock(async () => ({
        id: "admin-1",
        role: "ADMIN",
        isSuperAdmin: true,
        adminPermissions: [],
        isActive: true
      }))
    },
    tenant: {
      count: createAsyncMock(async () => 4)
    },
    plan: {
      count: createAsyncMock(async () => 3)
    },
    course: {
      count: createAsyncMock(async () => 22)
    },
    payment: {
      aggregate: createAsyncMock(async () => ({
        _count: { id: 7 },
        _sum: { amount: 1450 }
      }))
    },
    notification: {
      count: createAsyncMock(async () => 3)
    }
  };

  const service = new AdminService(prisma as never, {} as never, {} as never, {} as never);
  const result = await service.getOverview(adminActor);

  assert.deepEqual(result, {
    totals: {
      users: 15,
      tenants: 4,
      plans: 3,
      courses: 22,
      approvedPayments: 7,
      approvedRevenue: 1450,
      unreadNotifications: 3
    }
  });
  assert.equal(prisma.payment.aggregate.calls.length, 1);
});

test("listTenants maps usage counts and filters by active flag", async () => {
  const prisma = {
    user: {
      findUnique: createAsyncMock(async () => ({
        id: "admin-1",
        role: "ADMIN",
        isSuperAdmin: true,
        adminPermissions: [],
        isActive: true
      }))
    },
    tenant: {
      findMany: createAsyncMock(async () => [
        {
          id: "tenant-1",
          name: "Acme Academy",
          inviteCode: "ACME123",
          isActive: true,
          createdAt: new Date("2026-03-01T00:00:00Z"),
          owner: {
            id: "owner-1",
            fullName: "Owner One",
            email: "owner@example.com",
            isActive: true
          },
          _count: {
            users: 8,
            courses: 3,
            payments: 5,
            enrollments: 11
          }
        }
      ])
    }
  };

  const service = new AdminService(prisma as never, {} as never, {} as never, {} as never);
  const result = await service.listTenants(adminActor, {
    search: "acme",
    isActive: "true"
  });

  assert.equal(prisma.tenant.findMany.calls.length, 1);
  assert.equal(result[0].usage.usersCount, 8);
  assert.equal(result[0].usage.coursesCount, 3);
  assert.equal(result[0].usage.paymentsCount, 5);
  assert.equal(result[0].usage.enrollmentsCount, 11);
  assert.equal(result[0].owner?.email, "owner@example.com");
});

test("getUserDetail resolves profile image and recent activity", async () => {
  const prisma = {
    user: {
      findUnique: createAsyncMock(async ({ where }: { where: { id: string } }) =>
        where.id === "admin-1"
          ? {
              id: "admin-1",
              role: "ADMIN",
              isSuperAdmin: true,
              adminPermissions: [],
              isActive: true
            }
          : {
              id: "user-1",
              fullName: "Learner One",
              email: "learner@example.com",
              bio: "Student bio",
              profileImage: "profiles/user-1.png",
              role: "STUDENT",
              isActive: true,
              deactivatedAt: null,
              createdAt: new Date("2026-03-01T00:00:00Z"),
              tenantId: "tenant-1",
              tenant: {
                id: "tenant-1",
                name: "Acme Academy",
                isActive: true
              },
              _count: {
                instructorCourses: 0,
                enrollments: 2,
                certificates: 1,
                joinedInstructors: 1,
                followedByStudents: 0,
                payments: 1
              }
            }
      )
    },
    payment: {
      findMany: createAsyncMock(async () => [
        {
          id: "payment-1",
          status: "APPROVED",
          amount: 120,
          createdAt: new Date("2026-03-02T00:00:00Z"),
          course: { id: "course-1", title: "Course 1" }
        }
      ])
    },
    enrollment: {
      findMany: createAsyncMock(async () => [
        {
          id: "enrollment-1",
          createdAt: new Date("2026-03-03T00:00:00Z"),
          course: { id: "course-2", title: "Course 2" }
        }
      ])
    }
  };

  const usersService = {
    resolveProfileImageUrl: (userId: string, profileImage: string | null) =>
      profileImage ? `/api/users/${userId}/profile-image` : null
  };

  const service = new AdminService(prisma as never, usersService as never, {} as never, {} as never);
  const result = await service.getUserDetail(adminActor, "user-1");

  assert.equal(result.user.profileImage, "/api/users/user-1/profile-image");
  assert.equal(result.recentPayments.length, 1);
  assert.equal(result.recentEnrollments.length, 1);
});

test("setUserStatus delegates to users service after existence check", async () => {
  const prisma = {
    user: {
      findUnique: createAsyncMock(async ({ where }: { where: { id: string } }) =>
        where.id === "admin-1"
          ? {
              id: "admin-1",
              role: "ADMIN",
              isSuperAdmin: true,
              adminPermissions: [],
              isActive: true
            }
          : { id: "user-1" }
      )
    },
    adminAuditLog: {
      create: createAsyncMock(async () => ({ id: "audit-1" }))
    }
  };

  const usersService = {
    setActiveStatus: createAsyncMock(async () => ({
      id: "user-1",
      isActive: false
    }))
  };

  const service = new AdminService(prisma as never, usersService as never, {} as never, {} as never);
  const result = await service.setUserStatus(adminActor, "user-1", false);

  assert.equal(prisma.user.findUnique.calls.length, 2);
  assert.equal(usersService.setActiveStatus.calls.length, 1);
  assert.deepEqual(usersService.setActiveStatus.calls[0], ["user-1", false]);
  assert.equal(result.isActive, false);
});
