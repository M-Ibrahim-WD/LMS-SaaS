"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentCard } from "../../../components/content-card";
import { PageShell } from "../../../components/page-shell";
import { PasswordInput } from "../../../components/password-input";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import { setAuthCookie } from "../../../lib/auth/session";
import { useAuthStore } from "../../../store/auth.store";

type ChangePasswordResponse = {
  accessToken: string;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    fullName: string;
    bio?: string | null;
    profileImage?: string | null;
    role: "ADMIN";
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
};

export default function AdminChangePasswordPage() {
  const router = useRouter();
  const { accessToken, user, hasHydrated } = useRequireAuth({ roles: ["ADMIN"] });
  const setSession = useAuthStore((state) => state.setSession);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !user) {
      return;
    }

    if (!user.mustChangePassword) {
      router.replace("/admin");
    }
  }, [hasHydrated, router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.trim().length < 8) {
      setMessage("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The password confirmation does not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch<ChangePasswordResponse>("/auth/change-password", {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ password: password.trim() })
      });

      setSession({
        accessToken: response.accessToken,
        tenant: response.user.tenant ?? null,
        user: response.user
      });
      setAuthCookie(response.accessToken);
      setMessage("Password updated successfully.");
      router.replace("/admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="Change Password"
      description="This delegated admin account was created or reset by the super admin. Set a private password to continue."
    >
      <ContentCard className="mx-auto max-w-xl p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">New password</span>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Confirm password</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              required
            />
          </label>

          {message ? <StatusBanner variant={message.includes("successfully") ? "success" : "error"}>{message}</StatusBanner> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-950 px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>
      </ContentCard>
    </PageShell>
  );
}
