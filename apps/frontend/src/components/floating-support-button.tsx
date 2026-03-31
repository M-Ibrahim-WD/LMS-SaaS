"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "../lib/api/client";
import type { ConversationSummary } from "../lib/communication/types";
import { useAuthStore } from "../store/auth.store";

function SupportHeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 1 15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12v2.5A2.5 2.5 0 0 0 7 17h1.5v-5H7a2.5 2.5 0 0 0-2.5 2.5Zm15 0A2.5 2.5 0 0 0 17 12h-1.5v5H17a2.5 2.5 0 0 0 2.5-2.5V12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5h5" />
    </svg>
  );
}

export function FloatingSupportButton() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated || !accessToken || !user) {
    return null;
  }

  if (user.role === "ADMIN" || user.isSuperAdmin) {
    return null;
  }

  if (pathname === "/support") {
    return null;
  }

  const unreadSupportQuery = useQuery({
    queryKey: ["conversations", "floating-support-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN&unreadOnly=true", {
        token: accessToken
      }),
    enabled: Boolean(accessToken)
  });

  const unreadCount = unreadSupportQuery.data?.length ?? 0;

  return (
    <Link
      href="/support"
      aria-label="Open support chat"
      title="Support"
      className="group fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_20px_45px_-18px_rgba(5,150,105,0.75)] transition duration-200 hover:-translate-y-1 hover:bg-emerald-700 hover:shadow-[0_24px_55px_-18px_rgba(5,150,105,0.82)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
    >
      <SupportHeadsetIcon />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        Support
      </span>
    </Link>
  );
}
