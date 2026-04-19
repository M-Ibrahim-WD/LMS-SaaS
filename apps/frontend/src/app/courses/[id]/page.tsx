"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BackButton } from "../../../components/back-button";
import { ProtectedLessonMediaViewer } from "../../../components/protected-lesson-media-viewer";
import {
  EmptyState,
  PillButton,
  StatPill,
  WorkspacePanel
} from "../../../components/course-workspace";
import { StatusBanner } from "../../../components/status-banner";

import {
  formatCourseDate,
  type CourseAssignment,
  type CourseQuiz
} from "./_components/course-details-types";
import { useCourseDetailsWorkspace } from "./_hooks/use-course-details-workspace";

function formatInterviewCountdown(value: string, now = Date.now()) {
  const diffMs = new Date(value).getTime() - now;
  const diffMinutes = Math.ceil(diffMs / (1000 * 60));

  if (diffMinutes <= 0) {
    return "Live now";
  }

  const days = Math.floor(diffMinutes / (60 * 24));
  const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
  const minutes = diffMinutes % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

function MobileSection({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
    >
      <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-950">
        <div className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Open</span>
        </div>
      </summary>
      <div className="border-t border-slate-100 p-4">{children}</div>
    </details>
  );
}

function AccordionWorkspacePanel({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="surface-card overflow-hidden rounded-[22px] sm:rounded-[28px]"
    >
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.1rem]">{title}</h2>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Open</span>
        </div>
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </details>
  );
}

