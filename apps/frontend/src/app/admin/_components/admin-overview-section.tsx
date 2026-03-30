"use client";

import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import type { AdminActivity, AdminCourseSummary, AdminPaymentSummary, Overview } from "./admin-control-center.shared";
import { money } from "./admin-control-center.shared";

interface AdminOverviewSectionProps {
  overview?: Overview;
  courses?: AdminCourseSummary[];
  payments?: AdminPaymentSummary[];
  activity?: AdminActivity;
  navItems: Array<{ key: string; label: string; description: string; href: string; visible: boolean }>;
  canManagePlans: boolean;
  canReviewTenants: boolean;
  canReviewCourses: boolean;
  canReviewPayments: boolean;
  coursesLoading: boolean;
  paymentsLoading: boolean;
  activityLoading: boolean;
}

export function AdminOverviewSection({
  overview,
  courses,
  payments,
  activity,
  navItems,
  canManagePlans,
  canReviewTenants,
  canReviewCourses,
  canReviewPayments,
  coursesLoading,
  paymentsLoading,
  activityLoading
}: AdminOverviewSectionProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {[
          ["Users", overview?.totals.users ?? 0],
          ["Tenants", overview?.totals.tenants ?? 0],
          ["Plans", overview?.totals.plans ?? 0],
          ["Courses", overview?.totals.courses ?? 0],
          ["Approved Payments", overview?.totals.approvedPayments ?? 0],
          ["Revenue", money.format(overview?.totals.approvedRevenue ?? 0)],
          ["Unread Notifications", overview?.totals.unreadNotifications ?? 0]
        ].map(([label, value]) => (
          <ContentCard key={String(label)} className="p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
          </ContentCard>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {(canReviewCourses || canReviewPayments) ? (
          <ContentCard className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Operational Snapshot</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Courses and payments</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReviewCourses ? <StatusChip tone="info">Courses</StatusChip> : null}
                {canReviewPayments ? <StatusChip tone="warning">Payments</StatusChip> : null}
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {canReviewCourses ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                  <p className="text-sm font-semibold text-slate-900">Recent courses</p>
                  <div className="mt-3 space-y-2">
                    {courses?.slice(0, 4).map((course) => (
                      <div key={course.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                        <p className="font-medium text-slate-900">{course.title}</p>
                        <p className="mt-1 text-slate-500">
                          {course.instructor.fullName} • {course.tenant.name}
                        </p>
                      </div>
                    )) ?? (coursesLoading ? <p className="text-sm text-slate-500">Loading courses...</p> : <p className="text-sm text-slate-500">No courses yet.</p>)}
                  </div>
                </div>
              ) : null}
              {canReviewPayments ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                  <p className="text-sm font-semibold text-slate-900">Recent payments</p>
                  <div className="mt-3 space-y-2">
                    {payments?.slice(0, 4).map((payment) => (
                      <div key={payment.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                        <p className="font-medium text-slate-900">{payment.course.title}</p>
                        <p className="mt-1 text-slate-500">
                          {payment.user.fullName} • {money.format(payment.amount)}
                        </p>
                      </div>
                    )) ?? (paymentsLoading ? <p className="text-sm text-slate-500">Loading payments...</p> : <p className="text-sm text-slate-500">No payments yet.</p>)}
                  </div>
                </div>
              ) : null}
            </div>
          </ContentCard>
        ) : null}

        <ContentCard className="p-6">
          <p className="section-kicker">Quick links</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Jump into the right management area</h3>
          <div className="mt-5 space-y-3">
            {navItems
              .filter((item) => item.visible && item.key !== "overview")
              .map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="block rounded-[24px] border border-slate-200 bg-white/90 p-4 transition hover:border-slate-300"
                >
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </a>
              ))}
          </div>
        </ContentCard>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {canReviewCourses ? (
          <ContentCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Platform Courses</h2>
            <div className="mt-4 space-y-3">
              {courses?.length ? (
                courses.slice(0, 10).map((course) => (
                  <div key={course.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {course.instructor.fullName} | {course.tenant.name}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {course._count.enrollments} enrollments | {course._count.reviews} reviews | {course.status}
                    </p>
                  </div>
                ))
              ) : coursesLoading ? (
                <StatusBanner>Loading courses...</StatusBanner>
              ) : (
                <EmptyState title="No courses yet" description="Course oversight will appear here when courses exist." />
              )}
            </div>
          </ContentCard>
        ) : null}

        {canReviewPayments ? (
          <ContentCard className="p-6">
            <h2 className="text-lg font-semibold text-slate-950">Platform Payments</h2>
            <div className="mt-4 space-y-3">
              {payments?.length ? (
                payments.slice(0, 10).map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-950">{payment.course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {payment.user.fullName} | {payment.tenant.name}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {payment.method.label} | {money.format(payment.amount)} | {payment.status}
                    </p>
                  </div>
                ))
              ) : paymentsLoading ? (
                <StatusBanner>Loading payments...</StatusBanner>
              ) : (
                <EmptyState title="No payments yet" description="Payment oversight will appear here when transactions exist." />
              )}
            </div>
          </ContentCard>
        ) : null}
      </div>

      <ContentCard className="p-6">
        <h2 className="text-lg font-semibold text-slate-950">Recent Platform Activity</h2>
        {activity ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Users</p>
              <div className="mt-3 space-y-2">
                {activity.recentUsers.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {item.fullName} | {item.role}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Courses</p>
              <div className="mt-3 space-y-2">
                {activity.recentCourses.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {item.title} | {item.status}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Payments</p>
              <div className="mt-3 space-y-2">
                {activity.recentPayments.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {item.user.fullName} | {item.course.title}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Notifications</p>
              <div className="mt-3 space-y-2">
                {activity.recentNotifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activityLoading ? (
          <StatusBanner>Loading activity...</StatusBanner>
        ) : (
          <EmptyState title="No recent activity" description="Platform activity will populate here as the system is used." />
        )}
      </ContentCard>
    </>
  );
}
