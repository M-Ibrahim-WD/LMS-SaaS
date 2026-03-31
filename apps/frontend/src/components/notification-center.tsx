"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusChip } from "./status-chip";

type NotificationFilter = "ALL" | "UNREAD" | "READ";
type NotificationType =
  | "WELCOME"
  | "INSTRUCTOR_JOINED"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "ENROLLMENT_CREATED"
  | "CERTIFICATE_ISSUED";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  items?: NotificationItem[];
  unreadCount: number;
  isLoading?: boolean;
  isUpdating?: boolean;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}

function BellSilentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function BellRingingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 0 0 5 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 5.5 5 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 5.5 19 4" />
    </svg>
  );
}

function NotificationTypeIcon({ type }: { type: NotificationType }) {
  const iconClass = "h-5 w-5";

  switch (type) {
    case "WELCOME":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M12 4v16" />
        </svg>
      );
    case "INSTRUCTOR_JOINED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h4M19 6v4" />
        </svg>
      );
    case "PAYMENT_SUBMITTED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
        </svg>
      );
    case "PAYMENT_APPROVED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.3 2.3 4.7-5.3" />
        </svg>
      );
    case "PAYMENT_REJECTED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );
    case "ENROLLMENT_CREATED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v15.5H6.5A2.5 2.5 0 0 0 4 22" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h6" />
        </svg>
      );
    case "CERTIFICATE_ISSUED":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClass}>
          <circle cx="12" cy="8.5" r="4.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 13.5 8 20l4-2 4 2-2-6.5" />
        </svg>
      );
    default:
      return <BellSilentIcon />;
  }
}

const typeTone: Record<NotificationType, "default" | "info" | "success" | "warning" | "danger" | "trial"> = {
  WELCOME: "info",
  INSTRUCTOR_JOINED: "trial",
  PAYMENT_SUBMITTED: "warning",
  PAYMENT_APPROVED: "success",
  PAYMENT_REJECTED: "danger",
  ENROLLMENT_CREATED: "info",
  CERTIFICATE_ISSUED: "success"
};

export function NotificationCenter({
  items,
  unreadCount,
  isLoading = false,
  isUpdating = false,
  onMarkRead,
  onMarkAllRead
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const filteredItems = useMemo(() => {
    const notifications = items ?? [];
    if (filter === "UNREAD") {
      return notifications.filter((item) => !item.isRead);
    }
    if (filter === "READ") {
      return notifications.filter((item) => item.isRead);
    }
    return notifications;
  }, [filter, items]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white text-slate-700 shadow-sm transition ${
          hasUnread
            ? "border-amber-300 text-amber-700 hover:border-amber-400"
            : "border-slate-300 hover:border-slate-400"
        }`}
        aria-expanded={open}
        aria-label="Open notifications"
        title="Notifications"
      >
        {hasUnread ? <BellRingingIcon /> : <BellSilentIcon />}
        {hasUnread ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="surface-card-strong absolute right-0 z-40 mt-3 w-[min(92vw,29rem)] rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Notifications</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Updates and activity</h3>
              </div>
              <StatusChip tone={unreadCount > 0 ? "warning" : "success"}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
              </StatusChip>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["ALL", "UNREAD", "READ"] as NotificationFilter[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === value
                        ? "bg-slate-950 text-white"
                        : "border border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {value === "ALL" ? "All" : value === "UNREAD" ? "Unread" : "Read"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={unreadCount === 0 || isUpdating}
                onClick={onMarkAllRead}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60"
              >
                Mark all as read
              </button>
            </div>

            <div className="ui-scrollbar mt-5 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
              {isLoading ? <p className="text-sm text-slate-500">Loading notifications...</p> : null}
              {!isLoading && filteredItems.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/85 p-5 text-sm text-slate-600">
                  No notifications in this filter right now.
                </div>
              ) : null}
              {filteredItems.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[24px] border p-4 ${
                    notification.isRead ? "border-slate-200 bg-slate-50/80" : "border-sky-200 bg-sky-50/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${
                          notification.isRead ? "bg-white text-slate-500" : "bg-white text-slate-900"
                        }`}>
                          <NotificationTypeIcon type={notification.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{notification.title}</p>
                            <StatusChip tone={typeTone[notification.type]}>{notification.type.replace(/_/g, " ")}</StatusChip>
                            <StatusChip tone={notification.isRead ? "default" : "info"}>
                              {notification.isRead ? "Read" : "Unread"}
                            </StatusChip>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                          <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    {!notification.isRead ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onMarkRead(notification.id)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
