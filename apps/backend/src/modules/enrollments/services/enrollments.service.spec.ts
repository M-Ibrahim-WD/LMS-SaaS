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
  const thumbnailStorageService = {
    getPublicCourseThumbnailUrl: () => null
  };

  const service = new EnrollmentsService(
    prisma as never,
    studentAccessService as never,
    notificationsService as never,
    thumbnailStorageService as never
  );

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

test("myCourses resolves local thumbnail references to public urls", async () => {
  const prisma = {
    enrollment: {
      findMany: createAsyncMock(async () => [
        {
          id: "enrollment-1",
          courseId: "course-1",
          createdAt: new Date().toISOString(),
          course: {
            id: "course-1",
            title: "Course",
            thumbnailImage: "local:file.png",
            instructor: {
              id: "instructor-1",
              fullName: "Instructor"
            }
          }
        }
      ])
    },
    section: {
      findMany: createAsyncMock(async () => [])
    },
    lessonCompletion: {
      groupBy: createAsyncMock(async () => []),
      findMany: createAsyncMock(async () => [])
    },
    courseLearnerState: {
      findMany: createAsyncMock(async () => [])
    }
  };

  const thumbnailStorageService = {
    getPublicCourseThumbnailUrl: (courseId: string, value?: string | null) =>
      value?.startsWith("local:") ? `http://localhost:4000/api/courses/${courseId}/thumbnail` : value ?? null
  };

  const service = new EnrollmentsService(
    prisma as never,
    {} as never,
    {} as never,
    thumbnailStorageService as never
  );

  const result = await service.myCourses({
    sub: "student-1",
    role: "STUDENT",
    email: "student@example.com",
    tenantId: null
  });

  assert.equal(result[0]?.course.thumbnailImage, "http://localhost:4000/api/courses/course-1/thumbnail");
});
