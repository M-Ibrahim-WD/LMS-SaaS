import assert from "node:assert/strict";
import test from "node:test";
import { CertificatesService } from "./certificates.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("issueForCourse creates certificate when all completion requirements are met", async () => {
  const prisma = {
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    certificate: {
      findFirst: createAsyncMock(async () => null),
      create: createAsyncMock(async ({ data }: { data: { certificateNumber: string } }) => ({
        id: "certificate-1",
        ...data,
        course: {
          title: "Course 1"
        }
      }))
    },
    lesson: {
      count: createAsyncMock(async () => 4)
    },
    lessonCompletion: {
      count: createAsyncMock(async () => 4)
    },
    quiz: {
      count: createAsyncMock(async () => 2)
    },
    quizSubmission: {
      count: createAsyncMock(async () => 2)
    },
    assignment: {
      count: createAsyncMock(async () => 1)
    },
    assignmentSubmission: {
      count: createAsyncMock(async () => 1)
    }
  };

  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1"
    }))
  };
  const notificationsService = {
    create: createAsyncMock(async () => undefined)
  };

  const subscriptionsService = {
    getEffectivePermissionsForTenant: createAsyncMock(async () => ({
      canIssueCertificates: true
    }))
  };

  const service = new CertificatesService(
    prisma as never,
    studentAccessService as never,
    notificationsService as never,
    subscriptionsService as never
  );

  const result = await service.issueForCourse(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "course-1"
  );

  assert.equal(prisma.certificate.create.calls.length, 1);
  assert.equal(result.id, "certificate-1");
});
