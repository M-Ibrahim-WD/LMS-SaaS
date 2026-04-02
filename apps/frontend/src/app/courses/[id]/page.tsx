"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BackButton } from "../../../components/back-button";
import { VideoPlayer } from "../../../components/video-player";
import {
  EmptyState,
  PillButton,
  StatPill,
  WorkspacePanel,
  WorkspaceShell
} from "../../../components/course-workspace";
import { StatusBanner } from "../../../components/status-banner";

import { formatCourseDate } from "./_components/course-details-types";
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

export default function CourseDetailsPage() {
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  const {
    activeLesson,
    activeInterviewId,
    activeInterviewQuery,
    assignmentDrafts,
    assignmentFormErrors,
    assessmentsQuery,
    canAccessLessons,
    completeLessonMutation,
    completionStatusQuery,
    courseProgress,
    courseQuery,
    enrollMutation,
    isEnrolled,
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
    selectedCourse,
    selectedMethodId,
    setActiveInterviewId,
    setAssignmentDrafts,
    setAssignmentFormErrors,
    setQuizAnswer,
    setReviewComment,
    setReviewRating,
    setSelectedMethodId,
    shouldShowProofStatus,
    submitAssignmentMutation,
    submitPaymentMutation,
    submitQuizMutation,
    submitReviewMutation,
    upcomingLesson
  } = useCourseDetailsWorkspace();

  const interviewSessions = interviewSessionsQuery.data ?? [];
  const nextInterview = interviewSessions[0] ?? null;
  const hasLiveSessions = interviewSessions.length > 0;
  const activeInterview = activeInterviewQuery.data;
  const trackedInterviewTime = activeInterview?.scheduledAt ?? nextInterview?.scheduledAt ?? null;

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

  if (!selectedCourse) {
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackButton fallbackHref="/courses" />
        <StatusBanner>Loading course...</StatusBanner>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1700px] p-6 lg:p-8">
      <BackButton fallbackHref="/courses" />

      <div className="mt-4 rounded-[32px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="h-full min-h-[280px] overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
            {selectedCourse.thumbnailImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedCourse.thumbnailImage} alt={`${selectedCourse.title} thumbnail`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Learning workspace</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{selectedCourse.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{selectedCourse.description}</p>
              </div>
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
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
              {selectedCourse.category ? <span className="rounded-full bg-slate-100 px-3 py-1">{selectedCourse.category}</span> : null}
              <span className="rounded-full bg-slate-100 px-3 py-1">{selectedCourse.level.toLowerCase()}</span>
              {selectedCourse.instructor ? <span className="rounded-full bg-slate-100 px-3 py-1">Instructor: {selectedCourse.instructor.fullName}</span> : null}
            </div>
            {isStudent && courseProgress ? (
              <div className="mt-6 grid gap-3 md:grid-cols-3">
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
              <p className="mt-2 text-sm text-slate-600">This is a free course, so you can enroll and begin learning immediately.</p>
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
                  <p className="mt-2 text-sm text-slate-600">Choose a manual payment method, upload proof, and wait for approval.</p>
                </div>
                <StatPill label="Price" value={selectedCourse.price?.toFixed(2) ?? "0.00"} tone="warning" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                      <EmptyState title="No payment methods yet" description="The instructor still needs to configure at least one manual payment method." />
                    )}
                  </div>
                </div>
                <WorkspacePanel title="Payment proof" description="Upload a screenshot or file showing the completed payment.">
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-700">Live sessions</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Upcoming course interviews</h2>
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
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">Open the launch screen to view details and join the live session safely.</p>
                          )}
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

          <WorkspaceShell
            sidebar={
              <WorkspacePanel title="Course navigation" description="Move through the course like a real learning workspace.">
                <div className="space-y-4">
                  {courseQuery.data?.sections.map((section) => (
                    <div key={section.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
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
                                <div>
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-70">{lesson.type}</p>
                                </div>
                                <div className="text-right text-[11px] uppercase tracking-[0.2em] opacity-70">
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
              </WorkspacePanel>
            }
            main={
              <>
                {isStudent && courseProgress ? (
                  <WorkspacePanel title="Progress header" description="See exactly what�s done, what�s next, and how close you are to the certificate.">
                    <div className="grid gap-3 md:grid-cols-4">
                      <StatPill label="Progress" value={`${courseProgress.percentage}%`} tone="info" />
                      <StatPill label="Lessons" value={`${courseProgress.completedLessons}/${courseProgress.totalLessons}`} tone="default" />
                      <StatPill label="Current" value={activeLesson?.title ?? "No lesson selected"} tone="warning" />
                      <StatPill label="Next" value={upcomingLesson?.title ?? "Assessments / finish"} tone="success" />
                    </div>
                    {nextLessonId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <PillButton onClick={() => void onSelectLesson(nextLessonId)}>Continue learning</PillButton>
                      </div>
                    ) : null}
                  </WorkspacePanel>
                ) : null}

                {activeLesson ? (
                  <WorkspacePanel title={activeLesson.title} description={`Section: ${activeLesson.sectionTitle}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">{activeLesson.type}</span>
                      {activeLesson.isCompleted ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Completed</span> : null}
                      {learningState?.lastLessonId === activeLesson.id ? <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-800">Current</span> : null}
                    </div>
                    <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                      {activeLesson.type === "VIDEO" ? (
                        <VideoPlayer title={activeLesson.title} url={activeLesson.content} />
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeLesson.content}</div>
                      )}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {previousLesson ? <PillButton onClick={() => void onSelectLesson(previousLesson.id)}>Previous lesson</PillButton> : null}
                      {upcomingLesson ? <PillButton onClick={() => void onSelectLesson(upcomingLesson.id)}>Next lesson</PillButton> : null}
                      {isStudent ? <PillButton onClick={() => completeLessonMutation.mutate(activeLesson.id)} disabled={Boolean(activeLesson.isCompleted) || completeLessonMutation.isPending}>{activeLesson.isCompleted ? "Completed" : completeLessonMutation.isPending ? "Saving..." : "Mark complete"}</PillButton> : null}
                    </div>
                  </WorkspacePanel>
                ) : (
                  <WorkspacePanel title="No lesson selected" description="Choose a lesson from the navigation to start learning.">
                    <EmptyState title="Nothing to show yet" description="Once the course has lessons, the active lesson will appear here with progress actions." />
                  </WorkspacePanel>
                )}

                <WorkspacePanel title="Quizzes" description="Assess understanding with structured submissions and visible result states.">
                  <div className="space-y-4">
                    {assessmentsQuery.data?.quizzes.length ? (
                      assessmentsQuery.data.quizzes.map((quiz) => (
                        <div key={quiz.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-slate-950">{quiz.title}</p>
                              {quiz.description ? <p className="mt-2 text-sm text-slate-600">{quiz.description}</p> : null}
                            </div>
                            {quiz.submission ? <span className="rounded-full bg-emerald-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">Submitted</span> : null}
                          </div>
                          <div className="mt-4 space-y-3">
                            {quiz.questions.map((question, index) => (
                              <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-sm font-semibold text-slate-900">{question.order}. {question.question}</p>
                                <div className="mt-3 space-y-2">
                                  {question.options.map((option) => (
                                    <label key={option} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
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
                            <p className="mt-4 text-sm font-medium text-emerald-700">Submitted. Score: {quiz.submission.score}/{quiz.submission.totalQuestions}</p>
                          ) : isStudent ? (
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <PillButton onClick={() => void onSubmitQuiz(quiz.id, quiz.questions.length)} disabled={submitQuizMutation.isPending}>{submitQuizMutation.isPending ? "Submitting..." : "Submit quiz"}</PillButton>
                              {quizFormErrors[quiz.id] ? <p className="text-sm text-red-600">{quizFormErrors[quiz.id]}</p> : null}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No quizzes yet" description="When the instructor adds quizzes, they�ll appear here in the course flow." />
                    )}
                  </div>
                </WorkspacePanel>

                <WorkspacePanel title="Assignments" description="Submit work, check review state, and see feedback without losing context.">
                  <div className="space-y-4">
                    {assessmentsQuery.data?.assignments.length ? (
                      assessmentsQuery.data.assignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-lg font-semibold text-slate-950">{assignment.title}</p>
                          {assignment.description ? <p className="mt-2 text-sm text-slate-600">{assignment.description}</p> : null}
                          {assignment.instructions ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{assignment.instructions}</p> : null}
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
                                <PillButton onClick={() => void onSubmitAssignment(assignment.id)} disabled={submitAssignmentMutation.isPending}>
                                  {assignment.submission ? submitAssignmentMutation.isPending ? "Updating..." : "Update submission" : submitAssignmentMutation.isPending ? "Submitting..." : "Submit assignment"}
                                </PillButton>
                                {assignmentFormErrors[assignment.id] ? <p className="text-sm text-red-600">{assignmentFormErrors[assignment.id]}</p> : null}
                              </div>
                              {assignment.submission ? (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${assignment.submission.status === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                      {assignment.submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}
                                    </span>
                                    <span className="text-xs text-slate-500">Updated {formatCourseDate(assignment.submission.updatedAt)}</span>
                                  </div>
                                  {assignment.submission.score !== null && assignment.submission.score !== undefined ? <p className="mt-3 text-slate-700">Score: {assignment.submission.score}</p> : null}
                                  {assignment.submission.feedback ? <p className="mt-2 text-slate-700">Feedback: {assignment.submission.feedback}</p> : null}
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No assignments yet" description="Assignments will appear here as soon as the instructor adds them to the course." />
                    )}
                  </div>
                </WorkspacePanel>
              </>
            }
            utility={
              <>
                {isStudent && completionStatusQuery.data ? (
                  <WorkspacePanel title="Completion status" description="Track what�s done and unlock the certificate at the right time.">
                    <div className="grid gap-3">
                      <StatPill label="Lessons" value={`${completionStatusQuery.data.lessons.completed}/${completionStatusQuery.data.lessons.total}`} tone={completionStatusQuery.data.lessons.done ? "success" : "default"} />
                      <StatPill label="Quizzes" value={`${completionStatusQuery.data.quizzes.completed}/${completionStatusQuery.data.quizzes.total}`} tone={completionStatusQuery.data.quizzes.done ? "success" : "default"} />
                      <StatPill label="Assignments" value={`${completionStatusQuery.data.assignments.completed}/${completionStatusQuery.data.assignments.total}`} tone={completionStatusQuery.data.assignments.done ? "success" : "default"} />
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
                        {!completionStatusQuery.data.isEligible ? <p className="mt-2 text-xs text-slate-500">Complete lessons, quizzes, and assignments first.</p> : null}
                      </div>
                    )}
                  </WorkspacePanel>
                ) : null}

                {isStudent ? (
                  <WorkspacePanel title="Course review" description="Leave a rating and comment after working through the course.">
                    <form onSubmit={(event) => void onSubmitReview(event)} className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rating</p>
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
                              {"?".repeat(value)}
                            </button>
                          ))}
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
                  </WorkspacePanel>
                ) : null}

                {selectedCourse.instructor ? (
                  <WorkspacePanel title="Instructor" description="Visit the instructor�s public profile and course storefront.">
                    <p className="text-sm font-semibold text-slate-900">{selectedCourse.instructor.fullName}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/instructors/${selectedCourse.instructor.id}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Open instructor profile</Link>
                      {isStudent ? (
                        <Link
                          href={`/messages?target=${selectedCourse.instructor.id}`}
                          className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700"
                        >
                          Message instructor
                        </Link>
                      ) : null}
                    </div>
                  </WorkspacePanel>
                ) : null}
              </>
            }
          />
        </div>
      ) : null}

      {activeInterviewId && activeInterview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/60 p-3 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setActiveInterviewId(null);
            }
          }}
        >
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-emerald-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),linear-gradient(145deg,#f8fffc_0%,#ecfdf5_52%,#f0fdfa_100%)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Live session launch</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{activeInterview.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {activeInterview.provider === "ZOOM" ? "Zoom" : "Google Meet"} - {formatCourseDate(activeInterview.scheduledAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
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
              <button
                type="button"
                onClick={() => setActiveInterviewId(null)}
                className="rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Close
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className="rounded-[22px] border border-emerald-200 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.22),transparent_34%),linear-gradient(160deg,#052e2b_0%,#0f3d36_45%,#115e59_100%)] p-4 text-white sm:p-5">
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
                      <div className="rounded-[18px] border border-white/10 bg-white/10 p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Starts</p>
                        <p className="mt-2 text-sm font-semibold sm:text-base">{formatCourseDate(activeInterview.scheduledAt)}</p>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-white/10 p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Countdown</p>
                        <p className="mt-2 text-sm font-semibold sm:text-base">
                          {activeInterview.isJoinReady ? "Live now" : formatInterviewCountdown(activeInterview.scheduledAt, countdownNow)}
                        </p>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-white/10 p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Course</p>
                        <p className="mt-2 text-sm font-semibold sm:text-base">{activeInterview.course.title}</p>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-white/10 p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Instructor</p>
                        <p className="mt-2 text-sm font-semibold sm:text-base">{activeInterview.course.instructor.fullName}</p>
                      </div>
                    </div>

                    {activeInterview.description ? (
                      <div className="rounded-[18px] border border-white/10 bg-white/10 p-3.5">
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Notes</p>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          {activeInterview.description.length > 140
                            ? `${activeInterview.description.slice(0, 140)}...`
                            : activeInterview.description}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleLaunchInterview()}
                        disabled={recordInterviewAttendanceMutation.isPending || !activeInterview.isJoinReady}
                        className={`inline-flex rounded-full px-5 py-3 text-sm font-semibold transition ${
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
                        className="inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
                      >
                        Copy link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid content-start gap-3">
                  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 p-3.5">
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
                  <div className="rounded-[18px] border border-slate-200 bg-white p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Attendance</p>
                    <div className="mt-3 space-y-2.5">
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
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Meetings you completed</p>
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





