import assert from "node:assert/strict";
import test from "node:test";
import { NotificationsService } from "./notifications.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("create stores a notification and marks its job as processed", async () => {
  const prisma = {
    notification: {
      create: createAsyncMock(async () => ({
        id: "notification-1",
        jobs: [{ id: "job-1" }]
      })),
      findUnique: createAsyncMock(async () => ({
        id: "notification-1",
        title: "Test"
      }))
    },
    notificationJob: {
      updateMany: createAsyncMock(async () => ({ count: 1 }))
    }
  };

  const service = new NotificationsService(prisma as never);
  const result = await service.create({
    userId: "user-1",
    tenantId: "tenant-1",
    type: "WELCOME",
    title: "Test",
    message: "Hello"
  });

  assert.equal(prisma.notification.create.calls.length, 1);
  assert.equal(prisma.notificationJob.updateMany.calls.length, 1);
  assert.equal(result?.id, "notification-1");
});
