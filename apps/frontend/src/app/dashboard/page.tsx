"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { clearAuthCookie } from "../../lib/auth/session";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodType,
  validatePaymentMethodDetails
} from "../../lib/payments/payment-methods";
import { ContentCard } from "../../components/content-card";
import { NotificationCenter } from "../../components/notification-center";
import { PageShell } from "../../components/page-shell";
import { StatusChip } from "../../components/status-chip";
import { useRequireAuth } from "../../hooks/use-require-auth";
import { useAuthStore } from "../../store/auth.store";
import { InstructorDashboardSection } from "./_components/instructor-dashboard-section";
import { StudentDashboardSection } from "./_components/student-dashboard-section";
import type {
  ContinueLearningItem,
  CourseFilter,
  EnrolledCourse,
  InstructorPayment,
  InviteCodeResponse,
  NotificationItem,
  PaymentMethod,
  Profile,
  StudentCourse,
  StudentDashboardCourse,
  StudentInstructorItem,
  StudentTab
} from "./_components/dashboard-types";

type InstructorSubscriptionSummary = {
  requiresPlanSelection: boolean;
  freezeCreation: boolean;
  daysRemaining: number;
  selectedPlan: { id: string; name: string } | null;
  currentSubscription: {
    id: string;
    state: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELED";
    billingPeriod: "MONTHLY" | "YEARLY";
    endsAt: string;
    isTrial: boolean;
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const { accessToken, user, hasHydrated } = useRequireAuth();
  const queryClient = useQueryClient();
  const [methodType, setMethodType] = useState<PaymentMethodType>("INSTAPAY");
  const [methodLabel, setMethodLabel] = useState("Instapay");
  const [methodDetails, setMethodDetails] = useState("");
  const [methodValidationError, setMethodValidationError] = useState<string | null>(null);
  const [deleteMethodError, setDeleteMethodError] = useState<string | null>(null);
  const [studentInviteCode, setStudentInviteCode] = useState("");
  const [studentJoinError, setStudentJoinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>("ALL");
  const [filterType, setFilterType] = useState<CourseFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const profileQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Profile>("/auth/me", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const inviteCodeQuery = useQuery({
    queryKey: ["tenant-invite-code"],
    queryFn: () => apiFetch<InviteCodeResponse>("/tenants/invite-code", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "INSTRUCTOR" && user?.tenantId)
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", "my"],
    queryFn: () => apiFetch<PaymentMethod[]>("/payment-methods/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "INSTRUCTOR" && user?.tenantId)
  });

  const instructorPaymentsQuery = useQuery({
    queryKey: ["payments", "instructor"],
    queryFn: () => apiFetch<InstructorPayment[]>("/payments/instructor", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "INSTRUCTOR" && user?.tenantId)
  });

  const studentInstructorsQuery = useQuery({
    queryKey: ["student-instructors"],
    queryFn: () => apiFetch<StudentInstructorItem[]>("/student/instructors", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "STUDENT")
  });

  const studentCoursesQuery = useQuery({
    queryKey: ["courses", "student-dashboard"],
    queryFn: () => apiFetch<StudentCourse[]>("/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "STUDENT")
  });

  const studentMyCoursesQuery = useQuery({
    queryKey: ["enrollments", "my-courses", "student-dashboard"],
    queryFn: () => apiFetch<EnrolledCourse[]>("/enrollments/my-courses", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "STUDENT")
  });

  const continueLearningQuery = useQuery({
    queryKey: ["courses", "continue-learning"],
    queryFn: () => apiFetch<ContinueLearningItem | null>("/courses/continue-learning", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "STUDENT")
  });

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "my"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiFetch<{ unreadCount: number }>("/notifications/unread-count", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const instructorSubscriptionQuery = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => apiFetch<InstructorSubscriptionSummary>("/subscription/me", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && user?.role === "INSTRUCTOR")
  });

  useEffect(() => {
    if (!hasHydrated || !accessToken || user?.role !== "INSTRUCTOR") {
      return;
    }

    if (instructorSubscriptionQuery.data?.requiresPlanSelection) {
      router.replace("/subscription");
    }
  }, [
    accessToken,
    hasHydrated,
    instructorSubscriptionQuery.data?.requiresPlanSelection,
    router,
    user?.role
  ]);

  const createMethodMutation = useMutation({
    mutationFn: () =>
      apiFetch<PaymentMethod>("/payment-methods", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          type: methodType,
          label: methodLabel,
          details: methodDetails
        })
      }),
    onSuccess: async () => {
      setMethodDetails("");
      setMethodValidationError(null);
      await paymentMethodsQuery.refetch();
    },
    onError: (error) => {
      setMethodValidationError(
        error instanceof Error
          ? error.message.replace(/^API request failed:\s*\d+\s*:?/i, "").trim()
          : "Failed to add method."
      );
    }
  });

  const approveMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/approve`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await instructorPaymentsQuery.refetch();
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiFetch(`/payments/${paymentId}/reject`, {
        method: "PATCH",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await instructorPaymentsQuery.refetch();
    }
  });

  const deleteMethodMutation = useMutation({
    mutationFn: (methodId: string) =>
      apiFetch<PaymentMethod>(`/payment-methods/${methodId}`, {
        method: "DELETE",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      setDeleteMethodError(null);
      await paymentMethodsQuery.refetch();
    },
    onError: (error) => {
      setDeleteMethodError(error instanceof Error ? error.message : "Failed to delete payment method.");
    }
  });

  const joinInstructorMutation = useMutation({
    mutationFn: () =>
      apiFetch("/student/instructors/join", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          inviteCode: studentInviteCode
        })
      }),
    onSuccess: async () => {
      setStudentInviteCode("");
      setStudentJoinError(null);
      await Promise.all([
        studentInstructorsQuery.refetch(),
        studentCoursesQuery.refetch(),
        studentMyCoursesQuery.refetch(),
        continueLearningQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["courses"] })
      ]);
    },
    onError: (error) => {
      setStudentJoinError(error instanceof Error ? error.message : "Unable to join instructor.");
    }
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

  function onLogout() {
    clearSession();
    clearAuthCookie();
    router.push("/login");
  }

  async function onCopyInviteCode() {
    if (!inviteCodeQuery.data?.inviteCode) {
      return;
    }

    await navigator.clipboard.writeText(inviteCodeQuery.data.inviteCode);
  }

  async function onCreateMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const detailsError = validatePaymentMethodDetails(methodType, methodDetails);
    if (detailsError) {
      setMethodValidationError(detailsError);
      return;
    }

    const normalizedDetails = methodDetails.trim();
    const duplicateMethod = paymentMethodsQuery.data?.some(
      (method) => method.type === methodType && method.details.trim() === normalizedDetails
    );

    if (duplicateMethod) {
      setMethodValidationError("This account is already added for this payment method");
      return;
    }

    setMethodValidationError(null);
    await createMethodMutation.mutateAsync();
  }

  async function onDeleteMethod(methodId: string) {
    const confirmed = window.confirm("Delete this payment method? It will no longer be available for new payments.");
    if (!confirmed) {
      return;
    }

    setDeleteMethodError(null);
    await deleteMethodMutation.mutateAsync(methodId);
  }

  async function onJoinInstructor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedInviteCode = studentInviteCode.trim().toUpperCase();
    if (!normalizedInviteCode) {
      setStudentJoinError("Invite code is required.");
      return;
    }

    const duplicateInstructor = studentInstructorsQuery.data?.some(
      (item) => item.instructor.tenant?.inviteCode === normalizedInviteCode
    );

    if (duplicateInstructor) {
      setStudentJoinError("Already joined this instructor");
      return;
    }

    setStudentInviteCode(normalizedInviteCode);
    setStudentJoinError(null);
    await joinInstructorMutation.mutateAsync();
  }

  const studentCourses = useMemo<StudentDashboardCourse[]>(() => {
    const enrolledCourses = new Map(
      (studentMyCoursesQuery.data ?? []).map((item) => [
        item.courseId,
        {
          progress: item.progress ?? item.course.progress ?? null,
          learningState: item.learningState ?? item.course.learningState ?? null
        }
      ])
    );

    return (studentCoursesQuery.data ?? []).map((course) => ({
      ...course,
      description: course.description ?? "",
      instructorId: course.instructor?.id ?? "",
      instructorName: course.instructor?.fullName ?? "Unknown Instructor",
      isEnrolled: enrolledCourses.has(course.id),
      progress: enrolledCourses.get(course.id)?.progress ?? course.progress ?? null,
      learningState: enrolledCourses.get(course.id)?.learningState ?? course.learningState ?? null
    }));
  }, [studentCoursesQuery.data, studentMyCoursesQuery.data]);

  const filteredStudentCourses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return studentCourses
      .filter((course) => {
        if (activeTab === "MY") {
          return course.isEnrolled;
        }
        return true;
      })
      .filter((course) => {
        if (filterType === "FREE") {
          return !course.isPaid;
        }
        if (filterType === "PAID") {
          return course.isPaid;
        }
        return true;
      })
      .filter((course) => {
        if (!normalizedQuery) {
          return true;
        }

        return (
          course.title.toLowerCase().includes(normalizedQuery) ||
          course.description.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [activeTab, filterType, searchQuery, studentCourses]);

  const groupedCoursesByInstructor = useMemo(() => {
    return filteredStudentCourses.reduce<Record<string, typeof filteredStudentCourses>>((groups, course) => {
      const key = course.instructorName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(course);
      return groups;
    }, {});
  }, [filteredStudentCourses]);

  const studentEmptyStateMessage = useMemo(() => {
    if (searchQuery.trim() && filteredStudentCourses.length === 0) {
      return "No results for your search";
    }

    if (activeTab === "MY" && filteredStudentCourses.length === 0) {
      return "You are not enrolled in any courses yet";
    }

    return "No courses found";
  }, [activeTab, filteredStudentCourses.length, searchQuery]);

  if (!hasHydrated) {
    return <main className="px-4 py-8 sm:px-6 lg:px-8">Loading session...</main>;
  }

  if (!accessToken) {
    return <main className="px-4 py-8 sm:px-6 lg:px-8">Redirecting...</main>;
  }

  return (
    <PageShell
      title="Dashboard"
      description="A role-aware workspace for learning, teaching, or platform operations with clearer priorities and less noise."
      backHref="/courses"
      maxWidthClassName="max-w-7xl"
      actions={
        <>
          <NotificationCenter
            items={notificationsQuery.data}
            unreadCount={unreadCountQuery.data?.unreadCount ?? 0}
            isLoading={notificationsQuery.isLoading}
            isUpdating={markNotificationReadMutation.isPending || markAllNotificationsReadMutation.isPending}
            onMarkRead={(notificationId) => markNotificationReadMutation.mutate(notificationId)}
            onMarkAllRead={() => markAllNotificationsReadMutation.mutate()}
          />
          <Link href="/profile" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            Profile
          </Link>
          {profileQuery.data?.role === "ADMIN" ? (
            <Link href="/admin" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              Admin
            </Link>
          ) : null}
          <button onClick={onLogout} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm">
            Logout
          </button>
        </>
      }
    >
      {profileQuery.isLoading ? <p>Loading profile...</p> : null}
      {profileQuery.isError ? <p className="text-rose-600">Failed to load profile. Please login again.</p> : null}

      {profileQuery.data ? (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ContentCard className="overflow-hidden p-0">
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_34%),linear-gradient(150deg,#ffffff_0%,#f8fafc_32%,#e0f2fe_100%)] p-6 sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="section-kicker">Workspace Identity</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{profileQuery.data.fullName}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{profileQuery.data.email}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusChip tone="info">{profileQuery.data.role}</StatusChip>
                      <StatusChip>{profileQuery.data.tenant?.name ?? "No workspace assigned"}</StatusChip>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:w-[18rem]">
                    <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unread</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadCountQuery.data?.unreadCount ?? 0}</p>
                    </div>
                    <div className="rounded-[22px] border border-slate-200 bg-white/85 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Member since</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{new Date(profileQuery.data.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ContentCard>

            <ContentCard className="p-6">
              <p className="section-kicker">Activity</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Stay focused on the next task</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Notifications now live behind the bell button in the header so the dashboard stays cleaner and more focused.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip tone={(unreadCountQuery.data?.unreadCount ?? 0) > 0 ? "warning" : "success"}>
                  {(unreadCountQuery.data?.unreadCount ?? 0) > 0 ? `${unreadCountQuery.data?.unreadCount ?? 0} unread notifications` : "No unread notifications"}
                </StatusChip>
              </div>
            </ContentCard>
          </section>

          {profileQuery.data.role === "ADMIN" ? (
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
          ) : profileQuery.data.role === "INSTRUCTOR" ? (
            <>
              {instructorSubscriptionQuery.data ? (
                <ContentCard
                  className={`p-6 ${
                    instructorSubscriptionQuery.data.freezeCreation
                      ? "border-amber-200 bg-amber-50/90"
                      : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                        ? "border-sky-200 bg-sky-50/90"
                        : "border-emerald-200 bg-emerald-50/90"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-950">
                          {instructorSubscriptionQuery.data.selectedPlan?.name ?? "No plan selected"}
                        </p>
                        <StatusChip
                          tone={
                            instructorSubscriptionQuery.data.freezeCreation
                              ? "warning"
                              : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                                ? "trial"
                                : "success"
                          }
                        >
                          {instructorSubscriptionQuery.data.freezeCreation
                            ? "Frozen"
                            : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                              ? "Trial"
                              : "Active"}
                        </StatusChip>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {instructorSubscriptionQuery.data.freezeCreation
                          ? "Your workspace can still be viewed, but creation is paused until an admin activates a subscription."
                          : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                            ? `Trial active with ${instructorSubscriptionQuery.data.daysRemaining} day(s) remaining. Trial limits still apply.`
                            : `Subscription active on the ${instructorSubscriptionQuery.data.currentSubscription?.billingPeriod.toLowerCase()} billing cycle.`}
                      </p>
                    </div>
                    <Link href="/subscription" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                      Manage plan
                    </Link>
                  </div>
                </ContentCard>
              ) : null}
              <InstructorDashboardSection
                accessToken={accessToken ?? ""}
                inviteCode={inviteCodeQuery.data?.inviteCode}
                methodType={methodType}
                methodLabel={methodLabel}
                methodDetails={methodDetails}
                methodValidationError={methodValidationError}
                deleteMethodError={deleteMethodError}
                paymentMethods={paymentMethodsQuery.data}
                instructorPayments={instructorPaymentsQuery.data}
                isCreatingMethod={createMethodMutation.isPending}
                isDeletingMethod={deleteMethodMutation.isPending}
                onCopyInviteCode={onCopyInviteCode}
                onCreateMethod={onCreateMethod}
                onDeleteMethod={onDeleteMethod}
                onApprovePayment={(paymentId) => approveMutation.mutate(paymentId)}
                onRejectPayment={(paymentId) => rejectMutation.mutate(paymentId)}
                onMethodTypeChange={(nextType) => {
                  setMethodType(nextType);
                  setMethodValidationError(null);
                  const nextLabel = PAYMENT_METHOD_OPTIONS.find((item) => item.value === nextType)?.label ?? nextType;
                  setMethodLabel(nextLabel.replace(" (Future)", ""));
                }}
                onMethodLabelChange={setMethodLabel}
                onMethodDetailsChange={(value) => {
                  setMethodDetails(value);
                  if (methodValidationError) {
                    setMethodValidationError(null);
                  }
                }}
              />
            </>
          ) : (
            <StudentDashboardSection
              studentInviteCode={studentInviteCode}
              studentJoinError={studentJoinError}
              activeTab={activeTab}
              filterType={filterType}
              searchQuery={searchQuery}
              continueLearning={continueLearningQuery.data ?? null}
              studentInstructors={studentInstructorsQuery.data}
              filteredStudentCourses={filteredStudentCourses}
              groupedCoursesByInstructor={groupedCoursesByInstructor}
              studentEmptyStateMessage={studentEmptyStateMessage}
              isJoiningInstructor={joinInstructorMutation.isPending}
              isLoadingCourses={
                studentCoursesQuery.isLoading || studentMyCoursesQuery.isLoading || continueLearningQuery.isLoading
              }
              hasCourseError={studentCoursesQuery.isError || studentMyCoursesQuery.isError}
              onJoinInstructor={onJoinInstructor}
              onStudentInviteCodeChange={setStudentInviteCode}
              clearStudentJoinError={() => setStudentJoinError(null)}
              onActiveTabChange={setActiveTab}
              onFilterTypeChange={setFilterType}
              onSearchQueryChange={setSearchQuery}
            />
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
