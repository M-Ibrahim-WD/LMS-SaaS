import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { StudentInstructorsService } from "./student-instructors.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("createRelationFromInviteCode rejects duplicate student-instructor relation", async () => {
  const prisma = {
    tenant: {
      findUnique: createAsyncMock(async () => ({
        id: "tenant-1",
        ownerId: "instructor-1",
        owner: {
          id: "instructor-1",
          fullName: "Instructor",
          email: "instructor@example.com"
        }
      }))
    },
    user: {
      findUnique: createAsyncMock(async () => ({
        id: "student-1",
        role: "STUDENT",
        tenantId: "tenant-1"
      })),
      update: createAsyncMock(async () => undefined)
    },
    studentInstructor: {
      findUnique: createAsyncMock(async () => ({
        id: "relation-1"
      })),
      create: createAsyncMock(async () => undefined)
    }
  };
  const notificationsService = {
    create: createAsyncMock(async () => undefined)
  };
  const plansService = {
    assertCanAddStudentToTenant: createAsyncMock(async () => undefined)
  };

  const service = new StudentInstructorsService(prisma as never, notificationsService as never, plansService as never);

  await assert.rejects(
    () => service.createRelationFromInviteCode("student-1", "ABC123"),
    (error: unknown) =>
      error instanceof ConflictException && error.message === "Already joined this instructor"
  );

  assert.equal(prisma.studentInstructor.create.calls.length, 0);
  assert.equal(prisma.user.update.calls.length, 0);
});
