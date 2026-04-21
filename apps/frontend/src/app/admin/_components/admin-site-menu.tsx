"use client";

import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { NotificationCenter } from "../../../components/notification-center";
import { useAuthStore } from "../../../store/auth.store";
import { clearAuthCookie } from "../../../lib/auth/session";
import { apiFetch } from "../../../lib/api/client";

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

type ConversationUnreadItem = {
  id: string;
};

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" d="M5 7h14" />
      <path strokeLinecap="round" d="M5 12h14" />
      <path strokeLinecap="round" d="M5 17h14" />
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

function IconLink({
  href,
  label,
  badgeCount,
  children
}: {
  href: string;
  label: string;
  badgeCount?: number;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
    >
      {children}
      {badgeCount && badgeCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function IconButton({
  onClick,
  label,
  tone = "default",
  children
}: {
  onClick: () => void;
  label: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {children}
    </button>
  );
}

export function AdminSiteMenu({
  accessToken,
  canHandleSupport
}: {
  accessToken?: string | null;
  canHandleSupport: boolean;
}) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "my", "admin-menu"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count", "admin-menu"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/notifications/unread-count", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const supportUnreadQuery = useQuery({
    queryKey: ["conversations", "support-unread", "admin-menu"],
    queryFn: () =>
      apiFetch<ConversationUnreadItem[]>("/conversations?kind=SUPPORT&unreadOnly=true", {
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
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function onLogout() {
    clearSession();
    clearAuthCookie();
    router.push("/login");
  }

  return (
    <div ref={menuRef} className="relative z-[70] self-start">
      <IconButton onClick={() => setOpen((current) => !current)} label="Menu">
        <MenuIcon />
      </IconButton>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.55rem)] z-[80] flex w-[3.75rem] flex-col items-center gap-2 rounded-[28px] border border-slate-200 bg-white/55 p-2 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
          <NotificationCenter
            items={notificationsQuery.data}
            unreadCount={unreadCountQuery.data?.unreadCount ?? 0}
            isLoading={notificationsQuery.isLoading}
            isUpdating={
              markNotificationReadMutation.isPending || markAllNotificationsReadMutation.isPending
            }
            onMarkRead={(notificationId: string) => markNotificationReadMutation.mutate(notificationId)}
            onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
            showTooltip={false}
          />
          {canHandleSupport ? (
            <IconLink
              href="/support"
              label="Support"
              badgeCount={supportUnreadQuery.data?.length ?? 0}
            >
              <SupportIcon />
            </IconLink>
          ) : null}
          <IconLink href="/profile" label="Profile">
            <ProfileIcon />
          </IconLink>
          <IconButton onClick={onLogout} label="Logout" tone="danger">
            <LogoutIcon />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
