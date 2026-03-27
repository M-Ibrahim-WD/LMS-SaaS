import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { PaymentMethodType } from "@prisma/client";
import { PaymentMethodsService } from "./payment-methods.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("create rejects duplicate active payment account for same instructor and method", async () => {
  const prisma = {
    paymentMethod: {
      findFirst: createAsyncMock(async () => ({
        id: "method-1"
      })),
      create: createAsyncMock(async () => null)
    }
  };

  const service = new PaymentMethodsService(prisma as never, {} as never, {
    assertPermission: createAsyncMock(async () => undefined)
  } as never);

  await assert.rejects(
    () =>
      service.create(
        {
          sub: "instructor-1",
          role: "INSTRUCTOR",
          email: "instructor@example.com",
          tenantId: "tenant-1"
        },
        {
          type: PaymentMethodType.VODAFONE_CASH,
          label: "Vodafone Wallet",
          details: "01012345678"
        }
      ),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message === "This payment account already exists for this method"
  );

  assert.equal(prisma.paymentMethod.create.calls.length, 0);
});
