"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthPanel } from "../../components/auth-panel";
import { StatusBanner } from "../../components/status-banner";
import { apiFetch } from "../../lib/api/client";
import { setAuthCookie } from "../../lib/auth/session";
import { useAuthStore } from "../../store/auth.store";

interface AuthResponse {
  accessToken: string;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    fullName: string;
    role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
    tenantId: string | null;
    tenant?: {
      id: string;
      name: string;
    } | null;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"INSTRUCTOR" | "STUDENT">("INSTRUCTOR");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
          role,
          organizationName: role === "INSTRUCTOR" ? organizationName.trim() : undefined,
          inviteCode: role === "STUDENT" ? inviteCode.trim().toUpperCase() : undefined
        })
      });

      setSession({
        accessToken: response.accessToken,
        tenant: response.user.tenant ?? null,
        user: response.user
      });
      setAuthCookie(response.accessToken);
      router.push(response.user.role === "INSTRUCTOR" ? "/subscription" : "/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed. Please verify your data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel
      title="Register"
      description="Create your LMS account."
      footer={
        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-sky-700 underline underline-offset-4 transition hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        <label className="mt-4 block text-sm font-medium">Full Name</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />

        <label className="mt-4 block text-sm font-medium">Email</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label className="mt-4 block text-sm font-medium">Role</label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={role}
          onChange={(event) => setRole(event.target.value as "INSTRUCTOR" | "STUDENT")}
        >
          <option value="INSTRUCTOR">Instructor</option>
          <option value="STUDENT">Student</option>
        </select>

        {role === "INSTRUCTOR" ? (
          <>
            <label className="mt-4 block text-sm font-medium">Organization Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
            />
          </>
        ) : null}

        {role === "STUDENT" ? (
          <>
            <label className="mt-4 block text-sm font-medium">Instructor Invite Code</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              required
            />
          </>
        ) : null}

        <label className="mt-4 block text-sm font-medium">Password</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </AuthPanel>
  );
}
