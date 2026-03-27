"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api/client";
import { BackButton } from "../../../../../components/back-button";
import { useRequireAuth } from "../../../../../hooks/use-require-auth";

interface Lesson {
  id: string;
  title: string;
  content: string;
  type: "VIDEO" | "TEXT" | "FILE";
  order: number;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  status: "DRAFT" | "PUBLISHED";
  sections: Section[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  questions: QuizQuestion[];
}

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
}

interface CourseAssessments {
  quizzes: Quiz[];
  assignments: Assignment[];
}

interface LearnerSummary {
  id: string;
  enrolledAt: string;
  learner: {
    id: string;
    fullName: string;
    email: string;
    createdAt: string;
  };
  progress: {
    totalLessons: number;
    completedLessons: number;
    percentage: number;
    isComplete: boolean;
  };
  assessments: {
    quizzesCompleted: number;
    quizzesTotal: number;
    assignmentsSubmitted: number;
    assignmentsTotal: number;
  };
  certificate: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
  } | null;
  learningState: {
    lastLessonId: string | null;
    updatedAt: string;
  } | null;
}

interface AssignmentSubmissionGroup {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  submissions: Array<{
    id: string;
    content: string;
    status: "PENDING_REVIEW" | "REVIEWED";
    feedback?: string | null;
    score?: number | null;
    createdAt: string;
    updatedAt: string;
    reviewedAt?: string | null;
    student: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
}

export default function CourseBuilderPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, hasHydrated, isAuthorized } = useRequireAuth({ roles: ["INSTRUCTOR"] });
  const [sectionTitle, setSectionTitle] = useState("");
  const [reviewState, setReviewState] = useState<Record<string, { feedback: string; score: string }>>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);

  const courseQuery = useQuery({
    queryKey: ["course-builder", params.id],
    queryFn: () => apiFetch<Course>(`/courses/${params.id}`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const assessmentsQuery = useQuery({
    queryKey: ["course-assessments-builder", params.id],
    queryFn: () => apiFetch<CourseAssessments>(`/assessments/courses/${params.id}`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const learnersQuery = useQuery({
    queryKey: ["course-learners", params.id],
    queryFn: () => apiFetch<LearnerSummary[]>(`/courses/${params.id}/learners`, { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const assignmentSubmissionsQuery = useQuery({
    queryKey: ["assignment-submissions", params.id],
    queryFn: () =>
      apiFetch<AssignmentSubmissionGroup[]>(`/assessments/courses/${params.id}/assignment-submissions`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const reviewMutation = useMutation({
    mutationFn: ({ assignmentId, submissionId, feedback, score }: { assignmentId: string; submissionId: string; feedback: string; score: string }) =>
      apiFetch(`/assessments/assignments/${assignmentId}/submissions/${submissionId}/review`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          feedback: feedback.trim() || undefined,
          score: score.trim() ? Number(score) : undefined
        })
      }),
    onSuccess: async () => {
      await Promise.all([assignmentSubmissionsQuery.refetch(), learnersQuery.refetch()]);
    }
  });

  const uploadThumbnailMutation = useMutation({
    mutationFn: async () => {
      if (!thumbnailFile) {
        throw new Error("Choose a thumbnail first.");
      }

      const formData = new FormData();
      formData.append("file", thumbnailFile);

      return apiFetch(`/courses/${params.id}/thumbnail`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: async (updatedCourse) => {
      setThumbnailFile(null);
      const uploadedThumbnail =
        typeof updatedCourse === "object" &&
        updatedCourse !== null &&
        "thumbnailImage" in updatedCourse &&
        typeof (updatedCourse as { thumbnailImage?: unknown }).thumbnailImage === "string"
          ? ((updatedCourse as { thumbnailImage?: string | null }).thumbnailImage ?? null)
          : null;
      setThumbnailImage(uploadedThumbnail);
      await courseQuery.refetch();
    }
  });

  useEffect(() => {
    setThumbnailImage(courseQuery.data?.thumbnailImage ?? null);
  }, [courseQuery.data?.thumbnailImage]);

  const thumbnailPreviewUrl = useMemo(() => {
    if (thumbnailFile) {
      return URL.createObjectURL(thumbnailFile);
    }

    return thumbnailImage;
  }, [thumbnailFile, thumbnailImage]);

  useEffect(() => {
    return () => {
      if (thumbnailFile && thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
    };
  }, [thumbnailFile, thumbnailPreviewUrl]);

  async function refreshAll() {
    await Promise.all([
      courseQuery.refetch(),
      assessmentsQuery.refetch(),
      learnersQuery.refetch(),
      assignmentSubmissionsQuery.refetch()
    ]);
  }

  async function addSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch("/sections", {
      method: "POST",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        title: sectionTitle,
        courseId: params.id
      })
    });
    setSectionTitle("");
    await courseQuery.refetch();
  }

  async function addLesson(sectionId: string) {
    const title = window.prompt("Lesson title");
    if (!title) {
      return;
    }
    const type = window.prompt("Type: VIDEO | TEXT | FILE", "TEXT") ?? "TEXT";
    const content = window.prompt("Lesson content or URL", "") ?? "";

    await apiFetch("/lessons", {
      method: "POST",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        sectionId,
        title,
        type,
        content
      })
    });
    await courseQuery.refetch();
  }

  async function addQuiz() {
    const title = window.prompt("Quiz title");
    if (!title) {
      return;
    }

    const description = window.prompt("Quiz description", "") ?? "";
    const questions: Array<{ question: string; options: string[]; correctAnswer: string }> = [];

    while (true) {
      const question = window.prompt(`Question ${questions.length + 1} text`);
      if (!question) {
        break;
      }

      const optionsInput = window.prompt("Options separated by |", "Option A|Option B");
      if (!optionsInput) {
        break;
      }

      const options = optionsInput
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);

      if (options.length < 2) {
        window.alert("Each quiz question needs at least two options.");
        continue;
      }

      const correctAnswer = window.prompt("Correct answer (must match one option exactly)", options[0]) ?? "";
      if (!options.includes(correctAnswer)) {
        window.alert("Correct answer must exactly match one of the options.");
        continue;
      }

      questions.push({ question, options, correctAnswer });

      if (!window.confirm("Add another question?")) {
        break;
      }
    }

    if (questions.length === 0) {
      window.alert("Quiz creation cancelled. At least one question is required.");
      return;
    }

    await apiFetch("/assessments/quizzes", {
      method: "POST",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        courseId: params.id,
        title,
        description,
        questions
      })
    });

    await assessmentsQuery.refetch();
  }

  async function addAssignment() {
    const title = window.prompt("Assignment title");
    if (!title) {
      return;
    }

    const description = window.prompt("Assignment description", "") ?? "";
    const instructions = window.prompt("Assignment instructions", "") ?? "";

    await apiFetch("/assessments/assignments", {
      method: "POST",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        courseId: params.id,
        title,
        description,
        instructions
      })
    });

    await Promise.all([assessmentsQuery.refetch(), assignmentSubmissionsQuery.refetch()]);
  }

  async function updateSection(sectionId: string, currentTitle: string) {
    const title = window.prompt("New section title", currentTitle);
    if (!title) {
      return;
    }

    await apiFetch(`/sections/${sectionId}`, {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({ title })
    });
    await courseQuery.refetch();
  }

  async function deleteSection(sectionId: string) {
    await apiFetch(`/sections/${sectionId}`, {
      method: "DELETE",
      token: accessToken ?? undefined
    });
    await courseQuery.refetch();
  }

  async function updateLesson(lesson: Lesson) {
    const title = window.prompt("New lesson title", lesson.title);
    if (!title) {
      return;
    }
    const content = window.prompt("New lesson content", lesson.content);
    if (content === null) {
      return;
    }
    await apiFetch(`/lessons/${lesson.id}`, {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({ title, content })
    });
    await courseQuery.refetch();
  }

  async function deleteLesson(lessonId: string) {
    await apiFetch(`/lessons/${lessonId}`, {
      method: "DELETE",
      token: accessToken ?? undefined
    });
    await courseQuery.refetch();
  }

  async function submitReview(assignmentId: string, submissionId: string) {
    const draft = reviewState[submissionId] ?? { feedback: "", score: "" };
    await reviewMutation.mutateAsync({
      assignmentId,
      submissionId,
      feedback: draft.feedback,
      score: draft.score
    });
  }

  return (
    <main className="mx-auto max-w-6xl p-8">
      <BackButton fallbackHref="/instructor/courses" />
      <h1 className="text-2xl font-semibold">Course Builder</h1>

      {courseQuery.data ? (
        <div className="mt-4 rounded-lg bg-white p-4 shadow">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="h-40 overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                {thumbnailPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnailPreviewUrl} alt={`${courseQuery.data.title} thumbnail`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void uploadThumbnailMutation.mutateAsync()}
                  disabled={!thumbnailFile || uploadThumbnailMutation.isPending}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {uploadThumbnailMutation.isPending ? "Uploading..." : "Upload thumbnail"}
                </button>
                {thumbnailFile ? (
                  <button
                    type="button"
                    onClick={() => setThumbnailFile(null)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {uploadThumbnailMutation.isError ? (
                <p className="text-sm text-rose-600">{(uploadThumbnailMutation.error as Error).message}</p>
              ) : null}
              {uploadThumbnailMutation.isSuccess ? (
                <p className="text-sm text-emerald-700">Thumbnail uploaded successfully.</p>
              ) : null}
            </div>
            <div>
              <p className="text-lg font-medium">{courseQuery.data.title}</p>
              <p className="text-sm text-slate-600">{courseQuery.data.description}</p>
              <p className="mt-2 text-sm">
                Status: <span className="font-medium">{courseQuery.data.status}</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={addSection} className="mt-6 flex gap-2">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="New section title"
          value={sectionTitle}
          onChange={(event) => setSectionTitle(event.target.value)}
          required
        />
        <button className="rounded bg-slate-900 px-4 py-2 text-white">Add Section</button>
      </form>

      <div className="mt-8 flex flex-wrap gap-2">
        <button onClick={() => void addQuiz()} className="rounded border border-slate-300 px-4 py-2 text-sm">
          Add Quiz
        </button>
        <button onClick={() => void addAssignment()} className="rounded border border-slate-300 px-4 py-2 text-sm">
          Add Assignment
        </button>
        <button onClick={() => void refreshAll()} className="rounded border border-slate-300 px-4 py-2 text-sm">
          Refresh
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {courseQuery.data?.sections?.map((section) => (
          <div key={section.id} className="rounded-xl bg-white p-5 shadow">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {section.order}. {section.title}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => void updateSection(section.id, section.title)} className="rounded border px-3 py-1 text-sm">
                  Edit
                </button>
                <button type="button" onClick={() => void deleteSection(section.id)} className="rounded border px-3 py-1 text-sm">
                  Delete
                </button>
                <button type="button" onClick={() => void addLesson(section.id)} className="rounded bg-slate-900 px-3 py-1 text-sm text-white">
                  Add Lesson
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {section.lessons.map((lesson) => (
                <div key={lesson.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {lesson.order}. {lesson.title}
                    </p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => void updateLesson(lesson)} className="rounded border px-2 py-1 text-xs">
                        Edit
                      </button>
                      <button type="button" onClick={() => void deleteLesson(lesson.id)} className="rounded border px-2 py-1 text-xs">
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">Type: {lesson.type}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quizzes</h2>
            <span className="text-sm text-slate-500">{assessmentsQuery.data?.quizzes.length ?? 0}</span>
          </div>
          <div className="mt-4 space-y-3">
            {assessmentsQuery.data?.quizzes.length ? (
              assessmentsQuery.data.quizzes.map((quiz) => (
                <div key={quiz.id} className="rounded border border-slate-200 p-4">
                  <p className="font-medium">{quiz.title}</p>
                  {quiz.description ? <p className="mt-1 text-sm text-slate-600">{quiz.description}</p> : null}
                  <div className="mt-3 space-y-2">
                    {quiz.questions.map((question) => (
                      <div key={question.id} className="rounded bg-slate-50 p-3 text-sm">
                        <p className="font-medium">
                          {question.order}. {question.question}
                        </p>
                        <p className="mt-1 text-slate-600">Options: {question.options.join(" | ")}</p>
                        <p className="mt-1 text-xs text-slate-500">Correct: {question.correctAnswer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No quizzes yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assignments</h2>
            <span className="text-sm text-slate-500">{assessmentsQuery.data?.assignments.length ?? 0}</span>
          </div>
          <div className="mt-4 space-y-3">
            {assessmentsQuery.data?.assignments.length ? (
              assessmentsQuery.data.assignments.map((assignment) => (
                <div key={assignment.id} className="rounded border border-slate-200 p-4">
                  <p className="font-medium">{assignment.title}</p>
                  {assignment.description ? <p className="mt-1 text-sm text-slate-600">{assignment.description}</p> : null}
                  {assignment.instructions ? <p className="mt-2 text-sm text-slate-700">{assignment.instructions}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No assignments yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Learner Roster</h2>
            <span className="text-sm text-slate-500">{learnersQuery.data?.length ?? 0}</span>
          </div>
          <div className="mt-4 space-y-3">
            {learnersQuery.data?.length ? (
              learnersQuery.data.map((learner) => (
                <div key={learner.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{learner.learner.fullName}</p>
                      <p className="text-sm text-slate-600">{learner.learner.email}</p>
                    </div>
                    {learner.certificate ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                        Certified
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Lessons {learner.progress.completedLessons}/{learner.progress.totalLessons}
                      </span>
                      <span>{learner.progress.percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-sky-600" style={{ width: `${learner.progress.percentage}%` }} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>
                      Quizzes: {learner.assessments.quizzesCompleted}/{learner.assessments.quizzesTotal}
                    </p>
                    <p>
                      Assignments: {learner.assessments.assignmentsSubmitted}/{learner.assessments.assignmentsTotal}
                    </p>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    <p>Enrolled: {new Date(learner.enrolledAt).toLocaleString()}</p>
                    {learner.learningState?.updatedAt ? (
                      <p>Last activity tracked: {new Date(learner.learningState.updatedAt).toLocaleString()}</p>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No learners enrolled yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assignment Reviews</h2>
            <span className="text-sm text-slate-500">
              {assignmentSubmissionsQuery.data?.reduce((total, item) => total + item.submissions.length, 0) ?? 0}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {assignmentSubmissionsQuery.data?.length ? (
              assignmentSubmissionsQuery.data.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-slate-200 p-4">
                  <p className="font-medium text-slate-900">{assignment.title}</p>
                  {assignment.description ? <p className="mt-1 text-sm text-slate-600">{assignment.description}</p> : null}
                  <div className="mt-4 space-y-3">
                    {assignment.submissions.length ? (
                      assignment.submissions.map((submission) => {
                        const draft = reviewState[submission.id] ?? {
                          feedback: submission.feedback ?? "",
                          score: submission.score?.toString() ?? ""
                        };

                        return (
                          <div key={submission.id} className="rounded-lg bg-slate-50 p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-medium text-slate-900">{submission.student.fullName}</p>
                                <p className="text-sm text-slate-600">{submission.student.email}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Submitted {new Date(submission.updatedAt).toLocaleString()}
                                </p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-medium ${submission.status === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                {submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}
                              </span>
                            </div>
                            <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-700">
                              {submission.content}
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                              <textarea
                                className="min-h-24 rounded border border-slate-300 px-3 py-2 text-sm"
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
                                className="rounded border border-slate-300 px-3 py-2 text-sm"
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
                              <div className="text-xs text-slate-500">
                                {submission.reviewedAt ? `Reviewed ${new Date(submission.reviewedAt).toLocaleString()}` : "Not reviewed yet"}
                              </div>
                              <button
                                type="button"
                                onClick={() => void submitReview(assignment.id, submission.id)}
                                disabled={reviewMutation.isPending}
                                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                              >
                                {reviewMutation.isPending ? "Saving..." : submission.status === "REVIEWED" ? "Update Review" : "Review Submission"}
                              </button>
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
              <p className="text-sm text-slate-500">No assignments to review yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

