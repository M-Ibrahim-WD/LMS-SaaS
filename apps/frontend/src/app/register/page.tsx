"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AuthPanel } from "../../components/auth-panel";
import { StatusBanner } from "../../components/status-banner";
import { apiFetch, getResolvedApiUrl } from "../../lib/api/client";

type RegisterResponse = {
  requiresEmailVerification?: boolean;
  email?: string;
  message?: string;
};

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

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"INSTRUCTOR" | "STUDENT">("INSTRUCTOR");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const response = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        retryOnNetworkFailure: true,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          password,
          role,
          organizationName: role === "INSTRUCTOR" ? organizationName.trim() : undefined,
          inviteCode: role === "STUDENT" ? inviteCode.trim().toUpperCase() : undefined
        })
      });

      setSuccessMessage(
        response.message ??
          `Your account was created. Please verify ${response.email ?? email.trim().toLowerCase()} from your email inbox.`
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed. Please verify your data.");
    } finally {
      setLoading(false);
    }
  }

  function startGoogleRegistration() {
    const apiBase = getResolvedApiUrl();

    if (role === "INSTRUCTOR" && !organizationName.trim()) {
      setError("Organization name is required before continuing with Google.");
      return;
    }

    if (role === "STUDENT" && !inviteCode.trim()) {
      setError("Instructor invite code is required before continuing with Google.");
      return;
    }

    const params = new URLSearchParams({
      intent: "register",
      role
    });

    if (role === "INSTRUCTOR") {
      params.set("organizationName", organizationName.trim());
    } else {
      params.set("inviteCode", inviteCode.trim().toUpperCase());
    }

    window.location.href = `${apiBase}/auth/google/start?${params.toString()}`;
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
      <div className="space-y-4">
        <button
          type="button"
          onClick={startGoogleRegistration}
          className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          <GoogleIcon />
          Register with Google
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
          {successMessage ? <StatusBanner variant="success">{successMessage}</StatusBanner> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>
      </div>
    </AuthPanel>
  );
}
