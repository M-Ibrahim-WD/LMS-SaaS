import assert from "node:assert/strict";
import test from "node:test";
import { PlansService } from "./plans.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("createPlan stores the expanded permission catalog", async () => {
  const prisma = {
    plan: {
      create: createAsyncMock(async ({ data }: { data: { code: string; maxStudentsTotal: number } }) => ({
        id: "plan-1",
        ...data
      }))
    }
  };

  const service = new PlansService(prisma as never);
  const result = await service.createPlan({
    code: "studio",
    name: "Studio",
    description: "Balanced plan",
    monthlyPrice: 49,
    yearlyPrice: 490,
    maxCourses: 15,
    maxSectionsPerCourse: 20,
    maxLessonsPerSection: 40,
    canPublishCourses: true,
    canCreatePaidCourses: true,
    maxStudentsTotal: 500,
    maxStudentsPerCourse: 200,
    canUseQuizzes: true,
    canUseAssignments: true,
    canIssueCertificates: true,
    canUseAnalytics: true,
    canUseReviews: true,
    maxStorageMb: 5120,
    canUploadThumbnails: true,
    canUploadProfileImage: true,
    canUseManualPayments: true,
    hasAdvancedAnalytics: true,
    hasOnlinePayments: false,
    maxAdminUsers: 4,
    maxInstructorUsers: 2,
    isActive: true
  });

  assert.equal(result.code, "STUDIO");
  assert.equal(result.maxStudentsTotal, 500);
});

test("getTenantUsage aggregates tenant usage counters", async () => {
  const prisma = {
    course: {
      count: createAsyncMock(async () => 3)
    },
    studentInstructor: {
      findMany: createAsyncMock(async () => [{ studentId: "student-1" }, { studentId: "student-2" }])
    },
    user: {
      count: createAsyncMock(async ({ where }: { where: { role: string } }) => (where.role === "INSTRUCTOR" ? 2 : 1))
    }
  };

  const service = new PlansService(prisma as never);
  const usage = await service.getTenantUsage("tenant-1");

  assert.deepEqual(usage, {
    coursesCount: 3,
    studentsCount: 2,
    instructorsCount: 2,
    adminsCount: 1,
    storageUsedMb: 0
  });
});
