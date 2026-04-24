"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AdminSiteMenu } from "../app/admin/_components/admin-site-menu";
import { apiFetch } from "../lib/api/client";
import { clearAuthCookie } from "../lib/auth/session";
import { useAuthStore } from "../store/auth.store";
import { NotificationCenter } from "./notification-center";

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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
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

export function SiteShellMenu() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const canHandleSupport = Boolean(
    user && (user.role !== "ADMIN" || user.isSuperAdmin || user.adminPermissions?.includes("HANDLE_SUPPORT"))
  );
  const canUseMessages = user?.role !== "ADMIN";

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "site-shell", "my"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "site-shell", "unread-count"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/notifications/unread-count", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const directUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "site-shell", "direct-unread"],
    queryFn: () =>
      apiFetch<Array<{ id: string }>>("/conversations?kind=DIRECT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && canUseMessages)
  });

  const supportUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "site-shell", "support-unread"],
    queryFn: () =>
      apiFetch<Array<{ id: string }>>("/conversations?kind=SUPPORT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && canHandleSupport)
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

  if (!hasHydrated || !accessToken || !user) {
    return null;
  }

  if (user.role === "ADMIN") {
    return (
      <AdminSiteMenu
        accessToken={accessToken}
        canHandleSupport={canHandleSupport}
      />
    );
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
        {canHandleSupport ? (
          <HeaderIconLink href="/support" label="Support" badgeCount={supportUnreadCount}>
            <SupportIcon />
          </HeaderIconLink>
        ) : null}
        <HeaderIconLink href="/messages" label="Messages" badgeCount={directUnreadCount}>
          <MessageIcon />
        </HeaderIconLink>
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
            {canHandleSupport ? (
              <HeaderIconLink href="/support" label="Support" badgeCount={supportUnreadCount} showTooltip={false}>
                <SupportIcon />
              </HeaderIconLink>
            ) : null}
            <HeaderIconLink href="/messages" label="Messages" badgeCount={directUnreadCount} showTooltip={false}>
              <MessageIcon />
            </HeaderIconLink>
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
