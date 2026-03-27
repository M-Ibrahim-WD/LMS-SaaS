"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { EmptyState } from "../../../components/empty-state";
import { PaymentProofActions } from "../../../components/payment-proof-actions";
import { ProfileCourseCard } from "../../../components/profile/course-card";
import { AnalyticsIcon, ChatIcon, GridIcon, SettingsIcon, WalletIcon } from "../../../components/profile/profile-icons";
import { ProfileHeader } from "../../../components/profile/profile-header";
import { ReviewsList, SectionHeader } from "../../../components/profile/profile-support";
import { ProfilePanel } from "../../../components/profile/profile-shell";
import { ProfileTabs } from "../../../components/profile/profile-tabs";
import type { CourseCardItem, InstructorAnalytics, InstructorPayment, InstructorProfile, PaymentMethod, ReviewItem } from "./profile-types";

type InstructorTab = "courses" | "payments" | "analytics" | "reviews" | "settings";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

interface InstructorProfileViewProps {
  accessToken: string;
  profile: InstructorProfile;
  analytics?: InstructorAnalytics;
  courses?: CourseCardItem[];
  reviews?: ReviewItem[];
  paymentMethods?: PaymentMethod[];
  payments?: InstructorPayment[];
  settingsForm: ReactNode;
}

export function InstructorProfileView({
  accessToken,
  profile,
  analytics,
  courses,
  reviews,
  paymentMethods,
  payments,
  settingsForm
}: InstructorProfileViewProps) {
  const [tab, setTab] = useState<InstructorTab>("courses");

  return (
    <>
      <ProfileHeader
        name={profile.fullName}
        bio={profile.bio}
        imageUrl={profile.profileImage}
        badge="Instructor Profile"
        stats={[
          { label: "Students", value: String(profile.stats.studentsCount) },
          { label: "Courses", value: String(profile.stats.coursesCount) },
          { label: "Revenue", value: money.format(profile.stats.totalRevenue) }
        ]}
        actions={
          <>
            <Link href={`/instructors/${profile.id}`} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white">
              View public profile
            </Link>
            <span className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
              Invite Code: {profile.tenant?.inviteCode ?? "N/A"}
            </span>
          </>
        }
      />

      <ProfileTabs
        activeKey={tab}
        onChange={(key) => setTab(key as InstructorTab)}
        items={[
          { key: "courses", label: "Courses", icon: <GridIcon /> },
          { key: "payments", label: "Payments", icon: <WalletIcon /> },
          { key: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
          { key: "reviews", label: "Reviews", icon: <ChatIcon /> },
          { key: "settings", label: "Settings", icon: <SettingsIcon /> }
        ]}
      />

      <div className="mt-6">
        {tab === "courses" ? (
          <ProfilePanel>
            <SectionHeader
              eyebrow="Courses"
              title="Your course grid"
              description="Published and draft learning products in one clean creator view."
              action={<Link href="/instructor/courses" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">Manage courses</Link>}
            />
            {courses?.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <ProfileCourseCard
                    key={course.id}
                    id={course.id}
                    title={course.title}
                    description={course.description}
                    imageUrl={course.thumbnailImage}
                    price={course.price}
                    isPaid={course.isPaid}
                    studentsCount={course.studentsCount}
                    badge={course.status === "DRAFT" ? "Draft" : "Published"}
                    href={course.status === "DRAFT" ? `/instructor/courses/${course.id}/builder` : `/courses/${course.id}`}
                  />
                ))}
              </div>
            ) : (
              <EmptyState title="No courses yet" description="Create your first course to start building your public catalog." />
            )}
          </ProfilePanel>
        ) : null}

        {tab === "payments" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <ProfilePanel>
              <SectionHeader eyebrow="Payment Methods" title="Active payment accounts" description="Manual payment methods available to students." />
              {paymentMethods?.length ? (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="font-semibold text-slate-950">{method.label}</p>
                      <p className="mt-1 text-sm text-slate-500">{method.type} • {method.category}</p>
                      <p className="mt-3 text-sm text-slate-600">{method.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No payment methods yet" description="Add one from the dashboard to start receiving course payments." />
              )}
            </ProfilePanel>
            <ProfilePanel>
              <SectionHeader eyebrow="Recent Payments" title="Latest submissions" description="Quick access to student payment proofs." />
              {payments?.length ? (
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-950">{payment.course.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{payment.user.fullName} • {payment.method.label}</p>
                      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-700">{money.format(payment.amount)}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{payment.status}</span>
                      </div>
                      <div className="mt-3">
                        <PaymentProofActions
                          paymentId={payment.id}
                          accessToken={accessToken}
                          proofContentType={payment.proofContentType}
                          proofFileName={payment.proofFileName}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No payment submissions yet" description="Student payment proofs will appear here once someone buys a paid course." />
              )}
            </ProfilePanel>
          </div>
        ) : null}

        {tab === "analytics" ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Revenue", value: money.format(analytics?.totals.totalRevenue ?? 0) },
                { label: "Students", value: String(analytics?.totals.studentsCount ?? 0) },
                { label: "Growth (30d)", value: String(analytics?.studentsGrowth.currentWindow ?? 0) },
                { label: "Delta", value: `${(analytics?.studentsGrowth.delta ?? 0) >= 0 ? "+" : ""}${analytics?.studentsGrowth.delta ?? 0}` }
              ].map((item) => (
                <ProfilePanel key={item.label}>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
                </ProfilePanel>
              ))}
            </div>
            <ProfilePanel>
              <SectionHeader eyebrow="Sales" title="Sales per course" description="Simple course performance without heavy charts." />
              {analytics?.salesPerCourse.length ? (
                <div className="space-y-3">
                  {analytics.salesPerCourse.map((course) => (
                    <div key={course.id} className="flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">{course.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{course.studentsCount} students • {course.status}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">{money.format(course.revenue)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No analytics yet" description="Your sales summary will appear here once students begin enrolling." />
              )}
            </ProfilePanel>
          </div>
        ) : null}

        {tab === "reviews" ? <ReviewsList reviews={reviews ?? []} /> : null}
        {tab === "settings" ? settingsForm : null}
      </div>
    </>
  );
}
