"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { NotificationCenter } from "../../components/notification-center";
import { PageShell } from "../../components/page-shell";

import { DashboardOverviewPanels } from "./_components/dashboard-overview-panels";
import { InstructorDashboardSection } from "./_components/instructor-dashboard-section";
import { StudentDashboardSection } from "./_components/student-dashboard-section";
import { useDashboardWorkspace } from "./_hooks/use-dashboard-workspace";

function HeaderIconLink({
  href,
  label,
  children,
  tone = "default",
  badgeCount
}: {
  href: string;
  label: string;
  children: ReactNode;
  tone?: "default" | "accent";
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        tone === "accent"
          ? "border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
      {badgeCount && badgeCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function HeaderActionLink({
  href,
  label,
  children,
  tone = "accent"
}: {
  href: string;
  label: string;
  children: ReactNode;
  tone?: "accent" | "default";
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        tone === "accent"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 focus-visible:ring-emerald-200"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-emerald-200"
      }`}
    >
      {children}
    </Link>
  );
}

function HeaderIconButton({
  onClick,
  label,
  children,
  tone = "default"
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-rose-200"
          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-emerald-200"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
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

function MessageOpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 7 6.5 5 6.5-5" />
    </svg>
  );
}

function MessageClosedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
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

function AdminShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5.5 5.5v5.6c0 4.2 2.9 8 6.5 9.9 3.6-1.9 6.5-5.7 6.5-9.9V5.5L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.7 1.7 3.3-3.7" />
    </svg>
  );
}

export default function DashboardPage() {
  const dashboard = useDashboardWorkspace();

  if (!dashboard.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Loading session...</p>;
  }

  if (!dashboard.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
  }

  const profile = dashboard.profileQuery.data;
  const directUnreadCount = dashboard.directUnreadConversationsQuery.data?.length ?? 0;
  const supportUnreadCount = dashboard.supportUnreadConversationsQuery.data?.length ?? 0;

  return (
    <PageShell
      title="Dashboard"
      description="Manage your workspace, monitor progress, and keep momentum with the next best actions."
      maxWidthClassName="max-w-7xl"
      actions={
        <>
          <NotificationCenter
            items={dashboard.notificationsQuery.data}
            unreadCount={dashboard.unreadCountQuery.data?.unreadCount ?? 0}
            isLoading={dashboard.notificationsQuery.isLoading}
            isUpdating={
              dashboard.markNotificationReadMutation.isPending ||
              dashboard.markAllNotificationsReadMutation.isPending
            }
            onMarkRead={(notificationId: string) =>
              dashboard.markNotificationReadMutation.mutate(notificationId)
            }
            onMarkAllRead={() =>
              dashboard.markAllNotificationsReadMutation.mutate()
            }
          />
          {profile?.role !== "ADMIN" ||
          profile.isSuperAdmin ||
          profile.adminPermissions?.includes("HANDLE_SUPPORT") ? (
            <HeaderIconLink
              href="/support"
              label="Support"
              badgeCount={supportUnreadCount}
            >
              <SupportIcon />
            </HeaderIconLink>
          ) : null}
          {profile?.role !== "ADMIN" ? (
            <HeaderIconLink
              href="/messages"
              label="Messages"
              badgeCount={directUnreadCount}
            >
              {directUnreadCount > 0 ? <MessageClosedIcon /> : <MessageOpenIcon />}
            </HeaderIconLink>
          ) : null}
          <HeaderIconLink href="/profile" label="Profile">
            <ProfileIcon />
          </HeaderIconLink>
          {profile?.role === "ADMIN" ? (
            <HeaderActionLink href="/admin" label="Admin">
              <AdminShieldIcon />
              Admin
            </HeaderActionLink>
          ) : null}
          <HeaderIconButton onClick={dashboard.onLogout} label="Logout" tone="danger">
            <LogoutIcon />
          </HeaderIconButton>
        </>
      }
    >
      {dashboard.profileQuery.isLoading ? (
        <p className="rounded-3xl border border-slate-200 bg-white/80 px-6 py-8 text-sm text-slate-500 shadow-sm backdrop-blur">
          Loading your dashboard...
        </p>
      ) : dashboard.profileQuery.isError ? (
        <p className="rounded-3xl border border-rose-200 bg-rose-50/90 px-6 py-8 text-sm text-rose-700 shadow-sm backdrop-blur">
          We couldn&apos;t load your dashboard right now.
        </p>
      ) : profile ? (
        <div className="space-y-8">
          <DashboardOverviewPanels
            profile={profile}
            unreadCount={dashboard.unreadCountQuery.data?.unreadCount ?? 0}
            instructorSubscription={dashboard.instructorSubscriptionQuery.data ?? null}
          />

          {profile.role === "INSTRUCTOR" ? (
            <InstructorDashboardSection
              accessToken={dashboard.accessToken ?? ""}
              inviteCode={dashboard.inviteCodeQuery.data?.inviteCode}
              methodType={dashboard.methodType}
              methodLabel={dashboard.methodLabel}
              methodDetails={dashboard.methodDetails}
              methodValidationError={dashboard.methodValidationError}
              deleteMethodError={dashboard.deleteMethodError}
              instructorProfile={dashboard.instructorProfileQuery.data}
              paymentMethods={dashboard.paymentMethodsQuery.data}
              instructorPayments={dashboard.instructorPaymentsQuery.data}
              instructorCourses={dashboard.instructorCoursesQuery.data}
              interviewSessions={dashboard.dashboardInterviewsQuery.data}
              interviewCourseId={dashboard.interviewCourseId}
              interviewTitle={dashboard.interviewTitle}
              interviewDescription={dashboard.interviewDescription}
              interviewProvider={dashboard.interviewProvider}
              interviewMeetingUrl={dashboard.interviewMeetingUrl}
              interviewScheduledAt={dashboard.interviewScheduledAt}
              interviewDurationMinutes={dashboard.interviewDurationMinutes}
              interviewError={dashboard.interviewError}
              isCreatingMethod={dashboard.createMethodMutation.isPending}
              isDeletingMethod={dashboard.deleteMethodMutation.isPending}
              isCreatingInterview={dashboard.createInterviewMutation.isPending}
              isUpdatingInterview={dashboard.updateInterviewMutation.isPending || dashboard.updateInterviewStatusMutation.isPending}
              isDeletingInterview={dashboard.deleteInterviewMutation.isPending}
              onCopyInviteCode={dashboard.onCopyInviteCode}
              onCreateMethod={dashboard.onCreateMethod}
              onDeleteMethod={dashboard.onDeleteMethod}
              onApprovePayment={(paymentId) =>
                dashboard.approveMutation.mutate(paymentId)
              }
              onRejectPayment={(paymentId) =>
                dashboard.rejectMutation.mutate(paymentId)
              }
              onMethodTypeChange={dashboard.onMethodTypeChange}
              onMethodLabelChange={dashboard.setMethodLabel}
              onMethodDetailsChange={dashboard.onMethodDetailsChange}
              onInterviewCourseChange={dashboard.setInterviewCourseId}
              onInterviewTitleChange={dashboard.setInterviewTitle}
              onInterviewDescriptionChange={dashboard.setInterviewDescription}
              onInterviewProviderChange={dashboard.setInterviewProvider}
              onInterviewMeetingUrlChange={dashboard.setInterviewMeetingUrl}
              onInterviewScheduledAtChange={dashboard.setInterviewScheduledAt}
              onInterviewDurationMinutesChange={dashboard.setInterviewDurationMinutes}
              onCreateInterview={() => dashboard.createInterviewMutation.mutate()}
              onScheduleInterview={(interviewId) =>
                dashboard.updateInterviewStatusMutation.mutate({ interviewId, status: "SCHEDULED" })
              }
              onCompleteInterview={(interviewId) =>
                dashboard.updateInterviewStatusMutation.mutate({ interviewId, status: "COMPLETED" })
              }
              onDeleteInterview={(interviewId) =>
                dashboard.deleteInterviewMutation.mutate(interviewId)
              }
              onUpdateInterview={(interviewId, payload) =>
                dashboard.updateInterviewMutation.mutate({ interviewId, payload })
              }
            />
          ) : null}

          {profile.role === "STUDENT" ? (
            <StudentDashboardSection
              studentInviteCode={dashboard.studentInviteCode}
              studentJoinError={dashboard.studentJoinError}
              activeTab={dashboard.activeTab}
              filterType={dashboard.filterType}
              searchQuery={dashboard.searchQuery}
              continueLearning={dashboard.continueLearningQuery.data ?? null}
              studentInstructors={dashboard.studentInstructorsQuery.data}
              filteredStudentCourses={dashboard.filteredStudentCourses}
              groupedCoursesByInstructor={dashboard.groupedCoursesByInstructor}
              studentEmptyStateMessage={dashboard.studentEmptyStateMessage}
              isJoiningInstructor={dashboard.joinInstructorMutation.isPending}
              isLoadingCourses={
                dashboard.studentCoursesQuery.isLoading ||
                dashboard.studentMyCoursesQuery.isLoading ||
                dashboard.continueLearningQuery.isLoading
              }
              hasCourseError={
                dashboard.studentCoursesQuery.isError ||
                dashboard.studentMyCoursesQuery.isError
              }
              onJoinInstructor={dashboard.onJoinInstructor}
              onStudentInviteCodeChange={dashboard.setStudentInviteCode}
              clearStudentJoinError={dashboard.clearStudentJoinError}
              onActiveTabChange={dashboard.setActiveTab}
              onFilterTypeChange={dashboard.setFilterType}
              onSearchQueryChange={dashboard.setSearchQuery}
            />
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
