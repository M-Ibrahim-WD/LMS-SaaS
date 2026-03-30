"use client";

import { useMemo, useState } from "react";
import { StatusChip } from "./status-chip";

type NotificationFilter = "ALL" | "UNREAD" | "READ";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCenterProps {
  items?: NotificationItem[];
  unreadCount: number;
  isLoading?: boolean;
  isUpdating?: boolean;
  onMarkRead: (notificationId: string) => void;
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function NotificationCenter({
  items,
  unreadCount,
  isLoading = false,
  isUpdating = false,
  onMarkRead
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("ALL");

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
        className="relative inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400"
        aria-expanded={open}
        aria-label="Open notifications"
      >
        <BellIcon />
        <span className="ml-2 hidden sm:inline">Notifications</span>
        {unreadCount > 0 ? (
          <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-0.5 text-[11px] font-semibold text-white">
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
          <div className="surface-card-strong absolute right-0 z-40 mt-3 w-[min(92vw,28rem)] rounded-[28px] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Notifications</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Updates and activity</h3>
              </div>
              <StatusChip tone={unreadCount > 0 ? "warning" : "success"}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
              </StatusChip>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{notification.title}</p>
                        <StatusChip tone={notification.isRead ? "default" : "info"}>
                          {notification.isRead ? "Read" : "Unread"}
                        </StatusChip>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                      <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
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
