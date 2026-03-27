"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api/client";
import { useAuthStore } from "../../../store/auth.store";
import { BackButton } from "../../../components/back-button";
import { VideoPlayer } from "../../../components/video-player";
import { type PaymentMethodType } from "../../../lib/payments/payment-methods";

interface Lesson {
  id: string;
  title: string;
  content: string;
  type: "VIDEO" | "TEXT" | "FILE";
  order: number;
  isCompleted?: boolean;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CourseDetails {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  instructor?: {
    id: string;
    fullName: string;
  };
  sections: Section[];
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLessonId?: string | null;
  } | null;
}

interface CourseListItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  instructor?: {
    id: string;
    fullName: string;
  };
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLessonId?: string | null;
  } | null;
}

interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
}

interface EnrollmentItem {
  id: string;
  courseId: string;
  createdAt: string;
  course: CourseListItem;
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLesson?: {
      id: string;
      title: string;
      order: number;
    } | null;
  } | null;
}

interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  category: "MANUAL" | "ONLINE";
  label: string;
  details: string;
  isActive: boolean;
}

interface StudentPayment {
  id: string;
  courseId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proof: string;
  amount: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE";
  options: string[];
  order: number;
  correctAnswer?: string;
}

interface QuizSubmission {
  id: string;
  score: number;
  totalQuestions: number;
  createdAt: string;
  answers: string[];
}

interface CourseQuiz {
  id: string;
  title: string;
  description?: string | null;
  questions: QuizQuestion[];
  submission: QuizSubmission | null;
}

interface AssignmentSubmission {
  id: string;
  content: string;
  status: "PENDING_REVIEW" | "REVIEWED";
  feedback?: string | null;
  score?: number | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
}

interface CourseAssignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  submission: AssignmentSubmission | null;
}

interface CourseAssessments {
  quizzes: CourseQuiz[];
  assignments: CourseAssignment[];
}

interface CourseCompletionStatus {
  lessons: {
    completed: number;
    total: number;
    done: boolean;
  };
  quizzes: {
    completed: number;
    total: number;
    done: boolean;
  };
  assignments: {
    completed: number;
    total: number;
    done: boolean;
  };
  isEligible: boolean;
  certificate: {
    id: string;
    issuedAt: string;
    certificateNumber: string;
  } | null;
}

interface CourseReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string;
}

type ProofUploadState = "idle" | "selected" | "uploading" | "uploaded" | "failed";
type MergedLearningState =
  | {
      lastLessonId: string | null;
      nextLessonId?: string | null;
    }
  | {
      lastLessonId: string | null;
      nextLesson?: {
        id: string;
        title: string;
        order: number;
      } | null;
    };

