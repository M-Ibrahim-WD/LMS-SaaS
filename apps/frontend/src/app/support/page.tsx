"use client";

export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AdminSiteMenu } from "../admin/_components/admin-site-menu";
import { NotificationCenter } from "../../components/notification-center";
import { PageShell } from "../../components/page-shell";
import { useConversationsWorkspace } from "../../hooks/use-conversations-workspace";
import { apiFetch } from "../../lib/api/client";
import { clearAuthCookie } from "../../lib/auth/session";
import {
  formatConversationDate,
  groupConversationMessages
} from "../../lib/communication/types";
import { useAuthStore } from "../../store/auth.store";

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 3 10 14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 3-7 18-4-7-7-4 18-7Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 7 6.5 5 6.5-5" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1 1 15 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12v2.5A2.5 2.5 0 0 0 7 17h1.5v-5H7a2.5 2.5 0 0 0-2.5 2.5Zm15 0A2.5 2.5 0 0 0 17 12h-1.5v5H17a2.5 2.5 0 0 0 2.5-2.5V12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 20.5h5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 7V5.5A2.5 2.5 0 0 0 11.5 3h-5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h5a2.5 2.5 0 0 0 2.5-2.5V17" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m17 8 4 4-4 4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" d="M5 7h14" />
      <path strokeLinecap="round" d="M5 12h14" />
      <path strokeLinecap="round" d="M5 17h14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}

function autosizeComposer(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "0px";
  const computed = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computed.lineHeight || "24");
  const verticalPadding =
    Number.parseFloat(computed.paddingTop || "0") + Number.parseFloat(computed.paddingBottom || "0");
  const minHeight = lineHeight + verticalPadding;
  const maxHeight = lineHeight * 3 + verticalPadding;
  const nextHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
}

