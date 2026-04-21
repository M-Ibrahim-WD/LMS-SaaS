"use client";

import Link from "next/link";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import type {
  AdminActivity,
  AdminCourseSummary,
  AdminPaymentSummary,
  Overview
} from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

interface AdminOverviewSectionProps {
  overview?: Overview;
  courses?: AdminCourseSummary[];
  payments?: AdminPaymentSummary[];
  activity?: AdminActivity;
  canReviewCourses: boolean;
  canReviewPayments: boolean;
  coursesLoading: boolean;
  paymentsLoading: boolean;
  activityLoading: boolean;
}

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

export function AdminOverviewSection({
  overview,
  courses,
  payments,
  activity,
  canReviewCourses,
  canReviewPayments,
  coursesLoading,
  paymentsLoading,
  activityLoading
}: AdminOverviewSectionProps) {
  const recentCourses = courses?.slice(0, 4) ?? [];
  const recentPayments = payments?.slice(0, 4) ?? [];

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

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <ContentCard className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="section-kicker">Operations</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Review queue</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Keep course quality, payments, and instructor publishing health visible without repeating the same
                information in multiple cards.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canReviewCourses ? <StatusChip tone="info">Course review</StatusChip> : null}
              {canReviewPayments ? <StatusChip tone="warning">Payment review</StatusChip> : null}
            </div>
          </div>

          <div className={`mt-5 grid gap-4 ${canReviewCourses && canReviewPayments ? "xl:grid-cols-2" : ""}`}>
            {canReviewCourses ? (
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Recent courses</p>
                    <p className="mt-1 text-xs text-slate-500">Open courses directly in the review workspace.</p>
                  </div>
                  <Link
                    href="/courses"
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Open catalog
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {recentCourses.length ? (
                    recentCourses.map((course) => (
                      <div key={course.id} className="rounded-[22px] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{course.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {course.instructor.fullName} | {course.tenant.name}
                            </p>
                          </div>
                          <StatusChip tone="info">{course.status}</StatusChip>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {course._count.enrollments} enrollments | {course._count.reviews} reviews
                        </p>
                        <Link
                          href={`/courses/${course.id}`}
                          className="mt-4 inline-flex rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          Review course
                        </Link>
                      </div>
                    ))
                  ) : coursesLoading ? (
                    <StatusBanner>Loading courses...</StatusBanner>
                  ) : (
                    <EmptyState
                      title="No courses yet"
                      description="Course oversight will appear here when instructors publish or draft content."
                    />
                  )}
                </div>
              </div>
            ) : null}

            {canReviewPayments ? (
              <div className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Recent payments</p>
                    <p className="mt-1 text-xs text-slate-500">Track approvals and identify stalled transactions.</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {recentPayments.length ? (
                    recentPayments.map((payment) => (
                      <div key={payment.id} className="rounded-[22px] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">{payment.course.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {payment.user.fullName} | {payment.tenant.name}
                            </p>
                          </div>
                          <StatusChip tone={payment.status === "APPROVED" ? "success" : "warning"}>
                            {payment.status}
                          </StatusChip>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          {payment.method.label} | {money.format(payment.amount)}
                        </p>
                      </div>
                    ))
                  ) : paymentsLoading ? (
                    <StatusBanner>Loading payments...</StatusBanner>
                  ) : (
                    <EmptyState
                      title="No payments yet"
                      description="Payment oversight will appear here when transactions start flowing."
                    />
                  )}
                </div>
              </div>
            ) : null}

            {!canReviewCourses && !canReviewPayments ? (
              <EmptyState
                title="Operational review is restricted"
                description="This admin account can see overview metrics, but course and payment review are not enabled."
              />
            ) : null}
          </div>
        </ContentCard>

      </div>

      <ContentCard className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Activity feed</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Detailed recent events</h3>
          </div>
        </div>

        {activity ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-950">Users</p>
              <div className="mt-3 space-y-2">
                {activity.recentUsers.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {item.fullName} | {item.role}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-950">Courses</p>
              <div className="mt-3 space-y-2">
                {activity.recentCourses.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {item.title} | {item.status}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-950">Payments</p>
              <div className="mt-3 space-y-2">
                {activity.recentPayments.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {item.user.fullName} | {item.course.title}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-950">Notifications</p>
              <div className="mt-3 space-y-2">
                {activity.recentNotifications.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                    {item.title}
                  </div>
                ))}
              </div>
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
