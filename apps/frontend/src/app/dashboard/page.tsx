"use client";

import Link from "next/link";

import { NotificationCenter } from "../../components/notification-center";
import { PageShell } from "../../components/page-shell";

import { DashboardOverviewPanels } from "./_components/dashboard-overview-panels";
import { InstructorDashboardSection } from "./_components/instructor-dashboard-section";
import { StudentDashboardSection } from "./_components/student-dashboard-section";
import { useDashboardWorkspace } from "./_hooks/use-dashboard-workspace";

export default function DashboardPage() {
  const dashboard = useDashboardWorkspace();

  if (!dashboard.hasHydrated) {
    return <p className="p-6 text-sm text-slate-500">Loading session...</p>;
  }

  if (!dashboard.accessToken) {
    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
  }

  const profile = dashboard.profileQuery.data;

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
          <Link
            href="/profile"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            Profile
          </Link>
          {profile?.role !== "ADMIN" ? (
            <Link
              href="/messages"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Messages
            </Link>
          ) : null}
          {profile?.role !== "ADMIN" ||
          profile.isSuperAdmin ||
          profile.adminPermissions?.includes("HANDLE_SUPPORT") ? (
            <Link
              href="/support"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Support
            </Link>
          ) : null}
          {profile?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={dashboard.onLogout}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
          >
            Logout
          </button>
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
              paymentMethods={dashboard.paymentMethodsQuery.data}
              instructorPayments={dashboard.instructorPaymentsQuery.data}
              isCreatingMethod={dashboard.createMethodMutation.isPending}
              isDeletingMethod={dashboard.deleteMethodMutation.isPending}
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
