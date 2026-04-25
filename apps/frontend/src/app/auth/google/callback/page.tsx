"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPanel } from "../../../../components/auth-panel";
import { StatusBanner } from "../../../../components/status-banner";
import { apiFetch } from "../../../../lib/api/client";
import type { AdminPermission } from "../../../../lib/auth/token";
import { setAuthCookie } from "../../../../lib/auth/session";
import { useAuthStore } from "../../../../store/auth.store";

type AuthResponse = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
  isSuperAdmin?: boolean;
  mustChangePassword?: boolean;
  adminPermissions?: AdminPermission[];
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
  } | null;
};

function GoogleAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useMemo(() => searchParams.get("accessToken") ?? "", [searchParams]);
  const error = useMemo(() => searchParams.get("error") ?? "", [searchParams]);
  const nextPath = useMemo(() => searchParams.get("nextPath") ?? "/dashboard", [searchParams]);
  const setSession = useAuthStore((state) => state.setSession);
  const [status, setStatus] = useState("Signing you in with Google...");

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      if (error) {
        setStatus(error);
        return;
      }

      if (!accessToken) {
        setStatus("Google sign-in did not return an access token.");
        return;
      }

      try {
        const user = await apiFetch<AuthResponse>("/auth/me", {
          token: accessToken
        });

        if (cancelled) {
          return;
        }

        setSession({
          accessToken,
          tenant: user.tenant ?? null,
          user
        });
        setAuthCookie(accessToken);
        router.replace(nextPath);
      } catch (callbackError) {
        if (!cancelled) {
          setStatus(
            callbackError instanceof Error
              ? callbackError.message
              : "Could not finish Google sign-in."
          );
        }
      }
    }

    void finishLogin();

    return () => {
      cancelled = true;
    };
  }, [accessToken, error, nextPath, router, setSession]);

  return (
    <AuthPanel title="Google Sign-In" description="">
      <StatusBanner variant={error ? "error" : "success"}>{status}</StatusBanner>
    </AuthPanel>
  );
}

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthPanel title="Google Sign-In" description="">
          <StatusBanner>Preparing Google sign-in...</StatusBanner>
        </AuthPanel>
      }
    >
      <GoogleAuthCallbackContent />
    </Suspense>
  );
}
