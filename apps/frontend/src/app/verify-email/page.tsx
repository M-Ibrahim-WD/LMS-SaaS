"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthPanel } from "../../components/auth-panel";
import { StatusBanner } from "../../components/status-banner";
import { apiFetch } from "../../lib/api/client";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setError("This verification link is missing its token.");
        setMessage("");
        return;
      }

      try {
        const response = await apiFetch<{ message: string }>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token })
        });

        if (!cancelled) {
          setMessage(response.message);
          setError(null);
        }
      } catch (verificationError) {
        if (!cancelled) {
          setError(
            verificationError instanceof Error
              ? verificationError.message
              : "Could not verify this email address."
          );
          setMessage("");
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthPanel
      title="Verify Email"
      description=""
      footer={
        <p className="text-center text-sm text-slate-600">
          Continue to{" "}
          <Link
            href="/login"
            className="font-medium text-sky-700 underline underline-offset-4 transition hover:text-sky-800"
          >
            login
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {message ? <StatusBanner variant="success">{message}</StatusBanner> : null}
        {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
      </div>
    </AuthPanel>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthPanel title="Verify Email" description="">
          <StatusBanner>Loading verification details...</StatusBanner>
        </AuthPanel>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
