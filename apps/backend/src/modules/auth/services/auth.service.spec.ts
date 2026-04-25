import assert from "node:assert/strict";
import test from "node:test";
import * as bcrypt from "bcrypt";
import { ExternalAuthProvider, UserRole } from "@prisma/client";
import { AuthService } from "./auth.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("register creates student, joins instructor by invite code, and requires email verification", async () => {
  const createdStudent = {
    id: "student-1",
    email: "student@example.com",
    fullName: "Student User",
    role: UserRole.STUDENT,
    tenantId: null,
    emailVerifiedAt: null,
    primaryAuthProvider: ExternalAuthProvider.LOCAL
  };

  const hydratedStudent = {
    ...createdStudent,
    tenantId: "tenant-1"
  };

  const usersService = {
    create: createAsyncMock<
      [
        {
          email: string;
          fullName: string;
          role: UserRole;
          tenantId: string | null;
          password: string;
          emailVerifiedAt: Date | null;
          primaryAuthProvider: ExternalAuthProvider;
        }
      ],
      typeof createdStudent
    >(async () => createdStudent),
    findById: createAsyncMock<[string, string | null], typeof hydratedStudent>(async () => hydratedStudent)
  };
  const jwtService = {
    signAsync: createAsyncMock(async () => "signed-jwt")
  };
  const studentInstructorsService = {
    createRelationFromInviteCode: createAsyncMock(async () => undefined)
  };
  const notificationsService = {
    create: createAsyncMock(async () => undefined)
  };
  const mailerService = {
    sendMail: createAsyncMock(async () => undefined)
  };
  const prisma = {
    tenant: {
      findUnique: createAsyncMock(async () => ({ id: "tenant-1" }))
    },
    emailVerificationToken: {
      create: createAsyncMock(async () => undefined)
    }
  };
  const subscriptionsService = {
    assertTenantCanAddStudent: createAsyncMock(async () => undefined)
  };
  const configService = {
    get: (key: string) => {
      if (key === "app.publicWebUrl") {
        return "http://localhost:3000";
      }
      return "";
    }
  };

  const service = new AuthService(
    usersService as never,
    jwtService as never,
    prisma as never,
    {} as never,
    studentInstructorsService as never,
    notificationsService as never,
    subscriptionsService as never,
    mailerService as never,
    configService as never
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
    password: "secret",
    emailVerifiedAt: null,
    primaryAuthProvider: ExternalAuthProvider.LOCAL
  });
  assert.deepEqual(studentInstructorsService.createRelationFromInviteCode.calls[0], [
    "student-1",
    "ABC123"
  ]);
  assert.deepEqual(subscriptionsService.assertTenantCanAddStudent.calls[0], ["tenant-1"]);
  assert.deepEqual(usersService.findById.calls[0], ["student-1", null]);
  assert.equal(jwtService.signAsync.calls.length, 0);
  assert.equal(prisma.emailVerificationToken.create.calls.length, 1);
  assert.equal(mailerService.sendMail.calls.length, 1);
  assert.equal(result.requiresEmailVerification, true);
  assert.equal(result.email, "student@example.com");
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
    password: hashed,
    emailVerifiedAt: new Date(),
    isSuperAdmin: false,
    adminPermissions: [],
    mustChangePassword: false
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
  const mailerService = {
    sendMail: createAsyncMock(async () => undefined)
  };
  const configService = {
    get: () => ""
  };

  const service = new AuthService(
    usersService as never,
    jwtService as never,
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    mailerService as never,
    configService as never
  );

  const result = await service.login({
    email: "  LEGACY@example.com  ",
    password: "short1"
  });

  assert.deepEqual(usersService.findAuthUserByEmail.calls[0], ["legacy@example.com"]);
  assert.equal(result.accessToken, "signed-jwt");
  assert.deepEqual(result.user, safeUser);
});
