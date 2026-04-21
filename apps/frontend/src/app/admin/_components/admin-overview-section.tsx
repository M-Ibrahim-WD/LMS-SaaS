"use client";

import { useMemo, useState } from "react";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import type { AdminActivity, Overview } from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

interface AdminOverviewSectionProps {
  overview?: Overview;
  activity?: AdminActivity;
  activityLoading: boolean;
}

type ActivityTabKey = "users" | "courses" | "payments" | "notifications";

const statCards = (
  overview?: Overview
): Array<{ label: string; value: string | number; tone?: "info" | "warning" | "success" }> => [
  { label: "Users", value: overview?.totals.users ?? 0, tone: "info" },
  { label: "Tenants", value: overview?.totals.tenants ?? 0, tone: "info" },
  { label: "Plans", value: overview?.totals.plans ?? 0, tone: "info" },
  { label: "Courses", value: overview?.totals.courses ?? 0, tone: "success" },
  { label: "Approved payments", value: overview?.totals.approvedPayments ?? 0, tone: "warning" },
  { label: "Revenue", value: money.format(overview?.totals.approvedRevenue ?? 0), tone: "success" },
  { label: "Unread notifications", value: overview?.totals.unreadNotifications ?? 0, tone: "info" }
];

export function AdminOverviewSection({ overview, activity, activityLoading }: AdminOverviewSectionProps) {
  const [activeTab, setActiveTab] = useState<ActivityTabKey>("users");

  const tabMeta = useMemo(
    () => ({
      users: {
        label: "Users",
        items: activity?.recentUsers.map((item) => `${item.fullName} | ${item.role}`) ?? []
      },
      courses: {
        label: "Courses",
        items: activity?.recentCourses.map((item) => `${item.title} | ${item.status}`) ?? []
      },
      payments: {
        label: "Payments",
        items: activity?.recentPayments.map((item) => `${item.user.fullName} | ${item.course.title}`) ?? []
      },
      notifications: {
        label: "Notifications",
        items: activity?.recentNotifications.map((item) => item.title) ?? []
      }
    }),
    [activity]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {statCards(overview).map((item) => (
          <ContentCard key={item.label} className="p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[0.55rem] uppercase tracking-[0.18em] text-slate-400 sm:text-xs">
                {item.label}
              </p>
              {item.tone ? (
                <div className="hidden sm:block">
                  <StatusChip tone={item.tone}>{item.label.split(" ")[0]}</StatusChip>
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-3xl">
              {item.value}
            </p>
          </ContentCard>
        ))}
      </div>

      <ContentCard className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Activity feed</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Detailed recent events</h3>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap">
            {(Object.keys(tabMeta) as ActivityTabKey[]).map((tabKey) => {
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`rounded-full border px-2 py-2 text-[0.72rem] font-semibold transition sm:px-4 sm:text-sm ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {tabMeta[tabKey].label}
                </button>
              );
            })}
          </div>
        </div>

        {activity ? (
          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-950">{tabMeta[activeTab].label}</p>
            <div className="mt-3 space-y-2">
              {tabMeta[activeTab].items.length ? (
                tabMeta[activeTab].items.map((item, index) => (
                  <div key={`${activeTab}-${index}`} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {item}
                  </div>
                ))
              ) : (
                <EmptyState
                  title={`No recent ${tabMeta[activeTab].label.toLowerCase()}`}
                  description="This tab will populate as the platform is used."
                />
              )}
            </div>
          </div>
        ) : activityLoading ? (
          <div className="mt-5">
            <StatusBanner>Loading activity...</StatusBanner>
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No recent activity"
              description="Platform activity will populate here as the system is used."
            />
          </div>
        )}
      </ContentCard>
    </div>
  );
}
