"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api/client";
import { clearAuthCookie } from "../../../lib/auth/session";
import {
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethodType,
  validatePaymentMethodDetails
} from "../../../lib/payments/payment-methods";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { useAuthStore } from "../../../store/auth.store";
import type {
  ContinueLearningItem,
  ConversationUnreadItem,
  CourseFilter,
  EnrolledCourse,
  InstructorPayment,
  InstructorSubscriptionSummary,
  InviteCodeResponse,
  NotificationItem,
  PaymentMethod,
  Profile,
  StudentCourse,
  StudentDashboardCourse,
  StudentInstructorItem,
  StudentTab
} from "../_components/dashboard-types";

export function useDashboardWorkspace() {
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

  const directUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "dashboard", "direct-unread"],
    queryFn: () =>
      apiFetch<ConversationUnreadItem[]>("/conversations?kind=DIRECT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && user?.role !== "ADMIN")
  });

  const supportUnreadConversationsQuery = useQuery({
    queryKey: ["conversations", "dashboard", "support-unread"],
    queryFn: () =>
      apiFetch<ConversationUnreadItem[]>("/conversations?kind=SUPPORT&unreadOnly=true", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(
      accessToken &&
        (user?.role !== "ADMIN" ||
          user?.isSuperAdmin ||
          user?.adminPermissions?.includes("HANDLE_SUPPORT"))
    )
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

  function onMethodTypeChange(nextType: PaymentMethodType) {
    setMethodType(nextType);
    setMethodValidationError(null);
    const nextLabel = PAYMENT_METHOD_OPTIONS.find((item) => item.value === nextType)?.label ?? nextType;
    setMethodLabel(nextLabel.replace(" (Future)", ""));
  }

  function onMethodDetailsChange(value: string) {
    setMethodDetails(value);
    if (methodValidationError) {
      setMethodValidationError(null);
    }
  }

  return {
    accessToken,
    user,
    hasHydrated,
    profileQuery,
    inviteCodeQuery,
    paymentMethodsQuery,
    instructorPaymentsQuery,
    studentInstructorsQuery,
    studentCoursesQuery,
    studentMyCoursesQuery,
    continueLearningQuery,
    notificationsQuery,
    unreadCountQuery,
    directUnreadConversationsQuery,
    supportUnreadConversationsQuery,
    instructorSubscriptionQuery,
    methodType,
    methodLabel,
    methodDetails,
    methodValidationError,
    deleteMethodError,
    studentInviteCode,
    studentJoinError,
    activeTab,
    filterType,
    searchQuery,
    filteredStudentCourses,
    groupedCoursesByInstructor,
    studentEmptyStateMessage,
    onLogout,
    onCopyInviteCode,
    onCreateMethod,
    onDeleteMethod,
    onJoinInstructor,
    setStudentInviteCode,
    clearStudentJoinError: () => setStudentJoinError(null),
    setActiveTab,
    setFilterType,
    setSearchQuery,
    onMethodTypeChange,
    setMethodLabel,
    onMethodDetailsChange,
    createMethodMutation,
    deleteMethodMutation,
    joinInstructorMutation,
    approveMutation,
    rejectMutation,
    markNotificationReadMutation,
    markAllNotificationsReadMutation
  };
}
