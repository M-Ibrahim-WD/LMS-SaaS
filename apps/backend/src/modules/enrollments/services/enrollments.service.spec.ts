import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { EnrollmentsService } from "./enrollments.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("create blocks enrollment in paid course without approved payment", async () => {
  const prisma = {
    payment: {
      findFirst: createAsyncMock(async () => null)
    },
    enrollment: {
      create: createAsyncMock(async () => ({
        id: "enrollment-1"
      })),
      findFirst: createAsyncMock(async () => null)
    }
  };
  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: true,
      instructorId: "instructor-1"
    }))
  };
  const notificationsService = {
    create: createAsyncMock(async () => undefined)
  };

  const service = new EnrollmentsService(prisma as never, studentAccessService as never, notificationsService as never);

  await assert.rejects(
    () =>
      service.create(
        {
          sub: "student-1",
          role: "STUDENT",
          email: "student@example.com",
          tenantId: null
        },
        { courseId: "course-1" }
      ),
    (error: unknown) =>
      error instanceof ForbiddenException &&
      error.message === "Paid course requires approved payment before enrollment"
  );

  assert.equal(prisma.enrollment.create.calls.length, 0);
});
