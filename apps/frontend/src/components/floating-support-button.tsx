"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 13h4l1.5 2h5L16 13h4" />
    </svg>
  );
}

function PlusMessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 15.5h8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11.5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20 7 17H5.5A2.5 2.5 0 0 1 3 14.5v-8A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H17" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7v4M17 9h4" />
    </svg>
  );
}

function ReplyArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m10 8-4 4 4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h7.5a4.5 4.5 0 0 1 4.5 4.5V17" />
    </svg>
  );
}

export function FloatingSupportButton() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadSupportQuery = useQuery({
    queryKey: ["conversations", "floating-support-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && user && user.role !== "ADMIN" && !user.isSuperAdmin)
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const unreadConversations = unreadSupportQuery.data ?? [];
  const unreadCount = unreadConversations.length;
  const latestUnread = unreadConversations[0] ?? null;

  const statusText = useMemo(() => {
    if (unreadSupportQuery.isLoading) {
      return "Checking support updates...";
    }

    if (unreadCount > 0) {
      return `${unreadCount} unread ${unreadCount === 1 ? "reply" : "replies"}`;
    }

    return "No unread support replies";
  }, [unreadCount, unreadSupportQuery.isLoading]);

  const shouldRender =
    Boolean(hasHydrated && accessToken && user) &&
    user?.role !== "ADMIN" &&
    !user?.isSuperAdmin &&
    pathname !== "/support";

  if (!shouldRender) {
    return null;
  }

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div
        className={`surface-card-strong w-[min(92vw,22rem)] rounded-[28px] p-5 transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Support</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">Need help quickly?</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{statusText}</p>
            </div>
            <span
              className={`inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                unreadCount > 0
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {unreadCount > 0 ? `${unreadCount} unread` : "All clear"}
            </span>
          </div>

          {latestUnread ? (
            <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Latest unread
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {latestUnread.requester?.fullName ?? "Support conversation"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                {latestUnread.latestMessage?.body ?? "A support update is waiting for you."}
              </p>
              <Link
                href={`/support?conversationId=${latestUnread.id}`}
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                <ReplyArrowIcon />
                Open latest reply
              </Link>
            </div>
          ) : null}

          <div className={`mt-5 grid gap-3 ${latestUnread ? "" : "sm:grid-cols-2"}`}>
            <Link
              href="/support"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <InboxIcon />
              Inbox
            </Link>
            <Link
              href="/support?compose=1"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <PlusMessageIcon />
              New request
            </Link>
          </div>
      </div>

      <button
        type="button"
        aria-label={open ? "Close support panel" : "Open support panel"}
        title="Support"
        onClick={() => setOpen((current) => !current)}
        className={`group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_20px_45px_-18px_rgba(5,150,105,0.75)] transition duration-200 hover:-translate-y-1 hover:bg-emerald-700 hover:shadow-[0_24px_55px_-18px_rgba(5,150,105,0.82)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 ${
          unreadCount > 0 ? "support-launcher-pulse" : ""
        }`}
      >
        {unreadCount > 0 ? (
          <span className="pointer-events-none absolute inset-0 rounded-full border border-emerald-300/80 support-launcher-ring" />
        ) : null}
        <SupportHeadsetIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Support
        </span>
      </button>
    </div>
  );
}