export default function CourseDetailsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
  const params = useParams<{ id: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileName, setProofFileName] = useState("");
  const [proofUploadState, setProofUploadState] = useState<ProofUploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const isInstructor = user?.role === "INSTRUCTOR";
  const isStudent = user?.role === "STUDENT";

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiFetch<CourseListItem[]>("/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });

  const myEnrollmentsQuery = useQuery({
    queryKey: ["enrollments", "my-courses"],
    queryFn: () => apiFetch<EnrollmentItem[]>("/enrollments/my-courses", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && isStudent)
  });

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", "course", params.id],
    queryFn: () =>
      apiFetch<PaymentMethod[]>(`/payment-methods/course/${params.id}`, { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && isStudent && params.id)
  });

  const myPaymentsQuery = useQuery({
    queryKey: ["payments", "my"],
    queryFn: () => apiFetch<StudentPayment[]>("/payments/my", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && isStudent)
  });

  const isEnrolled = Boolean(myEnrollmentsQuery.data?.some((item) => item.courseId === params.id));
  const canAccessLessons = isInstructor || (isStudent && isEnrolled);

  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: () => apiFetch<CourseDetails>(`/courses/${params.id}`, { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && params.id && canAccessLessons)
  });

  const assessmentsQuery = useQuery({
    queryKey: ["course-assessments", params.id],
    queryFn: () => apiFetch<CourseAssessments>(`/assessments/courses/${params.id}`, { token: accessToken ?? undefined }),
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
    queryFn: () => apiFetch<CourseReview | null>(`/reviews/courses/${params.id}/mine`, { token: accessToken ?? undefined }),
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
      await queryClient.invalidateQueries({ queryKey: ["enrollments", "my-courses"] });
      await queryClient.invalidateQueries({ queryKey: ["course", params.id] });
    }
  });

  const completeLessonMutation = useMutation({
    mutationFn: (lessonId: string) =>
      apiFetch<CourseProgress>(`/courses/${params.id}/lessons/${lessonId}/complete`, {
        method: "POST",
        token: accessToken ?? undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["course", params.id] }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
        queryClient.invalidateQueries({ queryKey: ["courses", "student-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["courses", "continue-learning"] }),
        queryClient.invalidateQueries({ queryKey: ["enrollments", "my-courses"] }),
        queryClient.invalidateQueries({ queryKey: ["enrollments", "my-courses", "student-dashboard"] }),
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
        queryClient.invalidateQueries({ queryKey: ["courses", "student-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["courses", "continue-learning"] }),
        queryClient.invalidateQueries({ queryKey: ["enrollments", "my-courses"] }),
        queryClient.invalidateQueries({ queryKey: ["enrollments", "my-courses", "student-dashboard"] })
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
        queryClient.invalidateQueries({ queryKey: ["course-assessments", params.id] })
      ]);
    }
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: ({ assignmentId, content }: { assignmentId: string; content: string }) =>
      apiFetch(`/assessments/assignments/${assignmentId}/submit`, {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({ content })
      }),
    onSuccess: async () => {
      await Promise.all([
        assessmentsQuery.refetch(),
        completionStatusQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["course-assessments", params.id] })
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
        queryClient.invalidateQueries({ queryKey: ["public-instructor-profile"] })
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
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
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

        xhr.onerror = () => reject(new Error("Upload failed. Please check your network."));
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
      setPaymentErrorMessage(error instanceof Error ? error.message : "Payment submission failed.");
    }
  });

  const selectedCourse = courseQuery.data ?? coursesQuery.data?.find((course) => course.id === params.id);
  const manualMethods = (paymentMethodsQuery.data ?? []).filter((method) => method.category === "MANUAL");
  const latestPayment = myPaymentsQuery.data?.find((payment) => payment.courseId === params.id);
  const enrolledCourse = myEnrollmentsQuery.data?.find((item) => item.courseId === params.id);
  const courseProgress = courseQuery.data?.progress ?? enrolledCourse?.progress ?? selectedCourse?.progress ?? null;
  const learningState =
    courseQuery.data?.learningState ?? enrolledCourse?.learningState ?? selectedCourse?.learningState ?? null;
  const hasNextLessonId = (
    state: MergedLearningState | null
  ): state is Extract<MergedLearningState, { nextLessonId?: string | null }> =>
    state !== null && "nextLessonId" in state;
  const hasNextLesson = (
    state: MergedLearningState | null
  ): state is Extract<MergedLearningState, { nextLesson?: { id: string; title: string; order: number } | null }> =>
    state !== null && "nextLesson" in state;
  let nextLessonId: string | null = null;
  if (hasNextLessonId(learningState)) {
    nextLessonId = learningState.nextLessonId ?? null;
  } else if (hasNextLesson(learningState)) {
    nextLessonId = learningState.nextLesson?.id ?? null;
  }

  function setQuizAnswer(quizId: string, questionIndex: number, value: string) {
    setQuizAnswers((current) => {
      const next = [...(current[quizId] ?? [])];
      next[questionIndex] = value;
      return {
        ...current,
        [quizId]: next
      };
    });
  }

  async function onSubmitQuiz(quizId: string, questionCount: number) {
    const answers = quizAnswers[quizId] ?? [];
    if (answers.length !== questionCount || answers.some((answer) => !answer)) {
      window.alert("Answer all quiz questions before submitting.");
      return;
    }

    await submitQuizMutation.mutateAsync({ quizId, answers });
  }

  async function onSubmitAssignment(assignmentId: string) {
    const content = assignmentDrafts[assignmentId]?.trim() ?? "";
    if (!content) {
      window.alert("Assignment response is required.");
      return;
    }

    await submitAssignmentMutation.mutateAsync({ assignmentId, content });
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

  async function onViewLesson(lessonId: string) {
    if (!isStudent || !canAccessLessons || trackLessonViewMutation.isPending) {
      return;
    }

    await trackLessonViewMutation.mutateAsync(lessonId);
  }

  async function onSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitReviewMutation.mutateAsync();
  }

  const shouldShowProofStatus = proofUploadState !== "idle" && Boolean(proofFileName);
  const progressValue =
    proofUploadState === "uploaded" ? 100 : proofUploadState === "failed" ? 100 : uploadProgress ?? 0;
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

  return (
    <main className="mx-auto max-w-4xl p-8">
      <BackButton fallbackHref="/courses" />
      {selectedCourse ? (
        <>
          {selectedCourse.thumbnailImage ? (
            <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCourse.thumbnailImage}
                alt={`${selectedCourse.title} thumbnail`}
                className="h-56 w-full object-cover md:h-72"
              />
            </div>
          ) : null}
          <h1 className="text-2xl font-semibold">{selectedCourse.title}</h1>
          <p className="mt-2 text-slate-700">{selectedCourse.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedCourse.category ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {selectedCourse.category}
              </span>
            ) : null}
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs text-sky-700">
              {selectedCourse.level.toLowerCase()}
            </span>
          </div>
          {selectedCourse.instructor ? (
            <p className="mt-1 text-sm text-slate-500">Instructor: {selectedCourse.instructor.fullName}</p>
          ) : null}
          <p className="mt-1 text-sm text-slate-500">
            {selectedCourse.isPaid
              ? `Paid Course - ${selectedCourse.price?.toFixed(2) ?? "0.00"}`
              : "Free Course"}
          </p>

          {isStudent && !isEnrolled ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {!selectedCourse.isPaid ? (
                <>
                  <p className="text-sm text-slate-700">This is a free course. You can enroll directly.</p>
                  <button
                    type="button"
                    onClick={() => enrollMutation.mutate()}
                    disabled={enrollMutation.isPending}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
                  </button>
                  {enrollMutation.isError ? (
                    <p className="mt-3 text-sm text-red-600">Enrollment failed. Please try again.</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700">You need to complete payment to access this course</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Course price: {selectedCourse.price?.toFixed(2) ?? "0.00"}.
                  </p>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Available Manual Methods</p>
                    {manualMethods.length ? (
                      manualMethods.map((method) => (
                        <div key={method.id} className="rounded border border-slate-200 p-3 text-sm">
                          <p className="font-medium">{method.label}</p>
                          <p className="text-slate-600">{method.type}</p>
                          <p className="mt-1 text-slate-700">{method.details}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No manual payment methods are configured yet.</p>
                    )}
                  </div>

                  <form onSubmit={onSubmitPayment} className="mt-4 space-y-3">
                    <select
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      value={selectedMethodId}
                      onChange={(event) => setSelectedMethodId(event.target.value)}
                      required
                    >
                      <option value="">Select method</option>
                      {manualMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.label} ({method.type})
                        </option>
                      ))}
                    </select>

                    <label className="block text-sm text-slate-700">
                      Upload proof screenshot
                      <input
                        className="mt-1 block w-full text-sm"
                        type="file"
                        accept="image/*,.pdf,.txt,.zip,application/octet-stream"
                        onChange={(event) => {
                          onProofChange(event.target.files?.[0] ?? null);
                        }}
                        required
                      />
                    </label>
                    {shouldShowProofStatus ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{proofFileName}</p>
                            <p className="mt-1 text-xs text-slate-600">{proofStatusMessage}</p>
                          </div>
                          {proofUploadState === "failed" ? (
                            <button
                              type="button"
                              onClick={() => void onRetryUpload()}
                              disabled={!proofFile || !selectedMethodId || submitPaymentMutation.isPending}
                              className="shrink-0 rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                            >
                              Retry upload
                            </button>
                          ) : null}
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-200">
                          <div
                            className={`h-full transition-all ${progressBarTone}`}
                            style={{ width: `${progressValue}%` }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={
                        submitPaymentMutation.isPending ||
                        !selectedMethodId ||
                        !proofFile ||
                        manualMethods.length === 0
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {submitPaymentMutation.isPending ? "Submitting..." : "Buy Course"}
                    </button>

                    {submitPaymentMutation.isError && proofUploadState !== "failed" ? (
                      <p className="text-sm text-red-600">{paymentErrorMessage ?? "Payment submission failed."}</p>
                    ) : null}
                    {submitPaymentMutation.isSuccess ? (
                      <p className="text-sm text-emerald-700">
                        Payment proof submitted. Wait for instructor approval.
                      </p>
                    ) : null}
                  </form>

                  {latestPayment ? (
                    <p className="mt-3 text-sm text-slate-700">
                      Latest payment status: <span className="font-medium">{latestPayment.status}</span>
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {canAccessLessons ? (
            <div className="mt-6 space-y-4">
              {isStudent && courseProgress ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Course progress</p>
                      <p className="text-sm text-slate-600">
                        {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons completed
                      </p>
                      {nextLessonId ? (
                        <p className="mt-2 text-xs text-slate-500">Resume from the next highlighted lesson below.</p>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-700 sm:text-right">
                      <p className="font-medium">{courseProgress.percentage}% complete</p>
                      {learningState?.lastLessonId ? (
                        <p className="mt-1 text-xs text-slate-500">Current lesson tracked</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-600 transition-all"
                      style={{ width: `${courseProgress.percentage}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {isStudent && completionStatusQuery.data ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Completion status</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Certificate unlocks after lessons, quizzes, and assignments are all completed.
                      </p>
                    </div>
                    {completionStatusQuery.data.certificate ? (
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Certificate issued
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Lessons</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {completionStatusQuery.data.lessons.completed}/{completionStatusQuery.data.lessons.total}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Quizzes</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {completionStatusQuery.data.quizzes.completed}/{completionStatusQuery.data.quizzes.total}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Assignments</p>
                      <p className="mt-2 text-sm text-slate-800">
                        {completionStatusQuery.data.assignments.completed}/{completionStatusQuery.data.assignments.total}
                      </p>
                    </div>
                  </div>

                  {completionStatusQuery.data.certificate ? (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-medium text-emerald-800">
                        Certificate Number: {completionStatusQuery.data.certificate.certificateNumber}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Issued {new Date(completionStatusQuery.data.certificate.issuedAt).toLocaleString()}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/certificates/${completionStatusQuery.data.certificate.id}`}
                          className="rounded border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-800"
                        >
                          Open certificate
                        </Link>
                        <Link
                          href={`/certificate-verification/${completionStatusQuery.data.certificate.certificateNumber}`}
                          className="rounded border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-800"
                        >
                          Public verification
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => issueCertificateMutation.mutate()}
                        disabled={!completionStatusQuery.data.isEligible || issueCertificateMutation.isPending}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {issueCertificateMutation.isPending ? "Issuing..." : "Issue Certificate"}
                      </button>
                      {!completionStatusQuery.data.isEligible ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Complete every lesson and submit every quiz and assignment first.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              {isStudent ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Course review</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Share a quick rating and comment. Your review will appear on the instructor profile.
                      </p>
                    </div>
                    {myReviewQuery.data ? (
                      <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Review saved
                      </span>
                    ) : null}
                  </div>

                  <form onSubmit={(event) => void onSubmitReview(event)} className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Rating</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setReviewRating(value)}
                            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                              reviewRating === value
                                ? "bg-amber-100 text-amber-800"
                                : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                            }`}
                          >
                            {"★".repeat(value)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Comment</span>
                      <textarea
                        className="mt-2 min-h-28 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        placeholder="What stood out about this course?"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        disabled={submitReviewMutation.isPending}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        {submitReviewMutation.isPending
                          ? "Saving review..."
                          : myReviewQuery.data
                            ? "Update Review"
                            : "Submit Review"}
                      </button>
                      {submitReviewMutation.isError ? (
                        <p className="text-sm text-red-600">
                          {(submitReviewMutation.error as Error).message}
                        </p>
                      ) : null}
                      {submitReviewMutation.isSuccess ? (
                        <p className="text-sm text-emerald-700">Review saved successfully.</p>
                      ) : null}
                    </div>
                  </form>
                </div>
              ) : null}
              {courseQuery.data?.sections.map((section) => (
                <div key={section.id} className="rounded-xl bg-white p-5 shadow">
                  <p className="font-medium">
                    {section.order}. {section.title}
                  </p>
                  <div className="mt-3 space-y-2">
                    {section.lessons.map((lesson) => {
                      const isCurrentLesson = learningState?.lastLessonId === lesson.id;
                      const isNextLesson = nextLessonId === lesson.id;

                      return (
                        <div
                          key={lesson.id}
                          id={`lesson-${lesson.id}`}
                          className={`rounded border p-3 ${
                            isCurrentLesson
                              ? "border-sky-300 bg-sky-50"
                              : isNextLesson
                                ? "border-emerald-300 bg-emerald-50"
                                : ""
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium">
                                {lesson.order}. {lesson.title}
                              </p>
                              <p className="text-xs text-slate-500">Type: {lesson.type}</p>
                              {isCurrentLesson ? (
                                <p className="mt-2 text-xs font-medium text-sky-700">Current lesson</p>
                              ) : null}
                              {isNextLesson ? (
                                <p className="mt-2 text-xs font-medium text-emerald-700">Next lesson to complete</p>
                              ) : null}
                            </div>
                            {isStudent ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void onViewLesson(lesson.id)}
                                  disabled={trackLessonViewMutation.isPending}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
                                >
                                  Set as current
                                </button>
                                <button
                                  type="button"
                                  onClick={() => completeLessonMutation.mutate(lesson.id)}
                                  disabled={Boolean(lesson.isCompleted) || completeLessonMutation.isPending}
                                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {lesson.isCompleted ? "Completed" : completeLessonMutation.isPending ? "Saving..." : "Mark complete"}
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-3">
                            {lesson.type === "VIDEO" ? (
                              <VideoPlayer title={lesson.title} url={lesson.content} />
                            ) : (
                              <p className="text-sm text-slate-700">{lesson.content}</p>
                            )}
                          </div>
                          {isStudent && lesson.isCompleted ? (
                            <p className="mt-3 text-xs font-medium text-emerald-700">Lesson completed</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="rounded-xl bg-white p-5 shadow">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Quizzes</h2>
                  <span className="text-sm text-slate-500">{assessmentsQuery.data?.quizzes.length ?? 0}</span>
                </div>
                <div className="mt-4 space-y-4">
                  {assessmentsQuery.data?.quizzes.length ? (
                    assessmentsQuery.data.quizzes.map((quiz) => (
                      <div key={quiz.id} className="rounded-lg border border-slate-200 p-4">
                        <p className="font-medium">{quiz.title}</p>
                        {quiz.description ? <p className="mt-1 text-sm text-slate-600">{quiz.description}</p> : null}
                        <div className="mt-4 space-y-3">
                          {quiz.questions.map((question, index) => (
                            <div key={question.id} className="rounded bg-slate-50 p-3">
                              <p className="text-sm font-medium">
                                {question.order}. {question.question}
                              </p>
                              <div className="mt-2 space-y-2">
                                {question.options.map((option) => (
                                  <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                      type="radio"
                                      name={`${quiz.id}-${question.id}`}
                                      value={option}
                                      checked={(quizAnswers[quiz.id] ?? quiz.submission?.answers ?? [])[index] === option}
                                      onChange={(event) => setQuizAnswer(quiz.id, index, event.target.value)}
                                      disabled={Boolean(quiz.submission)}
                                    />
                                    {option}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {quiz.submission ? (
                          <p className="mt-4 text-sm font-medium text-emerald-700">
                            Submitted. Score: {quiz.submission.score}/{quiz.submission.totalQuestions}
                          </p>
                        ) : isStudent ? (
                          <button
                            type="button"
                            onClick={() => void onSubmitQuiz(quiz.id, quiz.questions.length)}
                            disabled={submitQuizMutation.isPending}
                            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {submitQuizMutation.isPending ? "Submitting..." : "Submit Quiz"}
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No quizzes for this course yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Assignments</h2>
                  <span className="text-sm text-slate-500">{assessmentsQuery.data?.assignments.length ?? 0}</span>
                </div>
                <div className="mt-4 space-y-4">
                  {assessmentsQuery.data?.assignments.length ? (
                    assessmentsQuery.data.assignments.map((assignment) => (
                      <div key={assignment.id} className="rounded-lg border border-slate-200 p-4">
                        <p className="font-medium">{assignment.title}</p>
                        {assignment.description ? (
                          <p className="mt-1 text-sm text-slate-600">{assignment.description}</p>
                        ) : null}
                        {assignment.instructions ? (
                          <p className="mt-2 text-sm text-slate-700">{assignment.instructions}</p>
                        ) : null}
                        {isStudent ? (
                          <>
                            <textarea
                              className="mt-4 min-h-28 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Write your assignment response"
                              value={assignmentDrafts[assignment.id] ?? assignment.submission?.content ?? ""}
                              onChange={(event) =>
                                setAssignmentDrafts((current) => ({
                                  ...current,
                                  [assignment.id]: event.target.value
                                }))
                              }
                            />
                            <button
                              type="button"
                              onClick={() => void onSubmitAssignment(assignment.id)}
                              disabled={submitAssignmentMutation.isPending}
                              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                            >
                              {assignment.submission
                                ? submitAssignmentMutation.isPending
                                  ? "Updating..."
                                  : "Update Submission"
                                : submitAssignmentMutation.isPending
                                  ? "Submitting..."
                                  : "Submit Assignment"}
                            </button>
                            {assignment.submission ? (
                              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                                <p className="text-xs uppercase tracking-wide text-slate-500">Submission status</p>
                                <p className="mt-2 font-medium text-slate-900">
                                  {assignment.submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Last submitted: {new Date(assignment.submission.updatedAt).toLocaleString()}
                                </p>
                                {assignment.submission.score !== null && assignment.submission.score !== undefined ? (
                                  <p className="mt-2 text-sm text-slate-700">Score: {assignment.submission.score}</p>
                                ) : null}
                                {assignment.submission.feedback ? (
                                  <p className="mt-2 text-sm text-slate-700">Feedback: {assignment.submission.feedback}</p>
                                ) : null}
                                {assignment.submission.reviewedAt ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Reviewed: {new Date(assignment.submission.reviewedAt).toLocaleString()}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No assignments for this course yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}
