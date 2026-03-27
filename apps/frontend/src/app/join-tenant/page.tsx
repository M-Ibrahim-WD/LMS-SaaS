"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api/client";
import { useRequireAuth } from "../../hooks/use-require-auth";

interface JoinResponse {
  instructor: {
    id: string;
    fullName: string;
    email: string;
    tenant?: {
      id: string;
      name: string;
      inviteCode: string;
    } | null;
  };
}

export default function JoinTenantPage() {
  const router = useRouter();
  const { accessToken, hasHydrated } = useRequireAuth({ roles: ["STUDENT"] });

  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiFetch<JoinResponse>("/student/instructors/join", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          inviteCode: inviteCode || undefined
        })
      });
      router.push("/dashboard");
    } catch {
      setError("Unable to join instructor. Please verify the invite code.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasHydrated) {
    return <main className="p-8">Loading session...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-6">
      <form onSubmit={onSubmit} className="w-full rounded-xl bg-white p-6 shadow-md">
        <h1 className="text-2xl font-semibold">Join Instructor</h1>
        <p className="mt-1 text-sm text-slate-600">Ask your instructor for the invite code</p>

        <label className="mt-3 block text-sm font-medium">Invite Code</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value)}
        />

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Joining..." : "Join Instructor"}
        </button>
      </form>
    </main>
  );
}
