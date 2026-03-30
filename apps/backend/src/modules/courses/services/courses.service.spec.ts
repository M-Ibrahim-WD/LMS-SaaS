import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { CoursesService } from "./courses.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("getOne rejects student access when the instructor is not followed", async () => {
  const prisma = {
    enrollment: {
      findFirst: createAsyncMock(async () => null)
    },
    course: {
      findFirst: createAsyncMock(async () => null)
    }
  };
  const studentAccessService = {
    getFollowedInstructorWhere: () => ({}) ,
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => null)
  };
  const plansService = {
    assertCanCreateCourse: createAsyncMock(async () => undefined)
  };
  const thumbnailStorageService = {
    getPublicCourseThumbnailUrl: (_courseId: string, thumbnailImage?: string | null) =>
      thumbnailImage ?? null
  };
  const courseProgressService = {
    getCourseProgressSummaryForCourse: createAsyncMock(async () => ({
      totalLessons: 0,
      completedLessons: 0,
      percentage: 0,
      isComplete: false
    })),
    getCompletedLessonIds: createAsyncMock(async () => new Set<string>()),
    flattenLessons: () => []
  };

  const service = new CoursesService(
    prisma as never,
    studentAccessService as never,
    plansService as never,
    thumbnailStorageService as never,
    courseProgressService as never
  );

  await assert.rejects(
    () =>
      service.getOne(
        {
          sub: "student-1",
          role: "STUDENT",
          email: "student@example.com",
          tenantId: null
        },
        "course-1"
      ),
    (error: unknown) =>
      error instanceof ForbiddenException && error.message === "Join this instructor first"
  );
});

test("completeLesson creates a completion record for an enrolled student", async () => {
  const prisma = {
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    lesson: {
      findFirst: createAsyncMock(async () => ({ id: "lesson-1" })),
      count: createAsyncMock(async () => 4)
    },
    lessonCompletion: {
      upsert: createAsyncMock(async () => ({
        id: "completion-1"
      })),
      count: createAsyncMock(async () => 1)
    },
    courseLearnerState: {
      upsert: createAsyncMock(async () => ({
        id: "state-1",
        userId: "student-1",
        courseId: "course-1",
        lastLessonId: "lesson-1"
      }))
    }
  };
  const studentAccessService = {
    getFollowedInstructorWhere: () => ({}),
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: false
    }))
  };
  const plansService = {
    assertCanCreateCourse: createAsyncMock(async () => undefined)
  };
  const thumbnailStorageService = {
    getPublicCourseThumbnailUrl: (_courseId: string, thumbnailImage?: string | null) =>
      thumbnailImage ?? null
  };
  const courseProgressService = {
    getCourseProgressSummaryForCourse: createAsyncMock(async () => ({
      totalLessons: 4,
      completedLessons: 1,
      percentage: 25,
      isComplete: false
    })),
    getCompletedLessonIds: createAsyncMock(async () => new Set<string>()),
    flattenLessons: () => []
  };

  const service = new CoursesService(
    prisma as never,
    studentAccessService as never,
    plansService as never,
    thumbnailStorageService as never,
    courseProgressService as never
  );

  const result = await service.completeLesson(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "course-1",
    "lesson-1"
  );

  assert.equal(prisma.lessonCompletion.upsert.calls.length, 1);
  assert.equal(courseProgressService.getCourseProgressSummaryForCourse.calls.length, 1);
  assert.deepEqual(result, {
    totalLessons: 4,
    completedLessons: 1,
    percentage: 25,
    isComplete: false
  });
});