export default function CourseDetailsPage() {
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [hoveredReviewRating, setHoveredReviewRating] = useState<number | null>(null);
  const [activeSupportTab, setActiveSupportTab] = useState<"lesson" | "section" | "course">("lesson");
  const [activeAssessmentTab, setActiveAssessmentTab] = useState<"exams" | "assignments">("exams");

  const {
    activeLesson,
    activeInterviewId,
    activeQuizId,
    activeInterviewQuery,
    assignmentDrafts,
    assignmentFormErrors,
    assessmentsQuery,
    canAccessLessons,
    completeLessonMutation,
    completionStatusQuery,
    courseProgress,
    courseQuery,
    isAdminReviewer,
    enrollMutation,
    isEnrolled,
    isInstructor,
    isStudent,
    issueCertificateMutation,
    interviewSessionsQuery,
    latestPayment,
    learningState,
    manualMethods,
    myReviewQuery,
    nextLessonId,
    onProofChange,
    onRetryUpload,
    onSelectLesson,
    onAbandonQuizAttempt,
    onStartQuizAttempt,
    onSubmitAssignment,
    onSubmitPayment,
    onSubmitQuiz,
    onSubmitReview,
    paymentErrorMessage,
    progressBarTone,
    progressValue,
    proofFile,
    proofFileName,
    proofStatusMessage,
    proofUploadState,
    previousLesson,
    quizAnswers,
    quizFormErrors,
    recordInterviewAttendanceMutation,
    reviewComment,
    reviewRating,
    reviewCourseMutation,
    selectedCourse,
    selectedMethodId,
    setActiveInterviewId,
    setActiveQuizId,
    setAdminReviewReport,
    setWarningQuizId,
    setAssignmentDrafts,
    setAssignmentFormErrors,
    setQuizAnswer,
    adminReviewReport,
    setReviewComment,
    setReviewRating,
    setSelectedMethodId,
    shouldShowProofStatus,
    submitAssignmentMutation,
    submitPaymentMutation,
    submitQuizMutation,
    startQuizAttemptMutation,
    submitReviewMutation,
    upcomingLesson,
    warningQuizId
  } = useCourseDetailsWorkspace();

  const interviewSessions = interviewSessionsQuery.data ?? [];
  const nextInterview = interviewSessions[0] ?? null;
  const hasLiveSessions = interviewSessions.length > 0;
  const activeInterview = activeInterviewQuery.data;
  const trackedInterviewTime = activeInterview?.scheduledAt ?? nextInterview?.scheduledAt ?? null;
  const activeSection =
    courseQuery.data?.sections.find((section) =>
      section.lessons.some((lesson) => lesson.id === activeLesson?.id)
    ) ?? null;
  const lessonQuizzes =
    assessmentsQuery.data?.quizzes.filter((quiz) => quiz.lessonId === activeLesson?.id) ?? [];
  const lessonAssignments =
    assessmentsQuery.data?.assignments.filter((assignment) => assignment.lessonId === activeLesson?.id) ?? [];
  const sectionQuizzes =
    assessmentsQuery.data?.quizzes.filter(
      (quiz) => quiz.scopeType === "SECTION" && quiz.sectionId === activeSection?.id
    ) ?? [];
  const sectionAssignments =
    assessmentsQuery.data?.assignments.filter(
      (assignment) => assignment.scopeType === "SECTION" && assignment.sectionId === activeSection?.id
    ) ?? [];
  const courseQuizzes =
    assessmentsQuery.data?.quizzes.filter((quiz) => quiz.scopeType === "COURSE") ?? [];
  const courseAssignments =
    assessmentsQuery.data?.assignments.filter(
      (assignment) => assignment.scopeType === "COURSE"
    ) ?? [];
  const isReviewer = isInstructor || isAdminReviewer;
  const visibleLessonQuizzes = isReviewer
    ? lessonQuizzes
    : lessonQuizzes.filter((quiz) => quiz.canAccess || Boolean(quiz.submission));
  const visibleSectionQuizzes = isReviewer
    ? sectionQuizzes
    : sectionQuizzes.filter((quiz) => quiz.canAccess || Boolean(quiz.submission));
  const visibleCourseQuizzes = isReviewer
    ? courseQuizzes
    : courseQuizzes.filter((quiz) => quiz.canAccess || Boolean(quiz.submission));
  const visibleLessonAssignments = isReviewer
    ? lessonAssignments
    : lessonAssignments.filter((assignment) => assignment.canAccess || Boolean(assignment.submission));
  const visibleSectionAssignments = isReviewer
    ? sectionAssignments
    : sectionAssignments.filter((assignment) => assignment.canAccess || Boolean(assignment.submission));
  const visibleCourseAssignments = isReviewer
    ? courseAssignments
    : courseAssignments.filter((assignment) => assignment.canAccess || Boolean(assignment.submission));
  const warningQuiz =
    assessmentsQuery.data?.quizzes.find((quiz) => quiz.id === warningQuizId) ?? null;
  const activeQuiz =
    assessmentsQuery.data?.quizzes.find((quiz) => quiz.id === activeQuizId) ?? null;
  const isQuizPopupClosable = Boolean(activeQuiz?.submission) || isReviewer;

  const handleLaunchInterview = async () => {
    if (!activeInterview) {
      return;
    }

    try {
      await recordInterviewAttendanceMutation.mutateAsync(activeInterview.id);
    } catch {
      // Keep join flow resilient even if attendance tracking fails.
    }

    window.open(activeInterview.meetingUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!trackedInterviewTime) {
      return;
    }

    const diffMs = new Date(trackedInterviewTime).getTime() - countdownNow;
    const refreshRate = diffMs <= 5 * 60 * 1000 ? 1_000 : 30_000;

    const interval = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, refreshRate);

    return () => window.clearInterval(interval);
  }, [trackedInterviewTime, countdownNow]);

  useEffect(() => {
    if (!activeInterviewId) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveInterviewId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeInterviewId, setActiveInterviewId]);

  useEffect(() => {
    if (!activeQuizId || isQuizPopupClosable) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeQuizId, isQuizPopupClosable]);

  useEffect(() => {
    if (!activeQuizId || !isStudent || isQuizPopupClosable) {
      return;
    }

    const abandonAttempt = () => {
      void onAbandonQuizAttempt(activeQuizId);
    };

    const handlePageHide = () => {
      abandonAttempt();
    };

    const handleBeforeUnload = () => {
      abandonAttempt();
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeQuizId, isQuizPopupClosable, isStudent, onAbandonQuizAttempt]);

  const openQuizFlow = (quiz: CourseQuiz) => {
    if (isReviewer) {
      setWarningQuizId(null);
      setActiveQuizId(quiz.id);
      return;
    }

    if (quiz.submission || quiz.attemptStatus === "IN_PROGRESS") {
      setWarningQuizId(null);
      setActiveQuizId(quiz.id);
      return;
    }

    setWarningQuizId(quiz.id);
  };

  const closeQuizPopup = () => {
    if (!isQuizPopupClosable && !isReviewer) {
      return;
    }

    setActiveQuizId(null);
  };

  const renderQuizCard = (quiz: CourseQuiz) =>
    isReviewer ? (
      <div
        key={quiz.id}
        className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-950">{quiz.title}</p>
            {quiz.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{quiz.description}</p>
            ) : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {quiz.scopeLabel}
            </p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-800">
            {isInstructor ? "Instructor access" : "Admin review"}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600 sm:max-w-[70%]">
            {isInstructor
              ? "Open this exam to review its questions, or jump to the editor to manage its content."
              : "Open this exam to inspect its questions, answers, and publishing quality from the admin review flow."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openQuizFlow(quiz)}
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700"
            >
              Open exam
            </button>
            {isInstructor ? (
              <Link
                href={`/instructor/courses/${selectedCourse?.id ?? ""}/builder`}
                className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white"
              >
                Manage in editor
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    ) : (
      <button
        key={quiz.id}
        type="button"
        onClick={() => openQuizFlow(quiz)}
        className="w-full rounded-[24px] border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-slate-950">{quiz.title}</p>
            {quiz.description ? (
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{quiz.description}</p>
            ) : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {quiz.scopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quiz.submission ? (
              <span className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                {quiz.status === "BLANK" ? "Blank recorded" : "Submitted"}
              </span>
            ) : null}
            {!quiz.submission ? (
              <span className="rounded-full bg-amber-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                {quiz.attemptStatus === "IN_PROGRESS" ? "Attempt in progress" : "One entry only"}
              </span>
            ) : null}
          </div>
        </div>
        {quiz.submission ? (
          <p className="mt-4 text-sm font-medium text-emerald-700">
            Result recorded: {quiz.submission.score}/{quiz.submission.totalQuestions}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600 sm:max-w-[70%]">
              {quiz.attemptStatus === "IN_PROGRESS"
                ? "Your exam session is already active. Re-open it now to finish and submit."
                : "Open the exam in a dedicated full-screen window and finish it in one sitting."}
            </p>
            <span className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              {quiz.attemptStatus === "IN_PROGRESS" ? "Resume exam" : "Open exam"}
            </span>
          </div>
        )}
      </button>
    );

  const renderAssignmentCard = (assignment: CourseAssignment) => (
    <div key={assignment.id} className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-slate-950">{assignment.title}</p>
          {assignment.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{assignment.description}</p>
          ) : null}
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {assignment.scopeLabel}
          </p>
        </div>
        {assignment.submission ? (
          <span className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
            {assignment.status === "REVIEWED" ? "Reviewed" : "Submitted"}
          </span>
        ) : null}
      </div>
      {assignment.instructions ? (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {assignment.instructions}
        </p>
      ) : null}
      {isStudent ? (
        <>
          <textarea
            className="mt-4 min-h-32 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Write your assignment response"
            value={assignmentDrafts[assignment.id] ?? assignment.submission?.content ?? ""}
            onChange={(event) => {
              setAssignmentDrafts((current) => ({ ...current, [assignment.id]: event.target.value }));
              setAssignmentFormErrors((current) => ({ ...current, [assignment.id]: "" }));
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PillButton
              onClick={() => void onSubmitAssignment(assignment.id)}
              disabled={submitAssignmentMutation.isPending}
            >
              {assignment.submission
                ? submitAssignmentMutation.isPending
                  ? "Updating..."
                  : "Update assignment"
                : submitAssignmentMutation.isPending
                  ? "Submitting..."
                  : "Submit assignment"}
            </PillButton>
            {assignmentFormErrors[assignment.id] ? (
              <p className="text-sm text-red-600">{assignmentFormErrors[assignment.id]}</p>
            ) : null}
          </div>
          {assignment.submission?.feedback ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Instructor feedback</p>
              <p className="mt-2 leading-6">{assignment.submission.feedback}</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );

  const renderNavigationContent = () => (
    <div className="space-y-4">
      {courseQuery.data?.sections.map((section) => (
        <div key={section.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Section {section.order}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{section.title}</p>
          <div className="mt-3 space-y-2">
            {section.lessons.map((lesson) => {
              const isCurrent = activeLesson?.id === lesson.id;
              const isNext = nextLessonId === lesson.id;
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => void onSelectLesson(lesson.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    isCurrent
                      ? "border-slate-950 bg-slate-950 text-white"
                      : isNext
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : lesson.isCompleted
                          ? "border-slate-200 bg-white text-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lesson.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-70">{lesson.type}</p>
                    </div>
                    <div className="shrink-0 text-[11px] uppercase tracking-[0.2em] opacity-70">
                      {lesson.isCompleted ? "Done" : isNext ? "Next" : lesson.order}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCompletionContent = () =>
    isStudent && completionStatusQuery.data ? (
      <>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatPill label="Lessons" value={`${completionStatusQuery.data.lessons.completed}/${completionStatusQuery.data.lessons.total}`} tone={completionStatusQuery.data.lessons.done ? "success" : "default"} />
          <StatPill label="Quizzes" value={`${completionStatusQuery.data.quizzes.completed}/${completionStatusQuery.data.quizzes.total}`} tone={completionStatusQuery.data.quizzes.done ? "success" : "default"} />
          <StatPill label="Assignments" value={`${completionStatusQuery.data.assignments.completed}/${completionStatusQuery.data.assignments.total}`} tone={completionStatusQuery.data.assignments.done ? "success" : "default"} />
        </div>
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${
          completionStatusQuery.data.status === "CERTIFICATE_READY"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : completionStatusQuery.data.status === "ELIGIBLE"
              ? "border-sky-200 bg-sky-50 text-sky-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          <p className="font-semibold">
            {completionStatusQuery.data.status === "CERTIFICATE_READY"
              ? "Certificate already issued"
              : completionStatusQuery.data.status === "ELIGIBLE"
                ? "Ready to issue"
                : completionStatusQuery.data.lockReason ?? "Course completion still locked"}
          </p>
          <p className="mt-2 leading-6">{completionStatusQuery.data.nextAction}</p>
        </div>
        {completionStatusQuery.data.certificate ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Certificate ready</p>
            <p className="mt-2 text-xs text-emerald-700">#{completionStatusQuery.data.certificate.certificateNumber}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/certificates/${completionStatusQuery.data.certificate.id}`} className="rounded-full border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-800">Open certificate</Link>
              <Link href={`/certificate-verification/${completionStatusQuery.data.certificate.certificateNumber}`} className="rounded-full border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-800">Verify publicly</Link>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <PillButton onClick={() => issueCertificateMutation.mutate()} disabled={!completionStatusQuery.data.isEligible || issueCertificateMutation.isPending}>
              {issueCertificateMutation.isPending ? "Issuing..." : "Issue certificate"}
            </PillButton>
          </div>
        )}
      </>
    ) : null;

  const renderReviewContent = () =>
    isStudent ? (
      <form onSubmit={(event) => void onSubmitReview(event)} className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const previewRating = hoveredReviewRating ?? reviewRating;
              const isFilled = value <= previewRating;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReviewRating(value)}
                  onMouseEnter={() => setHoveredReviewRating(value)}
                  onMouseLeave={() => setHoveredReviewRating(null)}
                  aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                  className="text-3xl leading-none transition hover:scale-105"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className={`h-7 w-7 ${isFilled ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300"}`}
                  >
                    <path
                      d="M12 2.75l2.83 5.73 6.32.92-4.57 4.45 1.08 6.3L12 17.17l-5.66 2.98 1.08-6.3-4.57-4.45 6.32-.92L12 2.75z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="What stood out about this course?"
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3">
          <PillButton type="submit" disabled={submitReviewMutation.isPending}>
            {submitReviewMutation.isPending ? "Saving review..." : myReviewQuery.data ? "Update review" : "Submit review"}
          </PillButton>
          {submitReviewMutation.isSuccess ? <p className="text-sm text-emerald-700">Review saved successfully.</p> : null}
        </div>
      </form>
    ) : null;

  const renderInstructorContent = () =>
    selectedCourse?.instructor ? (
      <>
        <p className="text-sm font-semibold text-slate-900">{selectedCourse?.instructor?.fullName}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/instructors/${selectedCourse?.instructor?.id}` } className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Open instructor profile</Link>
          {isStudent ? (
            <Link
              href={`/messages?target=${selectedCourse?.instructor?.id}` }
              className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
            >
              Message instructor
            </Link>
          ) : null}
        </div>
      </>
    ) : null;

  const renderQuizCollection = (quizzes: CourseQuiz[]) => (
    <div className="space-y-4">
      {quizzes.map(renderQuizCard)}
    </div>
  );

  const renderAssignmentCollection = (assignments: CourseAssignment[]) => (
    <div className="space-y-4">
      {assignments.map(renderAssignmentCard)}
    </div>
  );

  const supportTabs: Array<{
    id: "lesson" | "section" | "course";
    label: string;
  }> = [];

  if (visibleLessonQuizzes.length || visibleLessonAssignments.length) {
    supportTabs.push({
      id: "lesson",
      label: "Lesson",
    });
  }

  if (visibleSectionQuizzes.length || visibleSectionAssignments.length) {
    supportTabs.push({
      id: "section",
      label: "Section",
    });
  }

  if (visibleCourseQuizzes.length || visibleCourseAssignments.length) {
    supportTabs.push({
      id: "course",
      label: "Course",
    });
  }

  const reviewTabContent = renderReviewContent();
  const hasReviewCard = Boolean(reviewTabContent);

  useEffect(() => {
    if (!supportTabs.length) {
      return;
    }

    if (!supportTabs.some((tab) => tab.id === activeSupportTab)) {
      setActiveSupportTab(supportTabs[0].id);
    }
  }, [activeSupportTab, supportTabs]);

  const activeAssessmentScope =
    activeSupportTab === "lesson"
      ? { quizzes: visibleLessonQuizzes, assignments: visibleLessonAssignments }
      : activeSupportTab === "section"
        ? { quizzes: visibleSectionQuizzes, assignments: visibleSectionAssignments }
        : { quizzes: visibleCourseQuizzes, assignments: visibleCourseAssignments };

  useEffect(() => {
    if (activeAssessmentTab === "exams" && !activeAssessmentScope.quizzes.length && activeAssessmentScope.assignments.length) {
      setActiveAssessmentTab("assignments");
      return;
    }

    if (activeAssessmentTab === "assignments" && !activeAssessmentScope.assignments.length && activeAssessmentScope.quizzes.length) {
      setActiveAssessmentTab("exams");
    }
  }, [activeAssessmentScope, activeAssessmentTab]);

  const activeSupportTabContent =
    activeAssessmentTab === "exams"
      ? activeAssessmentScope.quizzes.length
        ? renderQuizCollection(activeAssessmentScope.quizzes)
        : <EmptyState title="No exams in this tab" description="" />
      : activeAssessmentScope.assignments.length
        ? renderAssignmentCollection(activeAssessmentScope.assignments)
        : <EmptyState title="No assignments in this tab" description="" />;
  const courseLoadError =
    (courseQuery.error as Error | null)?.message ?? null;

  if (courseQuery.isLoading || (canAccessLessons && !selectedCourse && !courseLoadError)) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackButton fallbackHref="/courses" />
        <StatusBanner>Loading course review workspace...</StatusBanner>
      </main>
    );
  }

  if (courseLoadError) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackButton fallbackHref="/courses" />
        <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold text-rose-900">This course could not be opened.</p>
          <p className="mt-2">{courseLoadError}</p>
        </div>
      </main>
    );
  }

  if (!selectedCourse) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackButton fallbackHref="/courses" />
        <StatusBanner>Course</StatusBanner>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-5 sm:py-6 lg:p-8">
      <BackButton fallbackHref="/courses" />

      <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm sm:rounded-[32px]">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="h-full min-h-[280px] overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
            {selectedCourse.thumbnailImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedCourse.thumbnailImage} alt={`${selectedCourse.title} thumbnail`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Learning workspace</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{selectedCourse.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{selectedCourse.description}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${selectedCourse.isPaid ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {selectedCourse.isPaid ? `Paid ${selectedCourse.price?.toFixed(2) ?? "0.00"}` : "Free"}
                  </span>
                  {nextInterview ? (
                    <span
                      className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        nextInterview.isJoinReady
                          ? "bg-rose-100 text-rose-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {nextInterview.isJoinReady ? "Meeting live" : "Meeting scheduled"}
                    </span>
                  ) : null}
                </div>
                {isInstructor ? (
                  <Link
                    href={`/instructor/courses/${selectedCourse.id}/builder`}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    Edit course
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              {selectedCourse.category ? <span className="rounded-full bg-slate-100 px-3 py-1">{selectedCourse.category}</span> : null}
              <span className="rounded-full bg-slate-100 px-3 py-1">{selectedCourse.level.toLowerCase()}</span>
              {selectedCourse.instructor ? <span className="rounded-full bg-slate-100 px-3 py-1">Instructor: {selectedCourse?.instructor?.fullName}</span> : null}
            </div>
            {isAdminReviewer ? (
              <div className="mt-6 rounded-[28px] border border-rose-200 bg-rose-50/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">Admin review</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Review, stop, and report this course</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Use this panel to document errors or terms violations. You can submit a review report on its own or stop the course and file the report in one action.
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    selectedCourse.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedCourse.status === "PUBLISHED" ? "Active course" : "Stopped / draft"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <textarea
                    value={adminReviewReport}
                    onChange={(event) => setAdminReviewReport(event.target.value)}
                    placeholder="Write the review report here. Describe the issue, affected area, and any terms or quality violations you found."
                    className="min-h-36 w-full rounded-[24px] border border-rose-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-rose-300"
                  />
                  {reviewCourseMutation.isError ? (
                    <p className="text-sm text-rose-700">
                      {(reviewCourseMutation.error as Error)?.message || "The review action could not be completed."}
                    </p>
                  ) : null}
                  {reviewCourseMutation.isSuccess ? (
                    <p className="text-sm text-emerald-700">
                      Review report saved. The course record has been refreshed with the latest admin action.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        reviewCourseMutation.mutate({
                          report: adminReviewReport.trim(),
                          stopCourse: false
                        })
                      }
                      disabled={reviewCourseMutation.isPending || adminReviewReport.trim().length < 10}
                      className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewCourseMutation.isPending ? "Saving..." : "Submit report"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        reviewCourseMutation.mutate({
                          report: adminReviewReport.trim(),
                          stopCourse: true
                        })
                      }
                      disabled={reviewCourseMutation.isPending || adminReviewReport.trim().length < 10}
                      className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewCourseMutation.isPending ? "Stopping..." : "Stop course and report"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {isStudent && courseProgress ? (
              <div className="mt-6 grid grid-cols-3 gap-3">
                <StatPill label="Progress" value={`${courseProgress.percentage}%`} tone="info" />
                <StatPill label="Lessons" value={`${courseProgress.completedLessons}/${courseProgress.totalLessons}`} tone="default" />
                <StatPill label="Next step" value={nextLessonId ? "Resume lesson" : "Assessments / finish"} tone="success" />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isStudent && !isEnrolled ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedCourse.isPaid ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Join this course</h2>
              
              <button
                type="button"
                onClick={() => enrollMutation.mutate()}
                disabled={enrollMutation.isPending}
                className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {enrollMutation.isPending ? "Enrolling..." : "Enroll now"}
              </button>
              {enrollMutation.isError ? <p className="mt-3 text-sm text-red-600">Enrollment failed. Please try again.</p> : null}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Complete payment to unlock the course</h2>
                  
                </div>
                <StatPill label="Price" value={selectedCourse.price?.toFixed(2) ?? "0.00"} tone="warning" />
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Available payment methods</p>
                  <div className="mt-3 space-y-3">
                    {manualMethods.length ? (
                      manualMethods.map((method) => (
                        <div key={method.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                          <p className="font-semibold text-slate-900">{method.label}</p>
                          <p className="mt-1 text-slate-500">{method.type}</p>
                          <p className="mt-2 text-slate-700">{method.details}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No payment methods yet" description="" />
                    )}
                  </div>
                </div>
                <WorkspacePanel title="Payment proof">
                  <form onSubmit={onSubmitPayment} className="space-y-4">
                    <select
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
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
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Proof file</span>
                      <input type="file" accept="image/*,.pdf,.txt,.zip,application/octet-stream" onChange={(event) => onProofChange(event.target.files?.[0] ?? null)} required className="block w-full text-sm" />
                    </label>
                    {shouldShowProofStatus ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">{proofFileName}</p>
                            <p className="mt-1 text-xs text-slate-600">{proofStatusMessage}</p>
                          </div>
                          {proofUploadState === "failed" ? (
                            <PillButton onClick={() => void onRetryUpload()} disabled={!proofFile || !selectedMethodId || submitPaymentMutation.isPending}>Retry</PillButton>
                          ) : null}
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full transition-all ${progressBarTone}`} style={{ width: `${progressValue}%` }} />
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      disabled={submitPaymentMutation.isPending || !selectedMethodId || !proofFile || manualMethods.length === 0}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {submitPaymentMutation.isPending ? "Submitting..." : "Submit payment proof"}
                    </button>
                    {submitPaymentMutation.isSuccess ? <p className="text-sm text-emerald-700">Payment proof submitted. Wait for instructor approval.</p> : null}
                    {latestPayment ? <p className="text-sm text-slate-600">Latest payment status: <span className="font-semibold">{latestPayment.status}</span></p> : null}
                  </form>
                </WorkspacePanel>
              </div>
            </>
          )}
        </div>
      ) : null}

      {canAccessLessons ? (
        <div className="mt-6">
          {hasLiveSessions ? (
          <div className="mb-6">
            <section className="overflow-hidden rounded-[32px] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_26%),linear-gradient(145deg,#f8fffc_0%,#ecfdf5_45%,#f0fdfa_100%)] shadow-sm">
              <div className="border-b border-emerald-100/80 px-6 py-5 lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Interviews</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                      Keep live course events visible at the top of the workspace so learners can spot the next session quickly and join at the right moment.
                    </p>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {interviewSessions.length} active
                  </div>
                </div>
              </div>

              <div className="p-5 lg:p-6">
                <div className="space-y-3">
                  {interviewSessions.map((session, index) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        if (session.isJoinReady) {
                          setActiveInterviewId(session.id);
                        }
                      }}
                      disabled={!session.isJoinReady}
                      className={`group w-full rounded-[28px] border p-4 text-left shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-95 ${
                        index === 0
                          ? "border-emerald-300 bg-[linear-gradient(145deg,rgba(255,255,255,0.98)_0%,rgba(236,253,245,0.96)_100%)] p-5 shadow-emerald-100 hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100/80"
                          : "border-emerald-100 bg-white/90 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {index === 0 ? (
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                                Next live session
                              </span>
                            ) : null}
                            {index === 0 && session.isJoinReady ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                <span className="relative inline-flex h-2.5 w-2.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                </span>
                                Live now
                              </span>
                            ) : null}
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                              {session.provider === "ZOOM" ? "Zoom" : "Google Meet"}
                            </span>
                            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                              {formatCourseDate(session.scheduledAt)}
                            </span>
                          </div>
                          <p className={`mt-3 font-semibold text-slate-950 transition-colors ${index === 0 ? "text-xl group-hover:text-emerald-900" : "text-lg"}`}>{session.title}</p>
                          {session.description ? (
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{session.description}</p>
                          ) : null}
                          {index === 0 ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[22px] border border-emerald-200 bg-emerald-50 px-3 py-3 transition-colors group-hover:border-emerald-300 group-hover:bg-emerald-100/80">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                                  session.isJoinReady
                                    ? "bg-emerald-600 text-white"
                                    : "bg-white text-emerald-700"
                                }`}
                              >
                                {session.isJoinReady ? "Join now" : "Opens in 5 min"}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">
                                {session.isJoinReady ? "Live now" : `Starts in ${formatInterviewCountdown(session.scheduledAt, countdownNow)}`}
                              </span>
                              <span className="text-sm text-slate-500">
                                {session.isJoinReady
                                  ? "Open the session card to launch the meeting room."
                                  : "The launch window appears only in the final 5 minutes."}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                              session.isJoinReady
                                ? "bg-emerald-100 text-emerald-800"
                                  : "bg-sky-100 text-sky-800"
                              }`}
                          >
                            {session.isJoinReady ? "Join now" : "Locked"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                              session.isJoinReady
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {session.isJoinReady ? "Live now" : `Starts in ${formatInterviewCountdown(session.scheduledAt, countdownNow)}`}
                          </span>
                        </div>
                      </div>
                      {index === 0 ? (
                        <div className="mt-4 flex items-center justify-end text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 transition-transform duration-200 group-hover:translate-x-1">
                          {session.isJoinReady ? "Open live session" : "Available 5 min before"}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
          ) : null}

          <div className="space-y-4 lg:hidden">
            <MobileSection title="Course navigation">{renderNavigationContent()}</MobileSection>
            {activeLesson ? (
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">{activeLesson.type}</span>
                  {activeLesson.isCompleted ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Completed</span> : null}
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{activeLesson.title}</p>
                <p className="mt-2 text-sm text-slate-500">{activeLesson.sectionTitle}</p>
                {(activeLesson.mediaKind === "VIDEO" || activeLesson.mediaKind === "FILE") &&
                activeLesson.hasProtectedMedia ? (
                  <ProtectedLessonMediaViewer
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                    mediaKind={activeLesson.mediaKind}
                    mediaContentType={activeLesson.mediaContentType}
                    mediaFileName={activeLesson.mediaFileName}
                    courseTitle={selectedCourse.title}
                    className="mt-5"
                  />
                ) : null}
                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lesson description</p>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {activeLesson.description ?? activeLesson.content ?? "No lesson description yet."}
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {previousLesson ? <PillButton onClick={() => void onSelectLesson(previousLesson.id)}>Previous</PillButton> : null}
                  {upcomingLesson ? <PillButton onClick={() => void onSelectLesson(upcomingLesson.id)}>Next</PillButton> : null}
                  {isStudent ? <PillButton onClick={() => completeLessonMutation.mutate(activeLesson.id)} disabled={Boolean(activeLesson.isCompleted) || completeLessonMutation.isPending}>{activeLesson.isCompleted ? "Completed" : completeLessonMutation.isPending ? "Saving..." : "Mark complete"}</PillButton> : null}
                </div>
              </div>
            ) : null}

            {supportTabs.length ? (
              <MobileSection title="Assessments & Exams" defaultOpen>
                <div className="flex flex-wrap gap-2">
                  {supportTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveSupportTab(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeSupportTab === tab.id
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {activeAssessmentScope ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setActiveAssessmentTab("exams")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeAssessmentTab === "exams"
                          ? "bg-emerald-100 text-emerald-800"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Exams
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAssessmentTab("assignments")}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        activeAssessmentTab === "assignments"
                          ? "bg-emerald-100 text-emerald-800"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Assignments
                    </button>
                  </div>
                ) : null}
                <div className="mt-4">{activeSupportTabContent}</div>
              </MobileSection>
            ) : null}
            {hasReviewCard ? <MobileSection title="Course review">{reviewTabContent}</MobileSection> : null}
            {renderInstructorContent() ? <MobileSection title="Instructor">{renderInstructorContent()}</MobileSection> : null}
          </div>

          <div className="hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
            <aside className="space-y-5">
              <AccordionWorkspacePanel title="Course navigation" defaultOpen>
                {renderNavigationContent()}
              </AccordionWorkspacePanel>
              {renderCompletionContent() ? <WorkspacePanel title="Completion">{renderCompletionContent()}</WorkspacePanel> : null}
              {hasReviewCard ? <WorkspacePanel title="Course review">{reviewTabContent}</WorkspacePanel> : null}
            </aside>

            <section className="space-y-5">
              {activeLesson ? (
                <WorkspacePanel title={activeLesson.title} description={activeLesson.sectionTitle}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">{activeLesson.type}</span>
                    {activeLesson.isCompleted ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Completed</span> : null}
                    {learningState?.lastLessonId === activeLesson.id ? <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-800">Current</span> : null}
                  </div>
                  {(activeLesson.mediaKind === "VIDEO" || activeLesson.mediaKind === "FILE") && activeLesson.hasProtectedMedia ? (
                    <ProtectedLessonMediaViewer
                      lessonId={activeLesson.id}
                      lessonTitle={activeLesson.title}
                      mediaKind={activeLesson.mediaKind}
                      mediaContentType={activeLesson.mediaContentType}
                      mediaFileName={activeLesson.mediaFileName}
                      courseTitle={selectedCourse.title}
                      className="mt-5"
                    />
                  ) : null}
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Lesson description</p>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                      {activeLesson.description ?? activeLesson.content ?? "No lesson description yet."}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {previousLesson ? <PillButton onClick={() => void onSelectLesson(previousLesson.id)}>Previous lesson</PillButton> : null}
                    {upcomingLesson ? <PillButton onClick={() => void onSelectLesson(upcomingLesson.id)}>Next lesson</PillButton> : null}
                    {isStudent ? <PillButton onClick={() => completeLessonMutation.mutate(activeLesson.id)} disabled={Boolean(activeLesson.isCompleted) || completeLessonMutation.isPending}>{activeLesson.isCompleted ? "Completed" : completeLessonMutation.isPending ? "Saving..." : "Mark complete"}</PillButton> : null}
                  </div>
                </WorkspacePanel>
              ) : (
                <WorkspacePanel title="No lesson selected">
                  <EmptyState title="Nothing to show yet" description="" />
                </WorkspacePanel>
              )}

              {supportTabs.length ? (
                <AccordionWorkspacePanel title="Assessments & Exams" defaultOpen>
                  <div className="flex flex-wrap gap-2">
                    {supportTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSupportTab(tab.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeSupportTab === tab.id
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {activeAssessmentScope ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveAssessmentTab("exams")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeAssessmentTab === "exams"
                            ? "bg-emerald-100 text-emerald-800"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        Exams
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAssessmentTab("assignments")}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          activeAssessmentTab === "assignments"
                            ? "bg-emerald-100 text-emerald-800"
                            : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        Assignments
                      </button>
                    </div>
                  ) : null}
                  <div className="mt-5">{activeSupportTabContent}</div>
                </AccordionWorkspacePanel>
              ) : null}
              {renderInstructorContent() ? <WorkspacePanel title="Instructor">{renderInstructorContent()}</WorkspacePanel> : null}
            </section>
          </div>
        </div>
      ) : null}

      {warningQuiz ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setWarningQuizId(null);
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-[28px] border border-amber-200 bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Exam warning
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              {warningQuiz.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              You are about to open this exam. Once you continue, you must complete it in one
              sitting. Only one entry is permitted, and leaving before you answer may record this
              exam as a blank result.
            </p>

            <div className="mt-6 grid gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
              <p>1. This exam must be completed in full after you open it.</p>
              <p>2. You can enter this exam only once.</p>
              <p>3. If you leave without answering, your score may be recorded as blank.</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setWarningQuizId(null)}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Go back
              </button>
              <button
                type="button"
                onClick={() => void onStartQuizAttempt(warningQuiz.id)}
                disabled={startQuizAttemptMutation.isPending}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {startQuizAttemptMutation.isPending ? "Opening exam..." : "I understand, start exam"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeQuiz ? (
        <div className="fixed inset-0 z-50 bg-slate-950/90">
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/10 bg-slate-950/95 px-4 py-4 sm:px-6">
              <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                    Secure exam
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {activeQuiz.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">{activeQuiz.scopeLabel}</p>
                </div>
                {isQuizPopupClosable ? (
                  <button
                    type="button"
                    onClick={closeQuizPopup}
                    className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                ) : (
                  <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                    Close disabled until submission
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-6">
              <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-4">
                <div className="rounded-[28px] border border-white/10 bg-white p-4 shadow-2xl sm:p-6">
                  {isReviewer ? (
                    <div className="space-y-4">
                      <div className={`rounded-[24px] border p-5 ${isInstructor ? "border-sky-200 bg-sky-50" : "border-rose-200 bg-rose-50"}`}>
                        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isInstructor ? "text-sky-700" : "text-rose-700"}`}>
                          {isInstructor ? "Instructor exam view" : "Admin review view"}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-950">
                          Review exam structure
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {isInstructor
                            ? "This view lets you inspect the exam content from the course page. Use the editor to manage questions, options, and course structure."
                            : "This view lets you inspect the exam content, question quality, and answer key before deciding whether the course should remain active."}
                        </p>
                        {isInstructor ? (
                          <div className="mt-4">
                            <Link
                              href={`/instructor/courses/${selectedCourse.id}/builder`}
                              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                            >
                              Open course editor
                            </Link>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        {activeQuiz.questions.map((question) => (
                          <div key={question.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {question.order}. {question.question}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {question.options.map((option) => (
                                <div
                                  key={option}
                                  className={`rounded-2xl border px-3 py-3 text-sm ${
                                    question.correctAnswer === option
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                      : "border-slate-200 bg-white text-slate-700"
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : activeQuiz.submission ? (
                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
                          Exam result
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-950">
                          {activeQuiz.status === "BLANK"
                            ? "Blank result recorded"
                            : `Score ${activeQuiz.submission.score}/${activeQuiz.submission.totalQuestions}`}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {activeQuiz.status === "BLANK"
                            ? "This exam was consumed without a completed submission, so it has been recorded as blank."
                            : "Your exam has been submitted successfully. You can now review your answers and close this window."}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {activeQuiz.questions.map((question, index) => (
                          <div key={question.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {question.order}. {question.question}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {question.options.map((option) => {
                                const selectedAnswer =
                                  (activeQuiz.submission?.answers ?? [])[index] === option;
                                return (
                                  <div
                                    key={option}
                                    className={`rounded-2xl border px-3 py-3 text-sm ${
                                      selectedAnswer
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                        : "border-slate-200 bg-white text-slate-600"
                                    }`}
                                  >
                                    {option}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        This exam is now active. Stay in this window until you finish and submit all
                        answers.
                      </div>
                      {activeQuiz.questions.map((question, index) => (
                        <div key={question.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-base font-semibold text-slate-950">
                            {question.order}. {question.question}
                          </p>
                          <div className="mt-4 grid gap-2">
                            {question.options.map((option) => (
                              <label
                                key={option}
                                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                              >
                                <input
                                  type="radio"
                                  name={`${activeQuiz.id}-${question.id}`}
                                  value={option}
                                  checked={(quizAnswers[activeQuiz.id] ?? [])[index] === option}
                                  onChange={(event) =>
                                    setQuizAnswer(activeQuiz.id, index, event.target.value)
                                  }
                                  className="mt-1"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="sticky bottom-0 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">One attempt only</p>
                          <p className="mt-1 text-sm text-slate-600">
                            Submit all answers now. Leaving this exam can record a blank result.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {quizFormErrors[activeQuiz.id] ? (
                            <p className="text-sm text-red-600">{quizFormErrors[activeQuiz.id]}</p>
                          ) : null}
                          <PillButton
                            onClick={() => void onSubmitQuiz(activeQuiz.id, activeQuiz.questions.length)}
                            disabled={submitQuizMutation.isPending}
                          >
                            {submitQuizMutation.isPending ? "Submitting..." : "Submit exam"}
                          </PillButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeInterviewId && activeInterview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-2 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveInterviewId(null);
            }
          }}
        >
          <div className="my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-emerald-200 bg-white shadow-2xl sm:rounded-[24px]">
            <div className="flex flex-col gap-4 border-b border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),linear-gradient(145deg,#f8fffc_0%,#ecfdf5_52%,#f0fdfa_100%)] px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Live session launch</p>
                <h2 className="mt-2 break-words text-lg font-semibold text-slate-950 sm:text-xl">{activeInterview.title}</h2>
                <p className="mt-2 break-words text-sm text-slate-600">
                  {activeInterview.provider === "ZOOM" ? "Zoom" : "Google Meet"} - {formatCourseDate(activeInterview.scheduledAt)}
                </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInterviewId(null)}
                  className="shrink-0 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    activeInterview.isJoinReady
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {activeInterview.isJoinReady ? "Join now" : activeInterview.status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    activeInterview.isJoinReady
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {activeInterview.isJoinReady ? "Live now" : `Starts in ${formatInterviewCountdown(activeInterview.scheduledAt, countdownNow)}`}
                </span>
              </div>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-3">
                <div className="rounded-[18px] border border-emerald-200 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_34%),linear-gradient(160deg,#052e2b_0%,#0f3d36_45%,#115e59_100%)] p-4 text-white sm:rounded-[20px] sm:p-5">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-50">
                        {activeInterview.provider === "ZOOM" ? "Zoom" : "Google Meet"}
                      </span>
                      <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-50">
                        {activeInterview.isJoinReady ? "Live now" : "Scheduled"}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold tracking-tight sm:text-[1.45rem]">
                        {activeInterview.provider === "ZOOM" ? "Zoom" : "Google Meet"} meeting
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        Join from this launch window, then the provider opens in its own secure tab or app.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] border border-white/10 bg-white/10 p-3 sm:rounded-[18px] sm:p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Starts</p>
                        <p className="mt-2 break-words text-sm font-semibold sm:text-base">{formatCourseDate(activeInterview.scheduledAt)}</p>
                      </div>
                      <div className="rounded-[16px] border border-white/10 bg-white/10 p-3 sm:rounded-[18px] sm:p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Countdown</p>
                        <p className="mt-2 text-sm font-semibold sm:text-base">
                          {activeInterview.isJoinReady ? "Live now" : formatInterviewCountdown(activeInterview.scheduledAt, countdownNow)}
                        </p>
                      </div>
                      <div className="rounded-[16px] border border-white/10 bg-white/10 p-3 sm:rounded-[18px] sm:p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Course</p>
                        <p className="mt-2 break-words text-sm font-semibold sm:text-base">{activeInterview.course.title}</p>
                      </div>
                      <div className="rounded-[16px] border border-white/10 bg-white/10 p-3 sm:rounded-[18px] sm:p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Instructor</p>
                        <p className="mt-2 break-words text-sm font-semibold sm:text-base">{activeInterview.course.instructor.fullName}</p>
                      </div>
                    </div>

                    {activeInterview.description ? (
                      <div className="rounded-[16px] border border-white/10 bg-white/10 p-3 sm:rounded-[18px] sm:p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Notes</p>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {activeInterview.description.length > 140
                            ? `${activeInterview.description.slice(0, 140)}...`
                            : activeInterview.description}
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void handleLaunchInterview()}
                        disabled={recordInterviewAttendanceMutation.isPending || !activeInterview.isJoinReady}
                        className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                          activeInterview.isJoinReady
                            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            : "bg-white/80 text-slate-700"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        {recordInterviewAttendanceMutation.isPending
                          ? "Opening..."
                          : activeInterview.isJoinReady
                            ? `Join now in ${activeInterview.provider === "ZOOM" ? "Zoom" : "Google Meet"}`
                            : "Available at start time"}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(activeInterview.meetingUrl)}
                        className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
                      >
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-emerald-100 bg-emerald-50/70 p-3 sm:rounded-[18px] sm:p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Status</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">
                      {activeInterview.isJoinReady ? "Ready to join" : "Waiting to start"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {activeInterview.isJoinReady
                        ? "Open the meeting now. Attendance is recorded before the provider launches."
                        : `Starts in ${formatInterviewCountdown(activeInterview.scheduledAt, countdownNow)}.`}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-slate-200 bg-white p-3 sm:rounded-[18px] sm:p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance</p>
                    <div className="mt-3 grid gap-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Students recorded</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{activeInterview.attendanceCount ?? 0}</p>
                      </div>
                      {isStudent ? (
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Your attended meetings</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{activeInterview.studentAttendedCount ?? 0}</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Meetings you created</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950">{activeInterview.instructorCreatedCount ?? 0}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

















