"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api/client";
import {
  formatRelativeConversationTime,
  type ConversationSummary
} from "../lib/communication/types";
import { useAuthStore } from "../store/auth.store";

function HubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A2.5 2.5 0 0 1 6.5 6h5A2.5 2.5 0 0 1 14 8.5v4A2.5 2.5 0 0 1 11.5 15H9l-3 2v-2H6.5A2.5 2.5 0 0 1 4 12.5v-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10.5A2.5 2.5 0 0 1 15.5 8H18a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 18 17h-.5v2l-3-2h-1" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 7 6.5 5 6.5-5" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 1 15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12v2.5A2.5 2.5 0 0 0 7 17h1.5v-5H7a2.5 2.5 0 0 0-2.5 2.5Zm15 0A2.5 2.5 0 0 0 17 12h-1.5v5H17a2.5 2.5 0 0 0 2.5-2.5V12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5h5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m13 7 5 5-5 5" />
    </svg>
  );
}

export function FloatingCommunicationHub() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const shouldRender =
    Boolean(hasHydrated && accessToken && user) &&
    user?.role !== "ADMIN";

  const unreadMessagesQuery = useQuery({
    queryKey: ["conversations", "hub-direct-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=DIRECT&status=OPEN&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const unreadSupportQuery = useQuery({
    queryKey: ["conversations", "hub-support-unread"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
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

  const unreadMessages = unreadMessagesQuery.data ?? [];
  const unreadSupport = unreadSupportQuery.data ?? [];
  const totalUnread = unreadMessages.length + unreadSupport.length;

  const summaryText = useMemo(() => {
    if (unreadMessagesQuery.isLoading || unreadSupportQuery.isLoading) {
      return "Checking your inboxes...";
    }

    if (totalUnread > 0) {
      return `${totalUnread} unread update${totalUnread === 1 ? "" : "s"} waiting`;
    }

    return "Messages and support are all clear";
  }, [totalUnread, unreadMessagesQuery.isLoading, unreadSupportQuery.isLoading]);

  if (!shouldRender) {
    return null;
  }

  const showMessagesSection = pathname !== "/messages";
  const showSupportSection = pathname !== "/support";

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div
        className={`surface-card-strong w-[min(94vw,24rem)] rounded-[30px] p-5 transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">Communication Hub</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Messages and support</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{summaryText}</p>
          </div>
          <span
            className={`inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              totalUnread > 0
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {totalUnread > 0 ? `${totalUnread} unread` : "All clear"}
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {showMessagesSection ? (
            <div className="rounded-[22px] border border-sky-200 bg-sky-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                    Messages
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {unreadMessages.length > 0
                      ? `${unreadMessages.length} unread direct ${unreadMessages.length === 1 ? "message" : "messages"}`
                      : "No unread direct messages"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                    {unreadMessages[0]?.latestMessage?.body ?? "Jump into your direct chat inbox."}
                  </p>
                  {unreadMessages[0]?.lastMessageAt ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700/70">
                      {formatRelativeConversationTime(unreadMessages[0].lastMessageAt)}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
                  <MessageIcon />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={unreadMessages[0] ? `/messages?conversationId=${unreadMessages[0].id}` : "/messages"}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  Open inbox
                  <ArrowIcon />
                </Link>
                <Link
                  href="/messages"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                >
                  Start chat
                </Link>
              </div>
            </div>
          ) : null}

          {showSupportSection ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Support
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {unreadSupport.length > 0
                      ? `${unreadSupport.length} unread support ${unreadSupport.length === 1 ? "reply" : "replies"}`
                      : "No unread support replies"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                    {unreadSupport[0]?.latestMessage?.body ?? "Open a request or continue with support."}
                  </p>
                  {unreadSupport[0]?.lastMessageAt ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/70">
                      {formatRelativeConversationTime(unreadSupport[0].lastMessageAt)}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                  <SupportIcon />
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={unreadSupport[0] ? `/support?conversationId=${unreadSupport[0].id}` : "/support"}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                >
                  Open inbox
                  <ArrowIcon />
                </Link>
                <Link
                  href="/support?compose=1"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  New request
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-label={open ? "Close communication hub" : "Open communication hub"}
        title="Communication"
        onClick={() => setOpen((current) => !current)}
        className={`group relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-1 hover:bg-slate-900 hover:shadow-[0_24px_55px_-18px_rgba(15,23,42,0.82)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 ${
          totalUnread > 0 ? "hub-launcher-pulse" : ""
        }`}
      >
        {totalUnread > 0 ? (
          <span className="pointer-events-none absolute inset-0 rounded-full border border-slate-300/80 hub-launcher-ring" />
        ) : null}
        <HubIcon />
        {totalUnread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            {totalUnread}
          </span>
        ) : null}
        <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Communication
        </span>
      </button>
    </div>
  );
}
