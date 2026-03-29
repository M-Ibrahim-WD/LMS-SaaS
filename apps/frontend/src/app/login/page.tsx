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
    >;
    tenantId: string | null;
    tenant?: {
      id: string;
      name: string;
    } | null;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      setSession({
        accessToken: response.accessToken,
        tenant: response.user.tenant ?? null,
        user: response.user
      });
      setAuthCookie(response.accessToken);
      router.push(response.user.mustChangePassword && response.user.role === "ADMIN" ? "/admin/change-password" : "/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPanel
      title="Login"
      description="Access your LMS account with a calmer, role-aware workspace waiting on the other side."
      footer={
        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-sky-700 underline underline-offset-4 transition hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          >
            Register
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </AuthPanel>
  );
}
