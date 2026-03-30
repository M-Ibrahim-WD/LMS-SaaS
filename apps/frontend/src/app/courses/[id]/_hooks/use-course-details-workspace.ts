"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../../../lib/api/client";
import { useAuthStore } from "../../../../store/auth.store";

import type {
  CourseAssessments,
  CourseCompletionStatus,
  CourseDetails,
  CourseListItem,
  CourseReview,
  EnrollmentItem,
  MergedLearningState,
  PaymentMethod,
  ProofUploadState,
  StudentPayment
} from "../_components/course-details-types";

export function useCourseDetailsWorkspace() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const params = useParams<{ id: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileName, setProofFileName] = useState("");
  const [proofUploadState, setProofUploadState] =
    useState<ProofUploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(
    null
  );
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, string>
  >({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [quizFormErrors, setQuizFormErrors] = useState<Record<string, string>>(
    {}
  );
  const [assignmentFormErrors, setAssignmentFormErrors] = useState<
    Record<string, string>
  >({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const isInstructor = user?.role === "INSTRUCTOR";
  const isStudent = user?.role === "STUDENT";

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () =>
      apiFetch<CourseListItem[]>("/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const myEnrollmentsQuery = useQuery({
    queryKey: ["enrollments", "my-courses"],
    queryFn: () =>
      apiFetch<EnrollmentItem[]>("/enrollments/my-courses", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && isStudent)
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", "course", params.id],
    queryFn: () =>
      apiFetch<PaymentMethod[]>(`/payment-methods/course/${params.id}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && isStudent && params.id)
  });

  const myPaymentsQuery = useQuery({
    queryKey: ["payments", "my"],
    queryFn: () =>
      apiFetch<StudentPayment[]>("/payments/my", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && isStudent)
  });

  const isEnrolled = Boolean(
    myEnrollmentsQuery.data?.some((item) => item.courseId === params.id)
  );
  const canAccessLessons = isInstructor || (isStudent && isEnrolled);

  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: () =>
      apiFetch<CourseDetails>(`/courses/${params.id}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && params.id && canAccessLessons)
  });

  const assessmentsQuery = useQuery({
    queryKey: ["course-assessments", params.id],
    queryFn: () =>
      apiFetch<CourseAssessments>(`/assessments/courses/${params.id}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && params.id && canAccessLessons)
  });

  const completionStatusQuery = useQuery({
    queryKey: ["course-certificate-status", params.id],
    queryFn: () =>
      apiFetch<CourseCompletionStatus>(`/certificates/courses/${params.id}/status`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && params.id && isStudent && canAccessLessons)
  });

  const myReviewQuery = useQuery({
    queryKey: ["course-review", params.id, "mine"],
    queryFn: () =>
      apiFetch<CourseReview | null>(`/reviews/courses/${params.id}/mine`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && params.id && isStudent && canAccessLessons)
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      apiFetch<EnrollmentItem>("/enrollments", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ courseId: params.id })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["enrollments", "my-courses"]
      });
      await queryClient.invalidateQueries({ queryKey: ["course", params.id] });
    }
  });

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiFetch(`/courses/${params.id}/lessons/${lessonId}/complete`, {
        method: "POST",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "student-dashboard"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "continue-learning"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["enrollments", "my-courses"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["enrollments", "my-courses", "student-dashboard"]
        }),
        completionStatusQuery.refetch()
      ]);
    }
  });

  const trackLessonViewMutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiFetch(`/courses/${params.id}/lessons/${lessonId}/view`, {
        method: "POST",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course", params.id] }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "student-dashboard"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["courses", "continue-learning"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["enrollments", "my-courses"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["enrollments", "my-courses", "student-dashboard"]
        })
      ]);
    }
  });

  const submitQuizMutation = useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: string[] }) =>
      apiFetch(`/assessments/quizzes/${quizId}/submit`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ answers })
      }),
    onSuccess: async () => {
      await Promise.all([
        assessmentsQuery.refetch(),
        completionStatusQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: ["course-assessments", params.id]
        })
      ]);
    }
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: ({
      assignmentId,
      content
    }: {
      assignmentId: string;
      content: string;
    }) =>
      apiFetch(`/assessments/assignments/${assignmentId}/submit`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ content })
      }),
    onSuccess: async () => {
      await Promise.all([
        assessmentsQuery.refetch(),
        completionStatusQuery.refetch(),
        queryClient.invalidateQueries({
          queryKey: ["course-assessments", params.id]
        })
      ]);
    }
  });

  const issueCertificateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/certificates/courses/${params.id}/issue`, {
        method: "POST",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await completionStatusQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["certificates", "my"] });
    }
  });

  const submitReviewMutation = useMutation({
    mutationFn: () =>
      apiFetch<CourseReview>(`/reviews/courses/${params.id}`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || undefined
        })
      }),
    onSuccess: async (review) => {
      setReviewRating(review.rating);
      setReviewComment(review.comment ?? "");
      await Promise.all([
        myReviewQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["instructor-public-reviews"] }),
        queryClient.invalidateQueries({
          queryKey: ["public-instructor-profile"]
        })
      ]);
    }
  });

  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) {
        throw new Error("Proof file is required");
      }
      if (!accessToken) {
        throw new Error("You are not authenticated");
      }

      setProofUploadState("uploading");
      setUploadProgress(0);
      setPaymentErrorMessage(null);

      const formData = new FormData();
      formData.append("courseId", params.id);
      formData.append("methodId", selectedMethodId);
      formData.append("proof", proofFile);

      return await new Promise<StudentPayment>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiUrl}/payments`);
        xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }
          const percent = Math.min(
            100,
            Math.round((event.loaded / event.total) * 100)
          );
          setUploadProgress(percent);
        };

        xhr.onload = () => {
          const raw = xhr.responseText || "{}";
          let parsed: unknown = {};
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = {};
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            setProofUploadState("uploaded");
            resolve(parsed as StudentPayment);
            return;
          }

          const maybe = parsed as { message?: string | string[] };
          const message = Array.isArray(maybe.message)
            ? maybe.message.join(", ")
            : maybe.message || `API request failed: ${xhr.status}`;
          reject(new Error(message));
        };

        xhr.onerror = () =>
          reject(new Error("Upload failed. Please check your network."));
        xhr.onabort = () => reject(new Error("Upload was cancelled."));
        xhr.send(formData);
      });
    },
    onSuccess: async () => {
      setProofFile(null);
      setUploadProgress(100);
      setPaymentErrorMessage(null);
      await myPaymentsQuery.refetch();
    },
    onError: (error) => {
      setProofUploadState("failed");
      setUploadProgress(0);
      setPaymentErrorMessage(
        error instanceof Error ? error.message : "Payment submission failed."
      );
    }
  });

  const selectedCourse =
    courseQuery.data ?? coursesQuery.data?.find((course) => course.id === params.id);
  const manualMethods = (paymentMethodsQuery.data ?? []).filter(
    (method) => method.category === "MANUAL"
  );
  const latestPayment = myPaymentsQuery.data?.find(
    (payment) => payment.courseId === params.id
  );
  const enrolledCourse = myEnrollmentsQuery.data?.find(
    (item) => item.courseId === params.id
  );
  const courseProgress =
    courseQuery.data?.progress ??
    enrolledCourse?.progress ??
    selectedCourse?.progress ??
    null;
  const learningState =
    courseQuery.data?.learningState ??
    enrolledCourse?.learningState ??
    selectedCourse?.learningState ??
    null;

  const hasNextLessonId = (
    state: MergedLearningState | null
  ): state is Extract<MergedLearningState, { nextLessonId?: string | null }> =>
    state !== null && "nextLessonId" in state;

  const hasNextLesson = (
    state: MergedLearningState | null
  ): state is Extract<
    MergedLearningState,
    { nextLesson?: { id: string; title: string; order: number } | null }
  > => state !== null && "nextLesson" in state;

  let nextLessonId: string | null = null;
  if (hasNextLessonId(learningState)) {
    nextLessonId = learningState.nextLessonId ?? null;
  } else if (hasNextLesson(learningState)) {
    nextLessonId = learningState.nextLesson?.id ?? null;
  }

  const allLessons = useMemo(
    () =>
      courseQuery.data?.sections.flatMap((section) =>
        section.lessons.map((lesson) => ({
          ...lesson,
          sectionId: section.id,
          sectionTitle: section.title
        }))
      ) ?? [],
    [courseQuery.data?.sections]
  );

  useEffect(() => {
    if (!allLessons.length) {
      setActiveLessonId(null);
      return;
    }

    const preferred =
      learningState?.lastLessonId ?? nextLessonId ?? allLessons[0]?.id ?? null;
    if (
      !activeLessonId ||
      !allLessons.some((lesson) => lesson.id === activeLessonId)
    ) {
      setActiveLessonId(preferred);
    }
  }, [activeLessonId, allLessons, learningState?.lastLessonId, nextLessonId]);

  const activeLesson =
    allLessons.find((lesson) => lesson.id === activeLessonId) ??
    allLessons[0] ??
    null;
  const activeLessonIndex = activeLesson
    ? allLessons.findIndex((lesson) => lesson.id === activeLesson.id)
    : -1;
  const previousLesson =
    activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
  const upcomingLesson =
    activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1
      ? allLessons[activeLessonIndex + 1]
      : null;

  function setQuizAnswer(quizId: string, questionIndex: number, value: string) {
    setQuizAnswers((current) => {
      const next = [...(current[quizId] ?? [])];
      next[questionIndex] = value;
      return {
        ...current,
        [quizId]: next
      };
    });
    setQuizFormErrors((current) => ({ ...current, [quizId]: "" }));
  }

  async function onSelectLesson(lessonId: string) {
    setActiveLessonId(lessonId);
    if (isStudent && canAccessLessons && !trackLessonViewMutation.isPending) {
      await trackLessonViewMutation.mutateAsync(lessonId);
    }
  }

  async function onSubmitQuiz(quizId: string, questionCount: number) {
    const answers = quizAnswers[quizId] ?? [];
    if (answers.length !== questionCount || answers.some((answer) => !answer)) {
      setQuizFormErrors((current) => ({
        ...current,
        [quizId]: "Answer every question before submitting."
      }));
      return;
    }

    await submitQuizMutation.mutateAsync({ quizId, answers });
    setQuizFormErrors((current) => ({ ...current, [quizId]: "" }));
  }

  async function onSubmitAssignment(assignmentId: string) {
    const content = assignmentDrafts[assignmentId]?.trim() ?? "";
    if (!content) {
      setAssignmentFormErrors((current) => ({
        ...current,
        [assignmentId]: "Assignment response is required."
      }));
      return;
    }

    await submitAssignmentMutation.mutateAsync({ assignmentId, content });
    setAssignmentFormErrors((current) => ({ ...current, [assignmentId]: "" }));
  }

  function onProofChange(file: File | null) {
    if (!file) {
      setProofFile(null);
      setProofFileName("");
      setProofUploadState("idle");
      setUploadProgress(null);
      setPaymentErrorMessage(null);
      return;
    }

    setProofFile(file);
    setProofFileName(file.name);
    setProofUploadState("selected");
    setUploadProgress(0);
    setPaymentErrorMessage(null);
  }

  async function onSubmitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitPaymentMutation.mutateAsync();
  }

  async function onRetryUpload() {
    if (!proofFile || !selectedMethodId || submitPaymentMutation.isPending) {
      return;
    }

    await submitPaymentMutation.mutateAsync();
  }

  async function onSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitReviewMutation.mutateAsync();
  }

  const shouldShowProofStatus =
    proofUploadState !== "idle" && Boolean(proofFileName);
  const progressValue =
    proofUploadState === "uploaded"
      ? 100
      : proofUploadState === "failed"
        ? 100
        : uploadProgress ?? 0;
  const progressBarTone =
    proofUploadState === "failed"
      ? "bg-red-500"
      : proofUploadState === "uploaded"
        ? "bg-emerald-600"
        : "bg-slate-900";
  const proofStatusMessage =
    proofUploadState === "selected"
      ? "File selected. Ready to upload."
      : proofUploadState === "uploading"
        ? `Uploading proof: ${uploadProgress ?? 0}%`
        : proofUploadState === "uploaded"
          ? "Upload completed. Payment proof submitted."
          : proofUploadState === "failed"
            ? paymentErrorMessage ?? "Upload failed. Please try again."
            : null;

  useEffect(() => {
    if (myReviewQuery.data) {
      setReviewRating(myReviewQuery.data.rating);
      setReviewComment(myReviewQuery.data.comment ?? "");
    }
  }, [myReviewQuery.data]);

  return {
    apiUrl,
    params,
    accessToken,
    user,
    selectedMethodId,
    setSelectedMethodId,
    proofFile,
    proofFileName,
    proofUploadState,
    uploadProgress,
    paymentErrorMessage,
    quizAnswers,
    assignmentDrafts,
    setAssignmentDrafts,
    setAssignmentFormErrors,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    quizFormErrors,
    assignmentFormErrors,
    activeLessonId,
    setActiveLessonId,
    isInstructor,
    isStudent,
    coursesQuery,
    myEnrollmentsQuery,
    paymentMethodsQuery,
    myPaymentsQuery,
    isEnrolled,
    canAccessLessons,
    courseQuery,
    assessmentsQuery,
    completionStatusQuery,
    myReviewQuery,
    enrollMutation,
    completeLessonMutation,
    trackLessonViewMutation,
    submitQuizMutation,
    submitAssignmentMutation,
    issueCertificateMutation,
    submitReviewMutation,
    submitPaymentMutation,
    selectedCourse,
    manualMethods,
    latestPayment,
    enrolledCourse,
    courseProgress,
    learningState,
    nextLessonId,
    allLessons,
    activeLesson,
    activeLessonIndex,
    previousLesson,
    upcomingLesson,
    setQuizAnswer,
    onSelectLesson,
    onSubmitQuiz,
    onSubmitAssignment,
    onProofChange,
    onSubmitPayment,
    onRetryUpload,
    onSubmitReview,
    shouldShowProofStatus,
    progressValue,
    progressBarTone,
    proofStatusMessage
  };
}
