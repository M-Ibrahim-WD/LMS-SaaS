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
      description=""
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
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="field-label">Full Name</span>
        <input
          className="field-input"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        </label>

        <label className="block">
          <span className="field-label">Email</span>
        <input
          className="field-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        </label>

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
        ) : null}

        {role === "STUDENT" ? (
          <label className="block">
            <span className="field-label">Instructor Invite Code</span>
            <input
              className="field-input"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              required
            />
          </label>
        ) : null}

        <label className="block">
          <span className="field-label">Password</span>
        <input
          className="field-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        </label>

        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
    </AuthPanel>
  );
}


