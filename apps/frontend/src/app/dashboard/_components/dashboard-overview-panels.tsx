"use client";

import Link from "next/link";
import { useState } from "react";
import { ContentCard } from "../../../components/content-card";
import { StatusChip } from "../../../components/status-chip";
import type { InstructorSubscriptionSummary, Profile } from "./dashboard-types";

interface DashboardOverviewPanelsProps {
  profile: Profile;
  unreadCount: number;
  instructorSubscription?: InstructorSubscriptionSummary | null;
}

function MobileAccordionCard({
  title,
  children,
  className = ""
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ContentCard className={`p-0 sm:hidden ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold text-slate-950">{title}</span>
        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5" />
          </svg>
        </span>
      </button>
      {open ? <div className="px-6 pb-6">{children}</div> : null}
    </ContentCard>
  );
}

export function DashboardOverviewPanels({
  profile,
  unreadCount,
  instructorSubscription
}: DashboardOverviewPanelsProps) {
  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ContentCard className="overflow-hidden p-0">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),linear-gradient(150deg,#ffffff_0%,#f8fafc_32%,#e0f2fe_100%)] p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="section-kicker">Workspace Identity</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{profile.fullName}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{profile.email}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusChip tone="info">{profile.role}</StatusChip>
                  <StatusChip>{profile.tenant?.name ?? "No workspace assigned"}</StatusChip>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:w-[18rem]">
                <div className="rounded-[28px] border border-slate-200 bg-white/85 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unread</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadCount}</p>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-white/85 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Member since</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard className="hidden p-6 sm:block">
          <p className="section-kicker">Activity</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Stay focused on the next task</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Notifications now live behind the bell button in the header so the dashboard stays cleaner and more focused.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusChip tone={unreadCount > 0 ? "warning" : "success"}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
            </StatusChip>
          </div>
        </ContentCard>
        <MobileAccordionCard title="Stay focused on the next task">
          <p className="text-sm leading-7 text-slate-600">
            Notifications now live behind the bell button in the header so the dashboard stays cleaner and more focused.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusChip tone={unreadCount > 0 ? "warning" : "success"}>
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
            </StatusChip>
          </div>
        </MobileAccordionCard>
      </section>

      {profile.role === "ADMIN" ? (
        <ContentCard className="p-6">
          <p className="section-kicker">Platform administration</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Admin control center</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Open the dedicated admin workspace for tenant oversight, plans, user review, audit logs, and delegated admin control.
          </p>
          <div className="mt-5">
            <Link href="/admin" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">
              Open admin workspace
            </Link>
          </div>
        </ContentCard>
      ) : null}

      {profile.role === "INSTRUCTOR" && instructorSubscription ? (
        <>
          <ContentCard
            className={`hidden p-6 sm:block ${
              instructorSubscription.freezeCreation
                ? "border-amber-200 bg-amber-50/90"
                : instructorSubscription.currentSubscription?.isTrial
                  ? "border-sky-200 bg-sky-50/90"
                  : "border-emerald-200 bg-emerald-50/90"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-950">
                    {instructorSubscription.selectedPlan?.name ?? "No plan selected"}
                  </p>
                  <StatusChip
                    tone={
                      instructorSubscription.freezeCreation
                        ? "warning"
                        : instructorSubscription.currentSubscription?.isTrial
                          ? "trial"
                          : "success"
                    }
                  >
                    {instructorSubscription.freezeCreation
                      ? "Frozen"
                      : instructorSubscription.currentSubscription?.isTrial
                        ? "Trial"
                        : "Active"}
                  </StatusChip>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {instructorSubscription.freezeCreation
                    ? "Your workspace can still be viewed, but creation is paused until an admin activates a subscription."
                    : instructorSubscription.currentSubscription?.isTrial
                      ? `Trial active with ${instructorSubscription.daysRemaining} day(s) remaining. Trial limits still apply.`
                      : `Subscription active on the ${instructorSubscription.currentSubscription?.billingPeriod.toLowerCase()} billing cycle.`}
                </p>
              </div>
              <Link href="/subscription" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Manage plan
              </Link>
            </div>
          </ContentCard>
          <MobileAccordionCard
            title={instructorSubscription.selectedPlan?.name ?? "No plan selected"}
            className={
              instructorSubscription.freezeCreation
                ? "border-amber-200 bg-amber-50/90"
                : instructorSubscription.currentSubscription?.isTrial
                  ? "border-sky-200 bg-sky-50/90"
                  : "border-emerald-200 bg-emerald-50/90"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip
                tone={
                  instructorSubscription.freezeCreation
                    ? "warning"
                    : instructorSubscription.currentSubscription?.isTrial
                      ? "trial"
                      : "success"
                }
              >
                {instructorSubscription.freezeCreation
                  ? "Frozen"
                  : instructorSubscription.currentSubscription?.isTrial
                    ? "Trial"
                    : "Active"}
              </StatusChip>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {instructorSubscription.freezeCreation
                ? "Your workspace can still be viewed, but creation is paused until an admin activates a subscription."
                : instructorSubscription.currentSubscription?.isTrial
                  ? `Trial active with ${instructorSubscription.daysRemaining} day(s) remaining. Trial limits still apply.`
                  : `Subscription active on the ${instructorSubscription.currentSubscription?.billingPeriod.toLowerCase()} billing cycle.`}
            </p>
            <div className="mt-4">
              <Link href="/subscription" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                Manage plan
              </Link>
            </div>
          </MobileAccordionCard>
        </>
      ) : null}
    </>
  );
}
