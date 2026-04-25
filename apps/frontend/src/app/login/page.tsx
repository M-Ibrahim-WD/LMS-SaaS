"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthPanel } from "../../components/auth-panel";
import { StatusBanner } from "../../components/status-banner";
import { apiFetch, getResolvedApiUrl } from "../../lib/api/client";
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
      | "HANDLE_SUPPORT"
      | "MANAGE_HOMEPAGE"
    >;
    tenantId: string | null;
    tenant?: {
      id: string;
      name: string;
    } | null;
  };
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 4 1.5l2.7-2.6C17 2.9 14.7 2 12 2 6.9 2 2.8 6.5 2.8 12S6.9 22 12 22c6.1 0 9.2-4.3 9.2-10.3 0-.7-.1-1.2-.2-1.5H12Z" />
      <path fill="#34A853" d="M3.9 7.3l3.2 2.3C7.9 7.6 9.8 6 12 6c1.9 0 3.2.8 4 1.5l2.7-2.6C17 2.9 14.7 2 12 2 8 2 4.5 4.3 3 7.7l.9-.4Z" />
      <path fill="#FBBC05" d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3-2.5c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2l-3.3 2.6C4.7 19.7 8.1 22 12 22Z" />
      <path fill="#4285F4" d="M21.2 11.7c0-.7-.1-1.2-.2-1.5H12v3.9h5.5c-.3 1.3-1.5 3.9-5.5 3.9-2.6 0-4.8-1.8-5.6-4.2l-3.3 2.6C4.7 19.7 8.1 22 12 22c6.1 0 9.2-4.3 9.2-10.3Z" />
    </svg>
  );
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
        retryOnNetworkFailure: true,
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });

      setSession({
        accessToken: response.accessToken,
        tenant: response.user.tenant ?? null,
        user: response.user
      });
      setAuthCookie(response.accessToken);
      router.push(
        response.user.mustChangePassword && response.user.role === "ADMIN"
          ? "/admin/change-password"
          : "/dashboard"
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleLogin() {
    const apiBase = getResolvedApiUrl();
    window.location.href = `${apiBase}/auth/google/start?intent=login`;
  }

  return (
    <AuthPanel
      title="Login"
      description=""
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
      <div className="space-y-4">
        <button
          type="button"
          onClick={startGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <GoogleIcon />
          Continue with Gmail
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-slate-400">
            <span className="bg-white px-3">or</span>
          </div>
        </div>

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

          <p className="text-center text-sm text-slate-600">
            Forgot your password?{" "}
            <Link
              href="/forgot-password"
              className="font-medium text-sky-700 underline underline-offset-4 transition hover:text-sky-800"
            >
              Click here to recover it.
            </Link>
          </p>
        </form>
      </div>
    </AuthPanel>
  );
}
