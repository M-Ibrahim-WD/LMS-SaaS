"use client";

import Link from "next/link";

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

function formatInterviewCountdown(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes <= -5) {
    return "Live now";
  }
  if (diffMinutes <= 15) {
    return "Join now";
  }
  if (diffMinutes < 60) {
    return `In ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `In ${diffDays}d`;
}

function providerLaunchLabel(provider: "ZOOM" | "GOOGLE_MEET") {
  return provider === "ZOOM" ? "Open in Zoom" : "Open in Google Meet";
}

export default function CourseDetailsPage() {
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
              <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${selectedCourse.isPaid ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {selectedCourse.isPaid ? `Paid ${selectedCourse.price?.toFixed(2) ?? "0.00"}` : "Free"}
              </span>
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
          <div className="mb-6">
            <WorkspacePanel
              title="Interview sessions"
              description="Open scheduled Zoom or Google Meet sessions from a large platform launch screen."
            >
              <div className="space-y-3">
                {(interviewSessionsQuery.data ?? []).length ? (
                  (interviewSessionsQuery.data ?? []).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setActiveInterviewId(session.id)}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">{session.title}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {session.provider === "ZOOM" ? "Zoom" : "Google Meet"} • {formatCourseDate(session.scheduledAt)}
                          </p>
                          {session.description ? (
                            <p className="mt-2 text-sm leading-6 text-slate-600">{session.description}</p>
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
                            {session.isJoinReady ? "Join now" : session.status}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                              session.isJoinReady
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {formatInterviewCountdown(session.scheduledAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState
                    title="No sessions yet"
                    description="Scheduled course interviews will appear here as soon as the instructor publishes one."
                  />
                )}
              </div>
            </WorkspacePanel>
          </div>

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
                  <WorkspacePanel title="Progress header" description="See exactly what’s done, what’s next, and how close you are to the certificate.">
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
                      <EmptyState title="No quizzes yet" description="When the instructor adds quizzes, they’ll appear here in the course flow." />
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
                  <WorkspacePanel title="Completion status" description="Track what’s done and unlock the certificate at the right time.">
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
                  <WorkspacePanel title="Instructor" description="Visit the instructor’s public profile and course storefront.">
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

      {activeInterviewId && activeInterviewQuery.data ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Interview session</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{activeInterviewQuery.data.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {activeInterviewQuery.data.provider === "ZOOM" ? "Zoom" : "Google Meet"} • {formatCourseDate(activeInterviewQuery.data.scheduledAt)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      activeInterviewQuery.data.isJoinReady
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {activeInterviewQuery.data.isJoinReady ? "Join now" : activeInterviewQuery.data.status}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      activeInterviewQuery.data.isJoinReady
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {formatInterviewCountdown(activeInterviewQuery.data.scheduledAt)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveInterviewId(null)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Session details</p>
                  <p className="mt-3 text-sm text-slate-600">
                    Instructor: {activeInterviewQuery.data.course.instructor.fullName}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Status: {activeInterviewQuery.data.status}
                  </p>
                  {activeInterviewQuery.data.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {activeInterviewQuery.data.description}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">How joining works</p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Zoom and Google Meet open outside the LMS in a new tab or app. This launch screen keeps the interview details here, then sends you safely to the provider.
                  </p>
                </div>
                <a
                  href={activeInterviewQuery.data.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white ${
                    activeInterviewQuery.data.isJoinReady ? "bg-emerald-600 shadow-lg shadow-emerald-200" : "bg-slate-950"
                  }`}
                >
                  {activeInterviewQuery.data.isJoinReady
                    ? `Join now in ${activeInterviewQuery.data.provider === "ZOOM" ? "Zoom" : "Google Meet"}`
                    : providerLaunchLabel(activeInterviewQuery.data.provider)}
                </a>
                </div>
                <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_34%),linear-gradient(160deg,#0f172a_0%,#111827_45%,#1f2937_100%)] p-6 text-white lg:p-8">
                <div className="flex h-full min-h-[420px] flex-col justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                      Platform interview launch
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight lg:text-3xl">
                      {activeInterviewQuery.data.provider === "ZOOM" ? "Zoom" : "Google Meet"} will open outside the LMS
                    </h3>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75">
                      The LMS keeps the interview organized here, but the actual video room opens in the provider's own secure window. That avoids browser blocking and gives you the most reliable join flow.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Provider</p>
                      <p className="mt-2 text-lg font-semibold">
                        {activeInterviewQuery.data.provider === "ZOOM" ? "Zoom" : "Google Meet"}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Schedule</p>
                      <p className="mt-2 text-lg font-semibold">{formatCourseDate(activeInterviewQuery.data.scheduledAt)}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Course</p>
                      <p className="mt-2 text-lg font-semibold">{activeInterviewQuery.data.course.title}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Next step</p>
                      <p className="mt-2 text-lg font-semibold">
                        {activeInterviewQuery.data.isJoinReady ? "Open the room now" : "Keep this window open until you're ready"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <a
                      href={activeInterviewQuery.data.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold ${
                        activeInterviewQuery.data.isJoinReady
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-white text-slate-950"
                      }`}
                    >
                      {activeInterviewQuery.data.isJoinReady
                        ? `Join now in ${activeInterviewQuery.data.provider === "ZOOM" ? "Zoom" : "Google Meet"}`
                        : providerLaunchLabel(activeInterviewQuery.data.provider)}
                    </a>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(activeInterviewQuery.data.meetingUrl)}
                      className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
                    >
                      Copy meeting link
                    </button>
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




