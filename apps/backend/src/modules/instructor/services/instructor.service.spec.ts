import assert from "node:assert/strict";
import test from "node:test";
import { InstructorService } from "./instructor.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("getPublicProfile resolves local course thumbnails to public urls", async () => {
  const prisma = {
    user: {
      findFirst: createAsyncMock(async () => ({
        id: "instructor-1",
        fullName: "Instructor",
        bio: "Bio",
        profileImage: null,
        tenant: {
          id: "tenant-1",
          name: "Tenant"
        },
        _count: {
          followedByStudents: 12
        }
      }))
    },
    course: {
      findMany: createAsyncMock(async () => [
        {
          id: "course-1",
          title: "Course",
          description: "Description",
          thumbnailImage: "local:file.png",
          category: "Business",
          level: "BEGINNER",
          isPaid: false,
          price: 0,
          _count: {
            enrollments: 5
          }
        }
      ])
    },
    courseReview: {
      aggregate: createAsyncMock(async () => ({
        _avg: { rating: 4.5 },
        _count: { id: 2 }
      })),
      groupBy: createAsyncMock(async () => [
        {
          courseId: "course-1",
          _avg: { rating: 4.5 },
          _count: { id: 2 }
        }
      ]),
      findMany: createAsyncMock(async () => [])
    }
  };

  const usersService = {
    resolveProfileImageUrl: () => null
  };
  const subscriptionsService = {};
  const thumbnailStorageService = {
    getPublicCourseThumbnailUrl: (courseId: string, value?: string | null) =>
      value?.startsWith("local:") ? `http://localhost:4000/api/courses/${courseId}/thumbnail` : value ?? null
  };

  const service = new InstructorService(
    prisma as never,
    usersService as never,
    subscriptionsService as never,
    thumbnailStorageService as never
  );

  const result = await service.getPublicProfile("instructor-1");

  assert.equal(result.courses[0]?.thumbnailImage, "http://localhost:4000/api/courses/course-1/thumbnail");
});
