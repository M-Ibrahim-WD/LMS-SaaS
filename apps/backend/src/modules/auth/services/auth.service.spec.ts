import assert from "node:assert/strict";
import test from "node:test";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { AuthService } from "./auth.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("register creates student, joins instructor by invite code, and signs a token", async () => {
  const createdStudent = {
    id: "student-1",
    email: "student@example.com",
    fullName: "Student User",
    role: UserRole.STUDENT,
    tenantId: null
  };

  const hydratedStudent = {
    ...createdStudent,
    tenantId: "tenant-1"
  };

  const usersService = {
    create: createAsyncMock<[{
      email: string;
      fullName: string;
      role: UserRole;
      tenantId: string | null;
      password: string;
    }], typeof createdStudent>(async () => createdStudent),
    findById: createAsyncMock<[string, string | null], typeof hydratedStudent>(async () => hydratedStudent)
  };
  const jwtService = {
    signAsync: createAsyncMock<[{
      sub: string;
      email: string;
      role: UserRole;
      tenantId: string | null;
    }], string>(async () => "signed-jwt")
  };
  const studentInstructorsService = {
    createRelationFromInviteCode: createAsyncMock<[string, string], void>(async () => undefined)
  };
  const notificationsService = {
    create: createAsyncMock(async () => undefined)
  };
  const prisma = {
    tenant: {
      findUnique: createAsyncMock(async () => ({ id: "tenant-1" }))
    }
  };
  const subscriptionsService = {
    assertTenantCanAddStudent: createAsyncMock(async () => undefined)
  };

  const service = new AuthService(
    usersService as never,
    jwtService as never,
    prisma as never,
    {} as never,
    studentInstructorsService as never,
    notificationsService as never,
    subscriptionsService as never
  );

  const result = await service.register({
    email: "student@example.com",
    fullName: "Student User",
    password: "secret",
    role: "STUDENT",
    inviteCode: "abc123"
  });

  assert.equal(usersService.create.calls.length, 1);
  assert.deepEqual(usersService.create.calls[0][0], {
    email: "student@example.com",
    fullName: "Student User",
    role: UserRole.STUDENT,
    tenantId: null,
    password: "secret"
  });
  assert.deepEqual(studentInstructorsService.createRelationFromInviteCode.calls[0], [
    "student-1",
    "ABC123"
  ]);
  assert.deepEqual(subscriptionsService.assertTenantCanAddStudent.calls[0], ["tenant-1"]);
  assert.deepEqual(usersService.findById.calls[0], ["student-1", null]);
  assert.equal(jwtService.signAsync.calls.length, 1);
  assert.deepEqual(jwtService.signAsync.calls[0][0], {
    sub: "student-1",
    email: "student@example.com",
    role: UserRole.STUDENT,
    tenantId: "tenant-1",
    isSuperAdmin: false,
    adminPermissions: [],
    mustChangePassword: false
  });
  assert.equal(result.accessToken, "signed-jwt");
  assert.equal(result.user.tenantId, "tenant-1");
});

test("login accepts legacy short passwords and normalizes email before lookup", async () => {
  const hashed = await bcrypt.hash("short1", 10);
  const authUser = {
    id: "user-1",
    email: "legacy@example.com",
    fullName: "Legacy User",
    role: UserRole.STUDENT,
    isActive: true,
    tenantId: null,
    password: hashed
  };
  const safeUser = {
    id: "user-1",
    email: "legacy@example.com",
    fullName: "Legacy User",
    role: UserRole.STUDENT,
    tenantId: null
  };

  const usersService = {
    findAuthUserByEmail: createAsyncMock<[string], typeof authUser | null>(async () => authUser),
    findById: createAsyncMock<[string, string | null], typeof safeUser>(async () => safeUser)
  };
  const jwtService = {
    signAsync: createAsyncMock(async () => "signed-jwt")
  };
  const prisma = {
    tenant: {
      findUnique: createAsyncMock(async () => null)
    }
  };

  const service = new AuthService(
    usersService as never,
    jwtService as never,
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );

  const result = await service.login({
    email: "  LEGACY@example.com  ",
    password: "short1"
  });

  assert.deepEqual(usersService.findAuthUserByEmail.calls[0], ["legacy@example.com"]);
  assert.equal(result.accessToken, "signed-jwt");
  assert.deepEqual(result.user, safeUser);
});
