"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { EmptyState, PillButton, WorkspacePanel } from "../../../../../../components/course-workspace";

import type {
  AssignmentSubmissionGroup,
  CourseAssessments,
  EditorMode,
  LearnerSummary,
  UtilityTab
} from "./course-builder-types";
import { formatBuilderDate } from "./course-builder-types";

interface CourseBuilderUtilityRailProps {
  utilityTab: UtilityTab;
  setUtilityTab: (tab: UtilityTab) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  assessments: CourseAssessments | undefined;
  learners: LearnerSummary[] | undefined;
  assignmentSubmissions: AssignmentSubmissionGroup[] | undefined;
  reviewState: Record<string, { feedback: string; score: string }>;
  setReviewState: Dispatch<
    SetStateAction<Record<string, { feedback: string; score: string }>>
  >;
  submitReview: (assignmentId: string, submissionId: string) => Promise<void>;
}

export function CourseBuilderUtilityRail({
  utilityTab,
  setUtilityTab,
  editorMode,
  setEditorMode,
  assessments,
  learners,
  assignmentSubmissions,
  reviewState,
  setReviewState,
  submitReview
}: CourseBuilderUtilityRailProps) {
  const utilityContent =
    utilityTab === "assessments" ? (
      <WorkspacePanel
        title="Assessment rail"
        description="Create, review, and jump straight into quizzes or assignments."
        actions={
          <>
            <PillButton onClick={() => setEditorMode({ kind: "new-quiz" })}>New quiz</PillButton>
            <PillButton onClick={() => setEditorMode({ kind: "new-assignment" })}>New assignment</PillButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Quizzes</p>
            <div className="mt-3 space-y-2">
              {assessments?.quizzes.length ? (
                assessments.quizzes.map((quiz) => (
                  <button
                    key={quiz.id}
                    type="button"
                    onClick={() => setEditorMode({ kind: "quiz", quizId: quiz.id })}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      editorMode.kind === "quiz" && editorMode.quizId === quiz.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold">{quiz.title}</p>
                    <p className="mt-1 text-xs opacity-80">{quiz.scopeLabel}</p>
                    <p className="mt-1 text-xs opacity-70">{quiz.questions.length} questions</p>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No quizzes yet"
                  description="Add the first quiz and keep assessments close to the learning flow."
                  action={<PillButton onClick={() => setEditorMode({ kind: "new-quiz" })}>Create quiz</PillButton>}
                />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Assignments</p>
            <div className="mt-3 space-y-2">
              {assessments?.assignments.length ? (
                assessments.assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setEditorMode({ kind: "assignment", assignmentId: assignment.id })}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      editorMode.kind === "assignment" && editorMode.assignmentId === assignment.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold">{assignment.title}</p>
                    <p className="mt-1 text-xs opacity-80">{assignment.scopeLabel}</p>
                    <p className="mt-1 text-xs opacity-70">Assignment brief + submission flow</p>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No assignments yet"
                  description="Add a written deliverable and review submissions from the same workspace."
                  action={
                    <PillButton onClick={() => setEditorMode({ kind: "new-assignment" })}>
                      Create assignment
                    </PillButton>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </WorkspacePanel>
    ) : utilityTab === "learners" ? (
      <WorkspacePanel title="Learners" description="Track progress, certificate status, and learning continuity.">
        <div className="space-y-3">
          {learners?.length ? (
            learners.map((learner) => (
              <div key={learner.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{learner.learner.fullName}</p>
                    <p className="text-xs text-slate-500">{learner.learner.email}</p>
                  </div>
                  {learner.certificate ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800">
                      Certified
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-sky-600" style={{ width: `${learner.progress.percentage}%` }} />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p>Lessons: {learner.progress.completedLessons}/{learner.progress.totalLessons}</p>
                  <p>Quizzes: {learner.assessments.quizzesCompleted}/{learner.assessments.quizzesTotal}</p>
                  <p>Assignments: {learner.assessments.assignmentsSubmitted}/{learner.assessments.assignmentsTotal}</p>
                  <p>Last activity: {learner.learningState ? formatBuilderDate(learner.learningState.updatedAt) : "Not tracked yet"}</p>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/messages?target=${learner.learner.id}`}
                    className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
                  >
                    Message learner
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No learners yet" description="Once students enroll, their progress and assessment activity will appear here." />
          )}
        </div>
      </WorkspacePanel>
    ) : (
      <WorkspacePanel title="Assignment submissions" description="Review submissions without leaving the builder.">
        <div className="space-y-4">
          {assignmentSubmissions?.length ? (
            assignmentSubmissions.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{assignment.scopeLabel}</p>
                <div className="mt-3 space-y-3">
                  {assignment.submissions.length ? (
                    assignment.submissions.map((submission) => {
                      const draft = reviewState[submission.id] ?? {
                        feedback: submission.feedback ?? "",
                        score: submission.score?.toString() ?? ""
                      };

                      return (
                        <div key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{submission.student.fullName}</p>
                              <p className="text-xs text-slate-500">{submission.student.email}</p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                                submission.status === "REVIEWED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {submission.status === "REVIEWED" ? "Reviewed" : "Pending"}
                            </span>
                          </div>
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            {submission.content}
                          </div>
                          <div className="mt-3 grid gap-3">
                            <textarea
                              className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Feedback for the learner"
                              value={draft.feedback}
                              onChange={(event) =>
                                setReviewState((current) => ({
                                  ...current,
                                  [submission.id]: {
                                    ...draft,
                                    feedback: event.target.value
                                  }
                                }))
                              }
                            />
                            <input
                              className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                              placeholder="Score"
                              value={draft.score}
                              onChange={(event) =>
                                setReviewState((current) => ({
                                  ...current,
                                  [submission.id]: {
                                    ...draft,
                                    score: event.target.value
                                  }
                                }))
                              }
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">
                              Submitted {formatBuilderDate(submission.updatedAt)}
                            </p>
                            <PillButton onClick={() => void submitReview(assignment.id, submission.id)}>
                              {submission.status === "REVIEWED" ? "Update review" : "Review submission"}
                            </PillButton>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No submissions yet.</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Nothing to review yet" description="New assignment submissions will land here for scoring and feedback." />
          )}
        </div>
      </WorkspacePanel>
    );

  return (
    <>
      <WorkspacePanel title="Workspace tools" description="Switch the right rail depending on what you need to manage right now.">
        <div className="flex flex-wrap gap-2">
          <PillButton active={utilityTab === "assessments"} onClick={() => setUtilityTab("assessments")}>
            Assessments
          </PillButton>
          <PillButton active={utilityTab === "learners"} onClick={() => setUtilityTab("learners")}>
            Learners
          </PillButton>
          <PillButton active={utilityTab === "submissions"} onClick={() => setUtilityTab("submissions")}>
            Submissions
          </PillButton>
        </div>
      </WorkspacePanel>
      {utilityContent}
    </>
  );
}
