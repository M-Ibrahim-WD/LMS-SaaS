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
import { BackButton } from "../../components/back-button";
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
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <BackButton fallbackHref="/courses" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              Profile
            </Link>
            {profileQuery.data?.role === "ADMIN" ? (
              <Link href="/admin" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                Admin
              </Link>
            ) : null}
            <button onClick={onLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm">
              Logout
            </button>
          </div>
        </div>

        {profileQuery.isLoading ? <p className="mt-4">Loading profile...</p> : null}
        {profileQuery.isError ? <p className="mt-4 text-red-600">Failed to load profile. Please login again.</p> : null}

        {profileQuery.data ? (
          <div className="mt-6 space-y-2 text-sm text-slate-700 sm:text-base">
            <p>
              <span className="font-medium">Name:</span> {profileQuery.data.fullName}
            </p>
            <p>
              <span className="font-medium">Email:</span> {profileQuery.data.email}
            </p>
            <p>
              <span className="font-medium">Role:</span> {profileQuery.data.role}
            </p>
            <p>
              <span className="font-medium">Tenant:</span>{" "}
              {profileQuery.data.tenant?.name ?? profileQuery.data.tenantId ?? "Not assigned"}
            </p>

            <div className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">
                    {unreadCountQuery.data?.unreadCount ?? 0} unread
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {notificationsQuery.data?.length ? (
                  notificationsQuery.data.slice(0, 6).map((notification) => (
                    <div
                      key={notification.id}
                      className={`rounded-lg border p-3 ${
                        notification.isRead ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {!notification.isRead ? (
                          <button
                            type="button"
                            onClick={() => markNotificationReadMutation.mutate(notification.id)}
                            disabled={markNotificationReadMutation.isPending}
                            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 disabled:opacity-60"
                          >
                            Mark read
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No notifications yet.</p>
                )}
              </div>
            </div>

            {profileQuery.data.role === "ADMIN" ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold text-slate-900">Admin Console</p>
                <p className="mt-2 text-sm text-slate-600">
                  Platform oversight lives in the admin workspace with tenants, users, course activity, and payment monitoring.
                </p>
                <div className="mt-4">
                  <Link href="/admin" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
                    Open Admin Dashboard
                  </Link>
                </div>
              </div>
            ) : profileQuery.data.role === "INSTRUCTOR" ? (
              <>
                {instructorSubscriptionQuery.data ? (
                  <div
                    className={`mt-6 rounded-2xl border p-4 ${
                      instructorSubscriptionQuery.data.freezeCreation
                        ? "border-amber-200 bg-amber-50"
                        : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                          ? "border-sky-200 bg-sky-50"
                          : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {instructorSubscriptionQuery.data.selectedPlan?.name ?? "No plan selected"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {instructorSubscriptionQuery.data.freezeCreation
                            ? "Your workspace is frozen for creation until an admin activates a subscription."
                            : instructorSubscriptionQuery.data.currentSubscription?.isTrial
                              ? `Trial active: ${instructorSubscriptionQuery.data.daysRemaining} day(s) remaining. Trial limits are still in effect.`
                              : `Subscription active on the ${instructorSubscriptionQuery.data.currentSubscription?.billingPeriod.toLowerCase()} cycle.`}
                        </p>
                      </div>
                      <Link
                        href="/subscription"
                        className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                      >
                        Manage plan
                      </Link>
                    </div>
                  </div>
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
      </div>
    </main>
  );
}
