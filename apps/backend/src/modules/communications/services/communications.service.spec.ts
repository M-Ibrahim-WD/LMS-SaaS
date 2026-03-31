import assert from "node:assert/strict";
import test from "node:test";
import { ConversationKind, ConversationStatus, UserRole } from "@prisma/client";
import { createAsyncMock } from "../../../test/mock-utils";
import { CommunicationsService } from "./communications.service";

function createNotificationsStub() {
  return {
    create: createAsyncMock(async () => ({ id: "notification-1" }))
  };
}

function createEventsStub() {
  return {
    publish() {
      return undefined;
    }
  };
}

function createAdminAccessStub() {
  return {
    loadAdminActor: createAsyncMock(async () => ({
      id: "admin-1",
      role: UserRole.ADMIN,
      isSuperAdmin: false,
      adminPermissions: [],
      isActive: true
    })),
    assertAdminPermission: createAsyncMock(async () => ({
      id: "admin-1"
    }))
  };
}

function directConversationFixture() {
  return {
    id: "conversation-1",
    tenantId: "tenant-1",
    kind: ConversationKind.DIRECT,
    courseId: null,
    status: ConversationStatus.OPEN,
    requesterUserId: null,
    createdAt: new Date("2026-03-31T10:00:00.000Z"),
    updatedAt: new Date("2026-03-31T10:00:00.000Z"),
    lastMessageAt: new Date("2026-03-31T10:05:00.000Z"),
    participants: [
      {
        userId: "student-1",
        roleSnapshot: UserRole.STUDENT,
        lastReadAt: new Date("2026-03-31T10:05:00.000Z"),
        user: {
          id: "student-1",
          fullName: "Student One",
          email: "student@example.com",
          role: UserRole.STUDENT,
          profileImage: null
        }
      },
      {
        userId: "instructor-1",
        roleSnapshot: UserRole.INSTRUCTOR,
        lastReadAt: null,
        user: {
          id: "instructor-1",
          fullName: "Instructor One",
          email: "instructor@example.com",
          role: UserRole.INSTRUCTOR,
          profileImage: null
        }
      }
    ],
    requester: null,
    supportAssignment: null,
    messages: [
      {
        id: "message-1",
        body: "Hello there",
        createdAt: new Date("2026-03-31T10:05:00.000Z"),
        sender: {
          id: "student-1",
          fullName: "Student One",
          email: "student@example.com",
          role: UserRole.STUDENT,
          profileImage: null
        }
      }
    ]
  };
}

test("listDirectTargets returns joined instructors for students", async () => {
  const prisma = {
    studentInstructor: {
      findMany: createAsyncMock(async () => [
        {
          instructor: {
            id: "instructor-1",
            fullName: "Instructor One",
            email: "instructor@example.com",
            role: UserRole.INSTRUCTOR,
            profileImage: null,
            tenantId: "tenant-1",
            tenant: {
              id: "tenant-1",
              name: "Instructor Workspace"
            }
          }
        }
      ])
    }
  };

  const service = new CommunicationsService(
    prisma as never,
    createNotificationsStub() as never,
    createAdminAccessStub() as never,
    createEventsStub() as never
  );

  const result = await service.listDirectTargets({
    sub: "student-1",
    role: "STUDENT",
    tenantId: null,
    email: "student@example.com"
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "instructor-1");
});

test("createDirectConversation reuses an existing open thread", async () => {
  const existingConversation = directConversationFixture();
  const prisma = {
    user: {
      findUnique: createAsyncMock(async () => ({
        id: "instructor-1",
        role: UserRole.INSTRUCTOR,
        tenantId: "tenant-1",
        isActive: true
      }))
    },
    studentInstructor: {
      findFirst: createAsyncMock(async () => ({ id: "relation-1" }))
    },
    course: {
      findFirst: createAsyncMock(async () => ({ id: "course-1" }))
    },
    conversation: {
      findFirst: createAsyncMock(async () => existingConversation)
    },
    message: {
      count: createAsyncMock(async () => 1)
    }
  };

  const service = new CommunicationsService(
    prisma as never,
    createNotificationsStub() as never,
    createAdminAccessStub() as never,
    createEventsStub() as never
  );

  const result = await service.createDirectConversation(
    {
      sub: "student-1",
      role: "STUDENT",
      tenantId: null,
      email: "student@example.com"
    },
    {
      targetUserId: "instructor-1"
    }
  );

  assert.equal(prisma.conversation.findFirst.calls.length, 1);
  assert.equal(result.id, "conversation-1");
  assert.equal(result.otherParticipant?.id, "instructor-1");
});