function HeaderIconLink({
  href,
  label,
  children,
  badgeCount,
  showTooltip = true
}: {
  href: string;
  label: string;
  children: ReactNode;
  badgeCount?: number;
  showTooltip?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={showTooltip ? label : undefined}
      className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md"
    >
      {children}
      {showTooltip ? (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
        </span>
      ) : null}
      {badgeCount && badgeCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function HeaderIconButton({
  onClick,
  label,
  children,
  tone = "default",
  showTooltip = true
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  tone?: "default" | "danger";
  showTooltip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={showTooltip ? label : undefined}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-rose-200"
          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-emerald-200"
      }`}
    >
      {children}
      {showTooltip ? (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
        </span>
      ) : null}
    </button>
  );
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type:
    | "WELCOME"
    | "INSTRUCTOR_JOINED"
    | "PAYMENT_SUBMITTED"
    | "PAYMENT_APPROVED"
    | "PAYMENT_REJECTED"
    | "ENROLLMENT_CREATED"
    | "CERTIFICATE_ISSUED"
    | "DIRECT_MESSAGE_RECEIVED"
    | "SUPPORT_REPLY_RECEIVED"
    | "SUPPORT_ASSIGNED"
    | "SUPPORT_STATUS_CHANGED"
    | "GROUP_MESSAGE_RECEIVED"
    | "GROUP_ADDED"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEW_UPDATED"
    | "INTERVIEW_COMPLETED";
  isRead: boolean;
  createdAt: string;
};

function SupportSiteMenu({
  accessToken,
  canUseMessages
}: {
  accessToken?: string | null;
  canUseMessages: boolean;
}) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "support-page", "my"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "support-page", "unread-count"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/notifications/unread-count", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const directUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "support-page", "direct-unread"],
    queryFn: () =>
      apiFetch<Array<{ id: string }>>("/conversations?kind=DIRECT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && canUseMessages)
  });

  const supportUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "support-page", "support-unread"],
    queryFn: () =>
      apiFetch<Array<{ id: string }>>("/conversations?kind=SUPPORT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken)
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      apiFetch(`/notifications/${notificationId}/read`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
    }
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () =>
      apiFetch("/notifications/read-all", {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
    }
  });

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function onLogout() {
    clearSession();
    clearAuthCookie();
    router.push("/login");
  }

  const directUnreadCount = directUnreadConversationsQuery.data?.length ?? 0;
  const supportUnreadCount = supportUnreadConversationsQuery.data?.length ?? 0;

  return (
    <div className="flex items-start gap-2">
      <div className="hidden items-center gap-2 sm:flex">
        <NotificationCenter
          items={notificationsQuery.data}
          unreadCount={unreadCountQuery.data?.unreadCount ?? 0}
          isLoading={notificationsQuery.isLoading}
          isUpdating={
            markNotificationReadMutation.isPending || markAllNotificationsReadMutation.isPending
          }
          onMarkRead={(notificationId: string) =>
            markNotificationReadMutation.mutate(notificationId)
          }
          onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
        />
        <HeaderIconLink href="/support" label="Support" badgeCount={supportUnreadCount}>
          <SupportIcon />
        </HeaderIconLink>
        {canUseMessages ? (
          <HeaderIconLink href="/messages" label="Messages" badgeCount={directUnreadCount}>
            <MessageIcon />
          </HeaderIconLink>
        ) : null}
        <HeaderIconLink href="/profile" label="Profile">
          <ProfileIcon />
        </HeaderIconLink>
        <HeaderIconButton onClick={onLogout} label="Logout" tone="danger">
          <LogoutIcon />
        </HeaderIconButton>
      </div>

      <div ref={mobileMenuRef} className="relative self-start sm:hidden">
        <HeaderIconButton
          onClick={() => setMobileMenuOpen((current) => !current)}
          label="Menu"
          showTooltip={false}
        >
          <MenuIcon />
        </HeaderIconButton>

        {mobileMenuOpen ? (
          <div className="absolute left-0 top-[calc(100%+0.55rem)] z-30 flex w-[3.75rem] flex-col items-center gap-2 rounded-[28px] border border-slate-200 bg-white/55 p-2 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
            <NotificationCenter
              items={notificationsQuery.data}
              unreadCount={unreadCountQuery.data?.unreadCount ?? 0}
              isLoading={notificationsQuery.isLoading}
              isUpdating={
                markNotificationReadMutation.isPending || markAllNotificationsReadMutation.isPending
              }
              onMarkRead={(notificationId: string) =>
                markNotificationReadMutation.mutate(notificationId)
              }
              onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
              showTooltip={false}
            />
            <HeaderIconLink href="/support" label="Support" badgeCount={supportUnreadCount} showTooltip={false}>
              <SupportIcon />
            </HeaderIconLink>
            {canUseMessages ? (
              <HeaderIconLink href="/messages" label="Messages" badgeCount={directUnreadCount} showTooltip={false}>
                <MessageIcon />
              </HeaderIconLink>
            ) : null}
            <HeaderIconLink href="/profile" label="Profile" showTooltip={false}>
              <ProfileIcon />
            </HeaderIconLink>
            <HeaderIconButton onClick={onLogout} label="Logout" tone="danger" showTooltip={false}>
              <LogoutIcon />
            </HeaderIconButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SupportPage() {
  const workspace = useConversationsWorkspace({ kind: "SUPPORT" });
  const composeRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [mobilePane, setMobilePane] = useState<"list" | "chat">("list");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") !== "1") {
      return;
    }

    composeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    autosizeComposer(composerRef.current);
  }, [workspace.composerText]);

  if (!workspace.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Support Center</p>;
  }

  if (!workspace.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Support Center</p>;
  }

  if (!workspace.canUseSupportInbox) {
    return <p className="p-6 text-sm text-rose-600">You do not have support access.</p>;
  }

  const conversations = workspace.filteredConversations ?? [];
  const active = workspace.activeConversation;
  const isSupportAdmin = workspace.user?.role === "ADMIN";
  const groupedMessages = active ? groupConversationMessages(active.messages) : [];

  return (
    <PageShell
      title="Support Center"
      description=""
      backHref="/dashboard"
      actionsInlineOnMobile
      maxWidthClassName="max-w-7xl"
      actions={
        isSupportAdmin ? (
          <AdminSiteMenu
            accessToken={workspace.accessToken}
            canHandleSupport
          />
        ) : (
          <SupportSiteMenu
            accessToken={workspace.accessToken}
            canUseMessages={workspace.user?.role !== "ADMIN"}
          />
        )
      }
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside
          className={`min-w-0 space-y-4 ${mobilePane === "chat" ? "hidden lg:block" : "block"}`}
        >
          {!isSupportAdmin ? (
            <section ref={composeRef} className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Create support request</h2>
              <div className="mt-4 space-y-3">
                <input
                  value={workspace.supportSubject}
                  onChange={(event) => workspace.setSupportSubject(event.target.value)}
                  placeholder="Subject (optional)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                <textarea
                  value={workspace.supportMessage}
                  onChange={(event) => workspace.setSupportMessage(event.target.value)}
                  placeholder="Describe the issue clearly..."
                  className="min-h-28 w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                />
                {workspace.supportError ? (
                  <p className="text-sm text-rose-600">{workspace.supportError}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void workspace.onCreateSupportConversation()}
                  disabled={workspace.createSupportMutation.isPending}
                  className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {workspace.createSupportMutation.isPending ? "Opening..." : "Open support conversation"}
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {(["OPEN", "CLOSED", "ALL"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => workspace.setStatusFilter(status)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    workspace.statusFilter === status
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  {status === "ALL" ? "All" : status === "OPEN" ? "Open" : "Closed"}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workspace.unreadOnly}
                  onChange={(event) => workspace.setUnreadOnly(event.target.checked)}
                />
                Unread only
              </label>
              {isSupportAdmin ? (
                <>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={workspace.assignedToMe}
                      onChange={(event) => {
                        workspace.setAssignedToMe(event.target.checked);
                        if (event.target.checked) {
                          workspace.setUnassignedOnly(false);
                        }
                      }}
                    />
                    Assigned to me
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={workspace.unassignedOnly}
                      onChange={(event) => {
                        workspace.setUnassignedOnly(event.target.checked);
                        if (event.target.checked) {
                          workspace.setAssignedToMe(false);
                        }
                      }}
                    />
                    Unassigned only
                  </label>
                </>
              ) : null}
            </div>
            <input
              value={workspace.searchQuery}
              onChange={(event) => workspace.setSearchQuery(event.target.value)}
              placeholder="Search requester, assignee, or latest message"
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            />

            <div className="mt-4 space-y-3">
              {workspace.conversationsQuery.isLoading ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  Support
                </p>
              ) : conversations.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No conversations
                </p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      workspace.setActiveConversationId(conversation.id);
                      setMobilePane("chat");
                    }}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      workspace.activeConversationId === conversation.id
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {conversation.requester?.fullName ?? "Support request"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                          {conversation.latestMessage?.body ?? "No messages yet."}
                        </p>
                      </div>
                      {conversation.unreadCount > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {conversation.assignedAdmin
                        ? `Assigned to ${conversation.assignedAdmin.fullName}`
                        : conversation.status === "OPEN"
                          ? "Open - Unassigned"
                          : "Closed - Unassigned"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        <section
          className={`min-w-0 rounded-[32px] border border-slate-200 bg-white/95 shadow-sm ${
            mobilePane === "list" ? "hidden lg:block" : "block"
          }`}
        >
          {workspace.activeConversationQuery.isLoading ? (
            <div className="p-8 text-sm text-slate-500">Support</div>
          ) : !active ? (
            <div className="p-8 text-sm text-slate-500">Support</div>
          ) : (
            <div className="flex min-h-[640px] flex-col">
              <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setMobilePane("list")}
                      className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                    >
                      <ArrowLeftIcon />
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Support
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold text-slate-950 sm:text-[1.15rem]">
                      {active.requester?.fullName ?? "Support conversation"}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600">{workspace.supportStatusLabel}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isSupportAdmin && !active.isAssignedToCurrentAdmin ? (
                      <button
                        type="button"
                        onClick={() => void workspace.onAssignToSelf()}
                        disabled={workspace.assignToSelfMutation.isPending}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        {workspace.assignToSelfMutation.isPending ? "Assigning..." : "Assign to me"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void workspace.onToggleStatus()}
                      disabled={workspace.updateStatusMutation.isPending}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      {workspace.updateStatusMutation.isPending
                        ? "Updating..."
                        : active.status === "OPEN"
                          ? "Close conversation"
                          : "Reopen conversation"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                {active.messages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                    No messages
                  </p>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.label} className="space-y-4">
                      <div className="sticky top-0 z-10 flex justify-center">
                        <span className="rounded-full border border-slate-200 bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
                          {group.label}
                        </span>
                      </div>
                      {group.items.map((message) => {
                        const isMine = message.sender.id === workspace.user?.id;
                        return (
                          <div
                            key={message.id}
                            className={`max-w-[76%] rounded-[20px] px-3.5 py-2.5 shadow-sm ${
                              isMine
                                ? "ml-auto bg-emerald-600 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <p className="text-[11px] font-semibold opacity-80">
                              {isMine ? "You" : message.sender.fullName}
                            </p>
                            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5">
                              {message.body}
                            </p>
                            <p className={`mt-2 text-[11px] ${isMine ? "text-emerald-100" : "text-slate-500"}`}>
                              {formatConversationDate(message.createdAt)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
                <div className="flex items-end gap-2 sm:gap-3">
                  <textarea
                    ref={composerRef}
                    value={workspace.composerText}
                    onChange={(event) => workspace.setComposerText(event.target.value)}
                    placeholder={
                      active.status === "OPEN"
                        ? "Write a support reply..."
                        : "Reopen the conversation to continue."
                    }
                    rows={1}
                    disabled={active.status !== "OPEN" || !active.canReply}
                    className="h-[52px] flex-1 resize-none rounded-[24px] border border-slate-200 bg-white px-4 py-[14px] text-sm leading-6 text-slate-700 outline-none transition focus:border-emerald-400 disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => void workspace.onSendMessage()}
                    disabled={
                      workspace.sendMessageMutation.isPending ||
                      active.status !== "OPEN" ||
                      !active.canReply ||
                      !workspace.composerText.trim()
                    }
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:h-12 sm:w-12"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}





