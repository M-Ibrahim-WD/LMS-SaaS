"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../../../lib/api/client";
import { BackButton } from "../../../../../components/back-button";
import {
  EmptyState,
  PillButton,
  StatPill,
  WorkspacePanel,
  WorkspaceShell
} from "../../../../../components/course-workspace";
import { StatusBanner } from "../../../../../components/status-banner";
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
  category?: string | null;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid?: boolean;
  price?: number | null;
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

type EditorMode =
  | { kind: "course" }
  | { kind: "new-section" }
  | { kind: "section"; sectionId: string }
  | { kind: "new-lesson"; sectionId: string }
  | { kind: "lesson"; lessonId: string }
  | { kind: "new-quiz" }
  | { kind: "quiz"; quizId: string }
  | { kind: "new-assignment" }
  | { kind: "assignment"; assignmentId: string };

type UtilityTab = "assessments" | "learners" | "submissions";

type LessonDraft = {
  title: string;
  type: Lesson["type"];
  content: string;
};

type QuizDraft = {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: string;
    correctAnswer: string;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function CourseBuilderPage() {
  const params = useParams<{ id: string }>();
  const { accessToken, hasHydrated, isAuthorized } = useRequireAuth({ roles: ["INSTRUCTOR"] });

  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: "course" });
  const [utilityTab, setUtilityTab] = useState<UtilityTab>("assessments");
  const [sectionTitle, setSectionTitle] = useState("");
  const [courseDraft, setCourseDraft] = useState({
    title: "",
    description: "",
    category: "",
    level: "BEGINNER" as NonNullable<Course["level"]>,
    isPaid: false,
    price: ""
  });
  const [sectionDraft, setSectionDraft] = useState({ title: "" });
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>({ title: "", type: "TEXT", content: "" });
  const [quizDraft, setQuizDraft] = useState<QuizDraft>({
    title: "",
    description: "",
    questions: [{ question: "", options: "", correctAnswer: "" }]
  });
  const [assignmentDraft, setAssignmentDraft] = useState({ title: "", description: "", instructions: "" });
  const [reviewState, setReviewState] = useState<Record<string, { feedback: string; score: string }>>({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [builderSuccess, setBuilderSuccess] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingLesson, setDraggingLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);

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
      setBuilderSuccess("Submission review saved.");
      await Promise.all([assignmentSubmissionsQuery.refetch(), learnersQuery.refetch()]);
    },
    onError: (error) => {
      setBuilderError(error instanceof Error ? error.message : "Could not save the review.");
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
      setBuilderSuccess("Thumbnail updated.");
      await courseQuery.refetch();
    },
    onError: (error) => {
      setBuilderError(error instanceof Error ? error.message : "Could not upload the thumbnail.");
    }
  });

  useEffect(() => {
    setThumbnailImage(courseQuery.data?.thumbnailImage ?? null);
  }, [courseQuery.data?.thumbnailImage]);

  useEffect(() => {
    if (!courseQuery.data) {
      return;
    }

    setCourseDraft({
      title: courseQuery.data.title,
      description: courseQuery.data.description ?? "",
      category: courseQuery.data.category ?? "",
      level: courseQuery.data.level ?? "BEGINNER",
      isPaid: Boolean(courseQuery.data.isPaid),
      price: courseQuery.data.price?.toString() ?? ""
    });
  }, [courseQuery.data]);

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

  const selectedSection =
    editorMode.kind === "section" || editorMode.kind === "new-lesson"
      ? courseQuery.data?.sections.find((section) => section.id === editorMode.sectionId) ?? null
      : null;

  const selectedLesson =
    editorMode.kind === "lesson"
      ? courseQuery.data?.sections.flatMap((section) => section.lessons).find((lesson) => lesson.id === editorMode.lessonId) ?? null
      : null;

  const selectedQuiz =
    editorMode.kind === "quiz"
      ? assessmentsQuery.data?.quizzes.find((quiz) => quiz.id === editorMode.quizId) ?? null
      : null;

  const selectedAssignment =
    editorMode.kind === "assignment"
      ? assessmentsQuery.data?.assignments.find((assignment) => assignment.id === editorMode.assignmentId) ?? null
      : null;

  useEffect(() => {
    setBuilderError(null);
    setBuilderSuccess(null);
    setConfirmDeleteKey(null);

    if (editorMode.kind === "new-section") {
      setSectionDraft({ title: "" });
      return;
    }

    if (editorMode.kind === "section" && selectedSection) {
      setSectionDraft({ title: selectedSection.title });
      return;
    }

    if (editorMode.kind === "new-lesson") {
      setLessonDraft({ title: "", type: "TEXT", content: "" });
      return;
    }

    if (editorMode.kind === "lesson" && selectedLesson) {
      setLessonDraft({
        title: selectedLesson.title,
        type: selectedLesson.type,
        content: selectedLesson.content
      });
      return;
    }

    if (editorMode.kind === "new-quiz") {
      setQuizDraft({
        title: "",
        description: "",
        questions: [{ question: "", options: "", correctAnswer: "" }]
      });
      return;
    }

    if (editorMode.kind === "quiz" && selectedQuiz) {
      setQuizDraft({
        title: selectedQuiz.title,
        description: selectedQuiz.description ?? "",
        questions: selectedQuiz.questions.map((question) => ({
          question: question.question,
          options: question.options.join("`n"),
          correctAnswer: question.correctAnswer ?? ""
        }))
      });
      return;
    }

    if (editorMode.kind === "new-assignment") {
      setAssignmentDraft({ title: "", description: "", instructions: "" });
      return;
    }

    if (editorMode.kind === "assignment" && selectedAssignment) {
      setAssignmentDraft({
        title: selectedAssignment.title,
        description: selectedAssignment.description ?? "",
        instructions: selectedAssignment.instructions ?? ""
      });
    }
  }, [editorMode, selectedSection, selectedLesson, selectedQuiz, selectedAssignment]);

  async function refreshAll() {
    await Promise.all([
      courseQuery.refetch(),
      assessmentsQuery.refetch(),
      learnersQuery.refetch(),
      assignmentSubmissionsQuery.refetch()
    ]);
  }

  async function handleCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch("/sections", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          title: sectionTitle,
          courseId: params.id
        })
      });
      setSectionTitle("");
      setBuilderSuccess("Section created.");
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not create the section.");
    }
  }

  async function saveCourse() {
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch(`/courses/${params.id}`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          title: courseDraft.title,
          description: courseDraft.description || undefined,
          category: courseDraft.category || undefined,
          level: courseDraft.level,
          isPaid: courseDraft.isPaid,
          price: courseDraft.isPaid ? Number(courseDraft.price) : undefined
        })
      });
      setBuilderSuccess("Course details saved.");
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save the course.");
    }
  }

  async function toggleStatus() {
    if (!courseQuery.data) {
      return;
    }

    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      const nextStatus = courseQuery.data.status === "DRAFT" ? "PUBLISHED" : "DRAFT";
      await apiFetch(`/courses/${params.id}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ status: nextStatus })
      });
      setBuilderSuccess(nextStatus === "PUBLISHED" ? "Course published." : "Course moved back to draft.");
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not change the course status.");
    }
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      if (editorMode.kind === "new-section") {
        await apiFetch("/sections", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({ courseId: params.id, title: sectionDraft.title })
        });
        setBuilderSuccess("Section created.");
      } else if (editorMode.kind === "section") {
        await apiFetch(`/sections/${editorMode.sectionId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify({ title: sectionDraft.title })
        });
        setBuilderSuccess("Section updated.");
      }
      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save the section.");
    }
  }

  async function deleteSection(sectionId: string) {
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch(`/sections/${sectionId}`, {
        method: "DELETE",
        token: accessToken ?? undefined
      });
      setBuilderSuccess("Section deleted.");
      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not delete the section.");
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      if (editorMode.kind === "new-lesson") {
        await apiFetch("/lessons", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            sectionId: editorMode.sectionId,
            title: lessonDraft.title,
            type: lessonDraft.type,
            content: lessonDraft.content
          })
        });
        setBuilderSuccess("Lesson created.");
      } else if (editorMode.kind === "lesson") {
        await apiFetch(`/lessons/${editorMode.lessonId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify(lessonDraft)
        });
        setBuilderSuccess("Lesson updated.");
      }

      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save the lesson.");
    }
  }

  async function duplicateLesson() {
    if (!selectedLesson || !courseQuery.data) {
      return;
    }

    const parentSection = courseQuery.data.sections.find((section) => section.lessons.some((lesson) => lesson.id === selectedLesson.id));
    if (!parentSection) {
      return;
    }

    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch("/lessons", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          sectionId: parentSection.id,
          title: `${selectedLesson.title} Copy`,
          type: selectedLesson.type,
          content: selectedLesson.content
        })
      });
      setBuilderSuccess("Lesson duplicated.");
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not duplicate the lesson.");
    }
  }

  async function deleteLesson(lessonId: string) {
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch(`/lessons/${lessonId}`, {
        method: "DELETE",
        token: accessToken ?? undefined
      });
      setBuilderSuccess("Lesson deleted.");
      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not delete the lesson.");
    }
  }

  function normaliseQuizQuestions() {
    return quizDraft.questions.map((question) => {
      const options = question.options
        .split(/`r?`n/)
        .map((option) => option.trim())
        .filter(Boolean);

      return {
        question: question.question,
        options,
        correctAnswer: question.correctAnswer
      };
    });
  }

  async function saveQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      const questions = normaliseQuizQuestions();
      if (questions.some((question) => question.options.length < 2)) {
        setBuilderError("Every quiz question needs at least two options.");
        return;
      }
      if (questions.some((question) => !question.options.includes(question.correctAnswer))) {
        setBuilderError("Each correct answer must match one of its options exactly.");
        return;
      }

      if (editorMode.kind === "new-quiz") {
        await apiFetch("/assessments/quizzes", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            courseId: params.id,
            title: quizDraft.title,
            description: quizDraft.description || undefined,
            questions
          })
        });
        setBuilderSuccess("Quiz created.");
      } else if (editorMode.kind === "quiz") {
        await apiFetch(`/assessments/quizzes/${editorMode.quizId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            title: quizDraft.title,
            description: quizDraft.description || undefined,
            questions
          })
        });
        setBuilderSuccess("Quiz updated.");
      }

      await assessmentsQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save the quiz.");
    }
  }

  async function deleteQuiz(quizId: string) {
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch(`/assessments/quizzes/${quizId}/delete`, {
        method: "PATCH",
        token: accessToken ?? undefined
      });
      setBuilderSuccess("Quiz deleted.");
      await assessmentsQuery.refetch();
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not delete the quiz.");
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      if (editorMode.kind === "new-assignment") {
        await apiFetch("/assessments/assignments", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            courseId: params.id,
            title: assignmentDraft.title,
            description: assignmentDraft.description || undefined,
            instructions: assignmentDraft.instructions || undefined
          })
        });
        setBuilderSuccess("Assignment created.");
      } else if (editorMode.kind === "assignment") {
        await apiFetch(`/assessments/assignments/${editorMode.assignmentId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            title: assignmentDraft.title,
            description: assignmentDraft.description || undefined,
            instructions: assignmentDraft.instructions || undefined
          })
        });
        setBuilderSuccess("Assignment updated.");
      }

      await Promise.all([assessmentsQuery.refetch(), assignmentSubmissionsQuery.refetch()]);
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not save the assignment.");
    }
  }

  async function deleteAssignment(assignmentId: string) {
    setBuilderError(null);
    setBuilderSuccess(null);
    try {
      await apiFetch(`/assessments/assignments/${assignmentId}/delete`, {
        method: "PATCH",
        token: accessToken ?? undefined
      });
      setBuilderSuccess("Assignment deleted.");
      await Promise.all([assessmentsQuery.refetch(), assignmentSubmissionsQuery.refetch()]);
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Could not delete the assignment.");
    }
  }

  async function reorderSections(sourceId: string, targetId: string) {
    if (!courseQuery.data || sourceId === targetId) {
      return;
    }

    const sourceIndex = courseQuery.data.sections.findIndex((section) => section.id === sourceId);
    const targetIndex = courseQuery.data.sections.findIndex((section) => section.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = moveItem(courseQuery.data.sections, sourceIndex, targetIndex);
    await apiFetch("/sections/reorder", {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        courseId: params.id,
        items: reordered.map((section, index) => ({ id: section.id, order: index + 1 }))
      })
    });
    await courseQuery.refetch();
  }

  async function reorderLessons(sectionId: string, sourceLessonId: string, targetLessonId: string) {
    const section = courseQuery.data?.sections.find((item) => item.id === sectionId);
    if (!section || sourceLessonId === targetLessonId) {
      return;
    }

    const sourceIndex = section.lessons.findIndex((lesson) => lesson.id === sourceLessonId);
    const targetIndex = section.lessons.findIndex((lesson) => lesson.id === targetLessonId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = moveItem(section.lessons, sourceIndex, targetIndex);
    await apiFetch("/lessons/reorder", {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        sectionId,
        items: reordered.map((lesson, index) => ({ id: lesson.id, order: index + 1 }))
      })
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

  const outlineSections = courseQuery.data?.sections ?? [];
  const lessonsCount = outlineSections.reduce((total, section) => total + section.lessons.length, 0);
  const quizzesCount = assessmentsQuery.data?.quizzes.length ?? 0;
  const assignmentsCount = assessmentsQuery.data?.assignments.length ?? 0;

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
              {assessmentsQuery.data?.quizzes.length ? (
                assessmentsQuery.data.quizzes.map((quiz) => (
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
                    <p className="mt-1 text-xs opacity-80">{quiz.questions.length} questions</p>
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
              {assessmentsQuery.data?.assignments.length ? (
                assessmentsQuery.data.assignments.map((assignment) => (
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
                    <p className="mt-1 text-xs opacity-80">Assignment brief + submission flow</p>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="No assignments yet"
                  description="Add a written deliverable and review submissions from the same workspace."
                  action={<PillButton onClick={() => setEditorMode({ kind: "new-assignment" })}>Create assignment</PillButton>}
                />
              )}
            </div>
          </div>
        </div>
      </WorkspacePanel>
    ) : utilityTab === "learners" ? (
      <WorkspacePanel title="Learners" description="Track progress, certificate status, and learning continuity.">
        <div className="space-y-3">
          {learnersQuery.data?.length ? (
            learnersQuery.data.map((learner) => (
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
                  <p>Last activity: {learner.learningState ? formatDate(learner.learningState.updatedAt) : "Not tracked yet"}</p>
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
          {assignmentSubmissionsQuery.data?.length ? (
            assignmentSubmissionsQuery.data.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{assignment.title}</p>
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
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${submission.status === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
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
                            <p className="text-xs text-slate-500">Submitted {formatDate(submission.updatedAt)}</p>
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
    <main className="mx-auto max-w-[1700px] p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <BackButton fallbackHref="/instructor/courses" />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Course Builder</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Build the full learning journey here. Sections, lessons, quizzes, assignments, learner progress, and submissions now live inside one workspace instead of scattered prompt windows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton onClick={() => void refreshAll()}>Refresh workspace</PillButton>
          <Link href={`/courses/${params.id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Preview course
          </Link>
          <PillButton onClick={() => void toggleStatus()}>
            {courseQuery.data?.status === "PUBLISHED" ? "Set draft" : "Publish course"}
          </PillButton>
        </div>
      </div>

      {builderError ? <StatusBanner variant="error">{builderError}</StatusBanner> : null}
      {builderSuccess ? <div className="mt-3"><StatusBanner variant="success">{builderSuccess}</StatusBanner></div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <StatPill label="Sections" value={String(outlineSections.length)} tone="info" />
        <StatPill label="Lessons" value={String(lessonsCount)} tone="default" />
        <StatPill label="Assessments" value={`${quizzesCount + assignmentsCount}`} tone="warning" />
        <StatPill label="Learners" value={String(learnersQuery.data?.length ?? 0)} tone="success" />
      </div>

      <div className="mt-6">
        <WorkspaceShell
          sidebar={
            <WorkspacePanel
              title="Course outline"
              description="Drag to reorder. Click any item to open its editor."
              actions={<PillButton onClick={() => setEditorMode({ kind: "new-section" })}>New section</PillButton>}
            >
              <form onSubmit={handleCreateSection} className="mb-4 grid gap-2">
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Quick add section"
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  required
                />
                <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  Add section
                </button>
              </form>
              <div className="space-y-3">
                {outlineSections.length ? (
                  outlineSections.map((section) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => setDraggingSectionId(section.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (draggingSectionId) {
                          void reorderSections(draggingSectionId, section.id);
                        }
                        setDraggingSectionId(null);
                      }}
                      className={`rounded-3xl border p-3 transition ${
                        (editorMode.kind === "section" && editorMode.sectionId === section.id) ||
                        (editorMode.kind === "new-lesson" && editorMode.sectionId === section.id)
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setEditorMode({ kind: "section", sectionId: section.id })}
                          className="text-left"
                        >
                          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Section {section.order}</p>
                          <p className="mt-1 text-sm font-semibold">{section.title}</p>
                        </button>
                        <PillButton onClick={() => setEditorMode({ kind: "new-lesson", sectionId: section.id })}>
                          Lesson
                        </PillButton>
                      </div>
                      <div className="mt-3 space-y-2">
                        {section.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            type="button"
                            draggable
                            onDragStart={() => setDraggingLesson({ sectionId: section.id, lessonId: lesson.id })}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (draggingLesson && draggingLesson.sectionId === section.id) {
                                void reorderLessons(section.id, draggingLesson.lessonId, lesson.id);
                              }
                              setDraggingLesson(null);
                            }}
                            onClick={() => setEditorMode({ kind: "lesson", lessonId: lesson.id })}
                            className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                              editorMode.kind === "lesson" && editorMode.lessonId === lesson.id
                                ? "border-white/40 bg-white/15 text-white"
                                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">{lesson.title}</p>
                                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] opacity-70">{lesson.type}</p>
                              </div>
                              <span className="text-xs opacity-70">{lesson.order}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Start the outline" description="Create the first section to begin structuring the course." />
                )}
              </div>
            </WorkspacePanel>
          }
          main={
            <>
              {courseQuery.isLoading ? <StatusBanner>Loading the builder...</StatusBanner> : null}
              {courseQuery.isError ? <StatusBanner variant="error">Could not load this course builder.</StatusBanner> : null}

              {courseQuery.data ? (
                <WorkspacePanel
                  title={courseQuery.data.title}
                  description={courseQuery.data.description ?? "Build a sharper learning flow from here."}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${courseQuery.data.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {courseQuery.data.status}
                      </span>
                      <PillButton active={editorMode.kind === "course"} onClick={() => setEditorMode({ kind: "course" })}>
                        Course details
                      </PillButton>
                    </div>
                  }
                >
                  <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className="h-48 overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                        {thumbnailPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnailPreviewUrl} alt={`${courseQuery.data.title} thumbnail`} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                      />
                      <div className="flex flex-wrap gap-2">
                        <PillButton onClick={() => void uploadThumbnailMutation.mutateAsync()} disabled={!thumbnailFile || uploadThumbnailMutation.isPending}>
                          {uploadThumbnailMutation.isPending ? "Uploading..." : "Upload thumbnail"}
                        </PillButton>
                        {thumbnailFile ? <PillButton onClick={() => setThumbnailFile(null)}>Clear</PillButton> : null}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <StatPill label="Status" value={courseQuery.data.status} tone={courseQuery.data.status === "PUBLISHED" ? "success" : "warning"} />
                      <StatPill label="Price" value={courseQuery.data.isPaid ? `${Number(courseQuery.data.price ?? 0).toFixed(2)}` : "Free"} tone="info" />
                      <StatPill label="Category" value={courseQuery.data.category || "Not set"} tone="default" />
                      <StatPill label="Level" value={(courseQuery.data.level ?? "BEGINNER").toLowerCase()} tone="default" />
                    </div>
                  </div>
                </WorkspacePanel>
              ) : null}

              {editorMode.kind === "course" ? (
                <WorkspacePanel title="Course metadata" description="Edit the main course settings here, then publish from the workspace header.">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveCourse();
                    }}
                    className="grid gap-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Course title</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" value={courseDraft.title} onChange={(event) => setCourseDraft((current) => ({ ...current, title: event.target.value }))} required />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Category</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" value={courseDraft.category} onChange={(event) => setCourseDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Web development, design, productivity..." />
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-32 rounded-2xl border border-slate-300 px-3 py-2" value={courseDraft.description} onChange={(event) => setCourseDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Level</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={courseDraft.level} onChange={(event) => setCourseDraft((current) => ({ ...current, level: event.target.value as typeof current.level }))}>
                          <option value="BEGINNER">Beginner</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="ADVANCED">Advanced</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Pricing mode</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={courseDraft.isPaid ? "PAID" : "FREE"} onChange={(event) => setCourseDraft((current) => ({ ...current, isPaid: event.target.value === "PAID", price: event.target.value === "PAID" ? current.price : "" }))}>
                          <option value="FREE">Free</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Price</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" type="number" min={0.01} step="0.01" disabled={!courseDraft.isPaid} value={courseDraft.price} onChange={(event) => setCourseDraft((current) => ({ ...current, price: event.target.value }))} />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">Save course</PillButton>
                      <PillButton onClick={() => courseQuery.data && setCourseDraft({ title: courseQuery.data.title, description: courseQuery.data.description ?? "", category: courseQuery.data.category ?? "", level: courseQuery.data.level ?? "BEGINNER", isPaid: Boolean(courseQuery.data.isPaid), price: courseQuery.data.price?.toString() ?? "" })}>Reset</PillButton>
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(editorMode.kind === "new-section" || editorMode.kind === "section") ? (
                <WorkspacePanel title={editorMode.kind === "new-section" ? "Create section" : "Edit section"} description="Sections shape the learning path and keep lessons grouped with intention.">
                  <form onSubmit={saveSection} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Section title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={sectionDraft.title} onChange={(event) => setSectionDraft({ title: event.target.value })} required />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{editorMode.kind === "new-section" ? "Create section" : "Save section"}</PillButton>
                      <PillButton onClick={() => setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {editorMode.kind === "section" ? (
                        confirmDeleteKey === `section:${editorMode.sectionId}` ? (
                          <PillButton onClick={() => void deleteSection(editorMode.sectionId)}>Confirm delete</PillButton>
                        ) : (
                          <PillButton onClick={() => setConfirmDeleteKey(`section:${editorMode.sectionId}`)}>Delete section</PillButton>
                        )
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(editorMode.kind === "new-lesson" || editorMode.kind === "lesson") ? (
                <WorkspacePanel title={editorMode.kind === "new-lesson" ? `Add lesson${selectedSection ? ` to ${selectedSection.title}` : ""}` : "Edit lesson"} description="Use structured lesson forms so authoring stays inside the builder, not browser popups.">
                  <form onSubmit={saveLesson} className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Lesson title</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" value={lessonDraft.title} onChange={(event) => setLessonDraft((current) => ({ ...current, title: event.target.value }))} required />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Lesson type</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={lessonDraft.type} onChange={(event) => setLessonDraft((current) => ({ ...current, type: event.target.value as LessonDraft["type"] }))}>
                          <option value="TEXT">Text</option>
                          <option value="VIDEO">Video</option>
                          <option value="FILE">File</option>
                        </select>
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Lesson content or URL</span>
                      <textarea className="min-h-48 rounded-2xl border border-slate-300 px-3 py-2" value={lessonDraft.content} onChange={(event) => setLessonDraft((current) => ({ ...current, content: event.target.value }))} placeholder={lessonDraft.type === "VIDEO" ? "Paste the video URL or embed-friendly link" : "Write the lesson content or reference file URL"} required />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{editorMode.kind === "new-lesson" ? "Create lesson" : "Save lesson"}</PillButton>
                      <PillButton onClick={() => setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {editorMode.kind === "lesson" ? <PillButton onClick={() => void duplicateLesson()}>Duplicate lesson</PillButton> : null}
                      {editorMode.kind === "lesson" ? (
                        confirmDeleteKey === `lesson:${editorMode.lessonId}` ? (
                          <PillButton onClick={() => void deleteLesson(editorMode.lessonId)}>Confirm delete</PillButton>
                        ) : (
                          <PillButton onClick={() => setConfirmDeleteKey(`lesson:${editorMode.lessonId}`)}>Delete lesson</PillButton>
                        )
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(editorMode.kind === "new-quiz" || editorMode.kind === "quiz") ? (
                <WorkspacePanel title={editorMode.kind === "new-quiz" ? "Create quiz" : "Edit quiz"} description="Build the quiz with explicit question forms and clear answer validation.">
                  <form onSubmit={saveQuiz} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Quiz title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={quizDraft.title} onChange={(event) => setQuizDraft((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={quizDraft.description} onChange={(event) => setQuizDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <div className="space-y-4">
                      {quizDraft.questions.map((question, index) => (
                        <div key={`${editorMode.kind}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">Question {index + 1}</p>
                            {quizDraft.questions.length > 1 ? (
                              <PillButton onClick={() => setQuizDraft((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))}>
                                Remove
                              </PillButton>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-3">
                            <input className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Question text" value={question.question} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item) }))} required />
                            <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="One option per line" value={question.options} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value } : item) }))} required />
                            <input className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Correct answer (must match one line above)" value={question.correctAnswer} onChange={(event) => setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, correctAnswer: event.target.value } : item) }))} required />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PillButton onClick={() => setQuizDraft((current) => ({ ...current, questions: [...current.questions, { question: "", options: "", correctAnswer: "" }] }))}>
                        Add question
                      </PillButton>
                      <PillButton type="submit">{editorMode.kind === "new-quiz" ? "Create quiz" : "Save quiz"}</PillButton>
                      <PillButton onClick={() => setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {editorMode.kind === "quiz" ? (
                        confirmDeleteKey === `quiz:${editorMode.quizId}` ? (
                          <PillButton onClick={() => void deleteQuiz(editorMode.quizId)}>Confirm delete</PillButton>
                        ) : (
                          <PillButton onClick={() => setConfirmDeleteKey(`quiz:${editorMode.quizId}`)}>Delete quiz</PillButton>
                        )
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(editorMode.kind === "new-assignment" || editorMode.kind === "assignment") ? (
                <WorkspacePanel title={editorMode.kind === "new-assignment" ? "Create assignment" : "Edit assignment"} description="Assignments should feel like part of the learning design, not an afterthought.">
                  <form onSubmit={saveAssignment} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Assignment title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={assignmentDraft.title} onChange={(event) => setAssignmentDraft((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={assignmentDraft.description} onChange={(event) => setAssignmentDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Instructions</span>
                      <textarea className="min-h-40 rounded-2xl border border-slate-300 px-3 py-2" value={assignmentDraft.instructions} onChange={(event) => setAssignmentDraft((current) => ({ ...current, instructions: event.target.value }))} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{editorMode.kind === "new-assignment" ? "Create assignment" : "Save assignment"}</PillButton>
                      <PillButton onClick={() => setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {editorMode.kind === "assignment" ? (
                        confirmDeleteKey === `assignment:${editorMode.assignmentId}` ? (
                          <PillButton onClick={() => void deleteAssignment(editorMode.assignmentId)}>Confirm delete</PillButton>
                        ) : (
                          <PillButton onClick={() => setConfirmDeleteKey(`assignment:${editorMode.assignmentId}`)}>Delete assignment</PillButton>
                        )
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {editorMode.kind === "course" && !outlineSections.length && !quizzesCount && !assignmentsCount ? (
                <WorkspacePanel title="Start building" description="Use the sidebar and utility rail to shape the first version of the course.">
                  <EmptyState
                    title="This course is still empty"
                    description="Create a section, add your first lesson, then bring in quizzes and assignments to complete the learning path."
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <PillButton onClick={() => setEditorMode({ kind: "new-section" })}>Create section</PillButton>
                        <PillButton onClick={() => setEditorMode({ kind: "new-quiz" })}>Create quiz</PillButton>
                        <PillButton onClick={() => setEditorMode({ kind: "new-assignment" })}>Create assignment</PillButton>
                      </div>
                    }
                  />
                </WorkspacePanel>
              ) : null}
            </>
          }
          utility={
            <>
              <WorkspacePanel title="Workspace tools" description="Switch the right rail depending on what you need to manage right now.">
                <div className="flex flex-wrap gap-2">
                  <PillButton active={utilityTab === "assessments"} onClick={() => setUtilityTab("assessments")}>Assessments</PillButton>
                  <PillButton active={utilityTab === "learners"} onClick={() => setUtilityTab("learners")}>Learners</PillButton>
                  <PillButton active={utilityTab === "submissions"} onClick={() => setUtilityTab("submissions")}>Submissions</PillButton>
                </div>
              </WorkspacePanel>
              {utilityContent}
            </>
          }
        />
      </div>
    </main>
  );
}

