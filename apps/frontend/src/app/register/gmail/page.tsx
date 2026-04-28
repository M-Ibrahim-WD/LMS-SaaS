"use client";

import { Suspense, type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPanel } from "../../../components/auth-panel";
import { PasswordInput } from "../../../components/password-input";
import { StatusBanner } from "../../../components/status-banner";
import { apiFetch } from "../../../lib/api/client";
import { setAuthCookie } from "../../../lib/auth/session";
import { useAuthStore } from "../../../store/auth.store";

type CompleteGoogleRegistrationResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
    isSuperAdmin?: boolean;
    mustChangePassword?: boolean;
    adminPermissions?: Array<
      | "VIEW_OVERVIEW"
      | "REVIEW_TENANTS"
      | "MANAGE_TENANTS"
      | "REVIEW_STUDENTS"
      | "REVIEW_INSTRUCTORS"
      | "MANAGE_USERS"
      | "REVIEW_COURSES"
      | "REVIEW_PAYMENTS"
      | "MANAGE_PLANS"
      | "REVIEW_ADMINS"
      | "HANDLE_SUPPORT"
      | "MANAGE_HOMEPAGE"
    >;
    tenantId: string | null;
    tenant?: {
      id: string;
      name: string;
    } | null;
  };
  message?: string;
};

function GmailRegistrationContent() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const fullName = useMemo(() => searchParams.get("fullName") ?? "", [searchParams]);

  const [role, setRole] = useState<"INSTRUCTOR" | "STUDENT">("INSTRUCTOR");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token || !email || !fullName) {
      setError("This Gmail registration session is incomplete. Please start again.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch<CompleteGoogleRegistrationResponse>(
        "/auth/google/complete-registration",
        {
          method: "POST",
          body: JSON.stringify({
            token,
            role,
            password,
            organizationName: role === "INSTRUCTOR" ? organizationName.trim() : undefined,
            inviteCode: role === "STUDENT" ? inviteCode.trim().toUpperCase() : undefined
          })
        }
      );

      setSession({
        accessToken: response.accessToken,
        tenant: response.user.tenant ?? null,
        user: response.user
      });
      setAuthCookie(response.accessToken);
      router.push("/dashboard");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Could not complete Gmail registration."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel
      title="Complete Gmail Registration"
      description=""
      footer={
        <p className="text-center text-sm text-slate-600">
          Back to{" "}
          <Link
            href="/register"
            className="font-medium text-sky-700 underline underline-offset-4 transition hover:text-sky-800"
          >
            register
          </Link>
        </p>
      }
    >
      <div className="mb-5 rounded-[24px] border border-sky-200 bg-sky-50 p-4">
        <p className="section-kicker">Gmail Information</p>
        <p className="mt-3 text-sm font-semibold text-slate-900">{fullName}</p>
        <p className="mt-1 text-sm text-slate-600">{email}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="field-label">Role</span>
          <select
            className="field-select"
            value={role}
            onChange={(event) => setRole(event.target.value as "INSTRUCTOR" | "STUDENT")}
          >
            <option value="INSTRUCTOR">Instructor</option>
            <option value="STUDENT">Student</option>
          </select>
        </label>

        {role === "INSTRUCTOR" ? (
          <label className="block">
            <span className="field-label">Organization Name</span>
            <input
              className="field-input"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
            />
          </label>
        ) : (
          <label className="block">
            <span className="field-label">Instructor Invite Code</span>
            <input
              className="field-input"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              required
            />
          </label>
        )}

        <label className="block">
          <span className="field-label">Create Password</span>
          <PasswordInput
            className="field-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Complete account creation"}
        </button>
      </form>
    </AuthPanel>
  );
}

export default function GmailRegistrationPage() {
  return (
    <Suspense
      fallback={
        <AuthPanel title="Complete Gmail Registration" description="">
          <StatusBanner>Preparing Gmail registration...</StatusBanner>
        </AuthPanel>
      }
    >
      <GmailRegistrationContent />
    </Suspense>
  );
}
