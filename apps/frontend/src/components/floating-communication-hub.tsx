"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api/client";
import { createConversationSocket } from "../lib/communication/socket";
import {
  formatConversationDate,
  formatRelativeConversationTime,
  groupConversationMessages,
  type ConversationDetail,
  type ConversationSummary
} from "../lib/communication/types";
import { useAuthStore } from "../store/auth.store";

type HubPane = "DIRECT" | "SUPPORT" | null;

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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11 7-5 5 5 5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m10 8-4 4 4 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h7.5a4.5 4.5 0 0 1 4.5 4.5V17" />
    </svg>
  );
}

export function FloatingCommunicationHub() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [open, setOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<HubPane>(null);
  const [composerText, setComposerText] = useState("");
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

  const directConversationsQuery = useQuery({
    queryKey: ["conversations", "hub-direct-open"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=DIRECT&status=OPEN", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const supportConversationsQuery = useQuery({
    queryKey: ["conversations", "hub-support-open"],
    queryFn: () =>
      apiFetch<ConversationSummary[]>("/conversations?kind=SUPPORT&status=OPEN", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender)
  });

  const activeConversationQuery = useQuery({
    queryKey: ["conversation", "hub", activeConversationId],
    queryFn: () =>
      apiFetch<ConversationDetail>(`/conversations/${activeConversationId}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(shouldRender && activeConversationId)
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${activeConversationId}/messages`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          body: composerText.trim()
        })
      }),
    onSuccess: async () => {
      setComposerText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", "hub", activeConversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch(`/conversations/${conversationId}/read`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async (_, conversationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["conversation", "hub", conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] })
      ]);
    }
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
        if (activeConversationId) {
          setActiveConversationId(null);
          setActivePane(null);
          return;
        }
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeConversationId, open]);

  useEffect(() => {
    if (!accessToken || !activeConversationId) {
      return;
    }

    const socket = createConversationSocket(accessToken);

    socket.on("connect", () => {
      socket.emit("conversation.join", { conversationId: activeConversationId });
    });

    const onRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation", "hub", activeConversationId] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    socket.on("conversation.message.created", onRefresh);
    socket.on("conversation.read.updated", onRefresh);
    socket.on("conversation.status.updated", onRefresh);
    socket.on("support.assignment.updated", onRefresh);

    return () => {
      socket.emit("conversation.leave", { conversationId: activeConversationId });
      socket.off("conversation.message.created", onRefresh);
      socket.off("conversation.read.updated", onRefresh);
      socket.off("conversation.status.updated", onRefresh);
      socket.off("support.assignment.updated", onRefresh);
      socket.disconnect();
    };
  }, [accessToken, activeConversationId, queryClient]);

  const unreadMessages = unreadMessagesQuery.data ?? [];
  const unreadSupport = unreadSupportQuery.data ?? [];
  const directConversations = directConversationsQuery.data ?? [];
  const supportConversations = supportConversationsQuery.data ?? [];
  const totalUnread = unreadMessages.length + unreadSupport.length;
  const activeConversation = activeConversationQuery.data ?? null;

  useEffect(() => {
    if (!open || !activeConversation || activeConversation.unreadCount === 0 || !activeConversationId) {
      return;
    }

    void markReadMutation.mutateAsync(activeConversationId);
  }, [activeConversation, activeConversationId, markReadMutation, open]);

  const summaryText = useMemo(() => {
    if (
      unreadMessagesQuery.isLoading ||
      unreadSupportQuery.isLoading ||
      directConversationsQuery.isLoading ||
      supportConversationsQuery.isLoading
    ) {
      return "Checking your inboxes...";
    }

    if (totalUnread > 0) {
      return `${totalUnread} unread update${totalUnread === 1 ? "" : "s"} waiting`;
    }

    return "Messages and support are all clear";
  }, [
    totalUnread,
    unreadMessagesQuery.isLoading,
    unreadSupportQuery.isLoading,
    directConversationsQuery.isLoading,
    supportConversationsQuery.isLoading
  ]);

  const latestDirectConversation = unreadMessages[0] ?? directConversations[0] ?? null;
  const latestSupportConversation = unreadSupport[0] ?? supportConversations[0] ?? null;

  const groupedMessages = activeConversation ? groupConversationMessages(activeConversation.messages) : [];

  if (!shouldRender) {
    return null;
  }

  const showMessagesSection = pathname !== "/messages";
  const showSupportSection = pathname !== "/support";

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <div
        className={`surface-card-strong w-[min(94vw,25rem)] rounded-[30px] p-5 transition duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
        {activeConversation ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversationId(null);
                    setActivePane(null);
                    setComposerText("");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <BackIcon />
                  Back
                </button>
                <p className="section-kicker mt-3">
                  {activePane === "DIRECT" ? "Live Messages" : "Live Support"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {activePane === "DIRECT"
                    ? activeConversation.otherParticipant?.fullName ?? "Conversation"
                    : activeConversation.requester?.fullName ?? "Support conversation"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {activePane === "DIRECT"
                    ? "Reply here without leaving the page."
                    : "Continue the support conversation directly from the hub."}
                </p>
              </div>
              <Link
                href={activePane === "DIRECT" ? `/messages?conversationId=${activeConversation.id}` : `/support?conversationId=${activeConversation.id}`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Full page
                <ArrowIcon />
              </Link>
            </div>

            <div className="ui-scrollbar max-h-[22rem] space-y-4 overflow-y-auto pr-1">
              {activeConversationQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Loading conversation...
                </p>
              ) : groupedMessages.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No messages yet. Send the first one.
                </p>
              ) : (
                groupedMessages.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex justify-center">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                        {group.label}
                      </span>
                    </div>
                    {group.items.map((message) => {
                      const isMine = message.sender.id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`max-w-[88%] rounded-[22px] px-4 py-3 shadow-sm ${
                            isMine
                              ? activePane === "DIRECT"
                                ? "ml-auto bg-sky-600 text-white"
                                : "ml-auto bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className="text-xs font-semibold opacity-80">
                            {isMine ? "You" : message.sender.fullName}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                            {message.body}
                          </p>
                          <p className={`mt-3 text-xs ${isMine ? "text-white/80" : "text-slate-500"}`}>
                            {formatConversationDate(message.createdAt)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex flex-col gap-3">
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  placeholder={
                    activePane === "DIRECT"
                      ? "Write your reply..."
                      : activeConversation.status === "OPEN"
                        ? "Write a support reply..."
                        : "This support conversation is closed."
                  }
                  disabled={activePane === "SUPPORT" && activeConversation.status !== "OPEN"}
                  className="min-h-24 rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => void sendMessageMutation.mutateAsync()}
                  disabled={
                    sendMessageMutation.isPending ||
                    !composerText.trim() ||
                    (activePane === "SUPPORT" && activeConversation.status !== "OPEN")
                  }
                  className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
                    activePane === "DIRECT"
                      ? "bg-sky-600 hover:bg-sky-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {sendMessageMutation.isPending ? "Sending..." : "Send reply"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
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
                        {latestDirectConversation?.latestMessage?.body ?? "Jump into your direct chat inbox."}
                      </p>
                      {latestDirectConversation?.lastMessageAt ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700/70">
                          {formatRelativeConversationTime(latestDirectConversation.lastMessageAt)}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
                      <MessageIcon />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!latestDirectConversation) {
                          return;
                        }
                        setActiveConversationId(latestDirectConversation.id);
                        setActivePane("DIRECT");
                      }}
                      disabled={!latestDirectConversation}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Live chat
                      <ReplyIcon />
                    </button>
                    <Link
                      href="/messages"
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
                    >
                      Open inbox
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
                        {latestSupportConversation?.latestMessage?.body ?? "Open a request or continue with support."}
                      </p>
                      {latestSupportConversation?.lastMessageAt ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700/70">
                          {formatRelativeConversationTime(latestSupportConversation.lastMessageAt)}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                      <SupportIcon />
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!latestSupportConversation) {
                          return;
                        }
                        setActiveConversationId(latestSupportConversation.id);
                        setActivePane("SUPPORT");
                      }}
                      disabled={!latestSupportConversation}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Live chat
                      <ReplyIcon />
                    </button>
                    <Link
                      href={latestSupportConversation ? "/support" : "/support?compose=1"}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                    >
                      {latestSupportConversation ? "Open inbox" : "New request"}
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
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
