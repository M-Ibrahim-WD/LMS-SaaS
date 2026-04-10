"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../../../../../lib/api/client";
import { useRequireAuth } from "../../../../../../hooks/use-require-auth";

import type {
  Assignment,
  AssignmentDraft,
  AssignmentSubmissionGroup,
  AssessmentScopeType,
  Course,
  CourseAssessments,
  EditorMode,
  LearnerSummary,
  LessonDraft,
  ProtectedContentEventSummary,
  Quiz,
  QuizDraft,
  QuizSubmissionGroup,
  UtilityTab
} from "../_components/course-builder-types";
import { moveItem } from "../_components/course-builder-types";

function normalizeScopePayload(scopeType: AssessmentScopeType, sectionId: string, lessonId: string) {
  return {
    scopeType,
    sectionId: scopeType === "SECTION" ? sectionId : scopeType === "LESSON" ? sectionId : undefined,
    lessonId: scopeType === "LESSON" ? lessonId : undefined
  };
}

export function useCourseBuilderWorkspace() {
  const params = useParams<{ id: string }>();
  const { accessToken, hasHydrated, isAuthorized } = useRequireAuth({
    roles: ["INSTRUCTOR"]
  });

  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: "course" });
  const [utilityTab, setUtilityTab] = useState<UtilityTab>("assessments");
  const [courseDraft, setCourseDraft] = useState({
    title: "",
    description: "",
    category: "",
    level: "BEGINNER" as NonNullable<Course["level"]>,
    isPaid: false,
    price: ""
  });
  const [sectionDraft, setSectionDraft] = useState({ title: "", description: "" });
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>({
    title: "",
    type: "TEXT",
    description: ""
  });
  const [quizDraft, setQuizDraft] = useState<QuizDraft>({
    title: "",
    description: "",
    scopeType: "COURSE",
    sectionId: "",
    lessonId: "",
    questions: [{ question: "", options: ["", ""], correctOptionIndex: 0 }]
  });
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>({
    title: "",
    description: "",
    instructions: "",
    scopeType: "COURSE",
    sectionId: "",
    lessonId: ""
  });
  const [reviewState, setReviewState] = useState<
    Record<string, { feedback: string; score: string }>
  >({});
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [lessonMediaFile, setLessonMediaFile] = useState<File | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [builderSuccess, setBuilderSuccess] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingLesson, setDraggingLesson] = useState<{
    sectionId: string;
    lessonId: string;
  } | null>(null);

  const courseQuery = useQuery({
    queryKey: ["course-builder", params.id],
    queryFn: () =>
      apiFetch<Course>(`/courses/${params.id}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const assessmentsQuery = useQuery({
    queryKey: ["course-assessments-builder", params.id],
    queryFn: () =>
      apiFetch<CourseAssessments>(`/assessments/courses/${params.id}`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const learnersQuery = useQuery({
    queryKey: ["course-learners", params.id],
    queryFn: () =>
      apiFetch<LearnerSummary[]>(`/courses/${params.id}/learners`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const assignmentSubmissionsQuery = useQuery({
    queryKey: ["assignment-submissions", params.id],
    queryFn: () =>
      apiFetch<AssignmentSubmissionGroup[]>(
        `/assessments/courses/${params.id}/assignment-submissions`,
        {
          token: accessToken ?? undefined
        }
      ),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const quizSubmissionsQuery = useQuery({
    queryKey: ["quiz-submissions", params.id],
    queryFn: () =>
      apiFetch<QuizSubmissionGroup[]>(
        `/assessments/courses/${params.id}/quiz-submissions`,
        {
          token: accessToken ?? undefined
        }
      ),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const securityEventsQuery = useQuery({
    queryKey: ["course-security-events", params.id],
    queryFn: () =>
      apiFetch<ProtectedContentEventSummary[]>(`/courses/${params.id}/security-events`, {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(hasHydrated && accessToken && params.id && isAuthorized)
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      assignmentId,
      submissionId,
      feedback,
      score
    }: {
      assignmentId: string;
      submissionId: string;
      feedback: string;
      score: string;
    }) =>
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
      await Promise.all([
        assignmentSubmissionsQuery.refetch(),
        learnersQuery.refetch()
      ]);
    },
    onError: (error) => {
      setBuilderError(
        error instanceof Error ? error.message : "Could not save the review."
      );
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
        typeof (updatedCourse as { thumbnailImage?: unknown }).thumbnailImage ===
          "string"
          ? ((updatedCourse as { thumbnailImage?: string | null }).thumbnailImage ??
              null)
          : null;

      setThumbnailImage(uploadedThumbnail);
      setBuilderSuccess("Thumbnail updated.");
      await courseQuery.refetch();
    },
    onError: (error) => {
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not upload the thumbnail."
      );
    }
  });

  const uploadLessonMediaMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!lessonMediaFile) {
        throw new Error("Choose lesson media first.");
      }

      const formData = new FormData();
      formData.append("file", lessonMediaFile);

      return apiFetch(`/lessons/${lessonId}/media`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: async () => {
      setLessonMediaFile(null);
      setBuilderSuccess("Lesson media uploaded.");
      await courseQuery.refetch();
    },
    onError: (error) => {
      setBuilderError(
        error instanceof Error ? error.message : "Could not upload lesson media."
      );
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
      ? courseQuery.data?.sections.find(
          (section) => section.id === editorMode.sectionId
        ) ?? null
      : null;

  const selectedLesson =
    editorMode.kind === "lesson"
      ? courseQuery.data?.sections
          .flatMap((section) => section.lessons)
          .find((lesson) => lesson.id === editorMode.lessonId) ?? null
      : null;

  const selectedQuiz =
    editorMode.kind === "quiz"
      ? assessmentsQuery.data?.quizzes.find(
          (quiz) => quiz.id === editorMode.quizId
        ) ?? null
      : null;

  const selectedAssignment =
    editorMode.kind === "assignment"
      ? assessmentsQuery.data?.assignments.find(
          (assignment) => assignment.id === editorMode.assignmentId
        ) ?? null
      : null;

  useEffect(() => {
    setBuilderError(null);
    setBuilderSuccess(null);
    setConfirmDeleteKey(null);

    if (editorMode.kind === "new-section") {
      setSectionDraft({ title: "", description: "" });
      return;
    }

    if (editorMode.kind === "section" && selectedSection) {
      setSectionDraft({
        title: selectedSection.title,
        description: selectedSection.description ?? ""
      });
      return;
    }

    if (editorMode.kind === "new-lesson") {
      setLessonDraft({ title: "", type: "TEXT", description: "" });
      setLessonMediaFile(null);
      return;
    }

    if (editorMode.kind === "lesson" && selectedLesson) {
      setLessonDraft({
        title: selectedLesson.title,
        type: selectedLesson.type,
        description: selectedLesson.description ?? selectedLesson.content ?? ""
      });
      setLessonMediaFile(null);
      return;
    }

    if (editorMode.kind === "new-quiz") {
      setQuizDraft({
        title: "",
        description: "",
        scopeType: "COURSE",
        sectionId: "",
        lessonId: "",
        questions: [{ question: "", options: ["", ""], correctOptionIndex: 0 }]
      });
      return;
    }

    if (editorMode.kind === "quiz" && selectedQuiz) {
      setQuizDraft({
        title: selectedQuiz.title,
        description: selectedQuiz.description ?? "",
        scopeType: selectedQuiz.scopeType,
        sectionId: selectedQuiz.sectionId ?? "",
        lessonId: selectedQuiz.lessonId ?? "",
        questions: selectedQuiz.questions.map((question) => ({
          question: question.question,
          options: question.options,
          correctOptionIndex: Math.max(
            0,
            question.options.findIndex((option) => option === question.correctAnswer)
          )
        }))
      });
      return;
    }

    if (editorMode.kind === "new-assignment") {
      setAssignmentDraft({
        title: "",
        description: "",
        instructions: "",
        scopeType: "COURSE",
        sectionId: "",
        lessonId: ""
      });
      return;
    }

    if (editorMode.kind === "assignment" && selectedAssignment) {
      setAssignmentDraft({
        title: selectedAssignment.title,
        description: selectedAssignment.description ?? "",
        instructions: selectedAssignment.instructions ?? "",
        scopeType: selectedAssignment.scopeType,
        sectionId: selectedAssignment.sectionId ?? "",
        lessonId: selectedAssignment.lessonId ?? ""
      });
    }
  }, [
    editorMode,
    selectedAssignment,
    selectedLesson,
    selectedQuiz,
    selectedSection
  ]);

  async function refreshAll() {
    await Promise.all([
      courseQuery.refetch(),
      assessmentsQuery.refetch(),
      learnersQuery.refetch(),
      assignmentSubmissionsQuery.refetch(),
      quizSubmissionsQuery.refetch(),
      securityEventsQuery.refetch()
    ]);
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
      setBuilderError(
        error instanceof Error ? error.message : "Could not save the course."
      );
    }
  }

  async function toggleStatus() {
    if (!courseQuery.data) {
      return;
    }

    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      const nextStatus =
        courseQuery.data.status === "DRAFT" ? "PUBLISHED" : "DRAFT";
      await apiFetch(`/courses/${params.id}/status`, {
        method: "PATCH",
        token: accessToken ?? undefined,
        body: JSON.stringify({ status: nextStatus })
      });
      setBuilderSuccess(
        nextStatus === "PUBLISHED"
          ? "Course published."
          : "Course moved back to draft."
      );
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not change the course status."
      );
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
          body: JSON.stringify({
            courseId: params.id,
            title: sectionDraft.title,
            description: sectionDraft.description || undefined
          })
        });
        setBuilderSuccess("Section created.");
      } else if (editorMode.kind === "section") {
        await apiFetch(`/sections/${editorMode.sectionId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            title: sectionDraft.title,
            description: sectionDraft.description || undefined
          })
        });
        setBuilderSuccess("Section updated.");
      }

      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : "Could not save the section."
      );
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
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not delete the section."
      );
    }
  }

  async function saveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      let lessonId: string | null = null;

      if (editorMode.kind === "new-lesson") {
        const createdLesson = await apiFetch<{ id: string }>("/lessons", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            sectionId: editorMode.sectionId,
            title: lessonDraft.title,
            type: lessonDraft.type,
            description: lessonDraft.description,
            content: lessonDraft.description
          })
        });
        lessonId = createdLesson.id;
        setBuilderSuccess("Lesson created.");
      } else if (editorMode.kind === "lesson") {
        await apiFetch(`/lessons/${editorMode.lessonId}`, {
          method: "PATCH",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            title: lessonDraft.title,
            type: lessonDraft.type,
            description: lessonDraft.description,
            content: lessonDraft.description
          })
        });
        lessonId = editorMode.lessonId;
        setBuilderSuccess("Lesson updated.");
      }

      if (lessonId && lessonMediaFile) {
        await uploadLessonMediaMutation.mutateAsync(lessonId);
      }

      await courseQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : "Could not save the lesson."
      );
    }
  }

  async function duplicateLesson() {
    if (!selectedLesson || !courseQuery.data) {
      return;
    }

    const parentSection = courseQuery.data.sections.find((section) =>
      section.lessons.some((lesson) => lesson.id === selectedLesson.id)
    );
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
          description: selectedLesson.description ?? selectedLesson.content ?? "",
          content: selectedLesson.description ?? selectedLesson.content ?? ""
        })
      });
      setBuilderSuccess("Lesson duplicated.");
      await courseQuery.refetch();
    } catch (error) {
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not duplicate the lesson."
      );
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
      setBuilderError(
        error instanceof Error ? error.message : "Could not delete the lesson."
      );
    }
  }

  function normaliseQuizQuestions() {
    return quizDraft.questions.map((question) => {
      const options = question.options.map((option) => option.trim()).filter(Boolean);
      const correctAnswer = options[question.correctOptionIndex] ?? "";

      return {
        question: question.question,
        options,
        correctAnswer
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
      if (questions.some((question) => !question.correctAnswer)) {
        setBuilderError("Mark one correct answer for every question.");
        return;
      }

      const scopePayload = normalizeScopePayload(
        quizDraft.scopeType,
        quizDraft.sectionId,
        quizDraft.lessonId
      );

      if (editorMode.kind === "new-quiz") {
        await apiFetch("/assessments/quizzes", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            courseId: params.id,
            title: quizDraft.title,
            description: quizDraft.description || undefined,
            questions,
            ...scopePayload
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
            questions,
            ...scopePayload
          })
        });
        setBuilderSuccess("Quiz updated.");
      }

      await assessmentsQuery.refetch();
      await quizSubmissionsQuery.refetch();
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : "Could not save the quiz."
      );
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
      await quizSubmissionsQuery.refetch();
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : "Could not delete the quiz."
      );
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      const scopePayload = normalizeScopePayload(
        assignmentDraft.scopeType,
        assignmentDraft.sectionId,
        assignmentDraft.lessonId
      );

      if (editorMode.kind === "new-assignment") {
        await apiFetch("/assessments/assignments", {
          method: "POST",
          token: accessToken ?? undefined,
          body: JSON.stringify({
            courseId: params.id,
            title: assignmentDraft.title,
            description: assignmentDraft.description || undefined,
            instructions: assignmentDraft.instructions || undefined,
            ...scopePayload
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
            instructions: assignmentDraft.instructions || undefined,
            ...scopePayload
          })
        });
        setBuilderSuccess("Assignment updated.");
      }

      await Promise.all([
        assessmentsQuery.refetch(),
        assignmentSubmissionsQuery.refetch()
      ]);
      setEditorMode({ kind: "course" });
    } catch (error) {
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not save the assignment."
      );
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
      await Promise.all([
        assessmentsQuery.refetch(),
        assignmentSubmissionsQuery.refetch()
      ]);
      setEditorMode({ kind: "course" });
      setConfirmDeleteKey(null);
    } catch (error) {
      setBuilderError(
        error instanceof Error
          ? error.message
          : "Could not delete the assignment."
      );
    }
  }

  async function reorderSections(sourceId: string, targetId: string) {
    if (!courseQuery.data || sourceId === targetId) {
      return;
    }

    const sourceIndex = courseQuery.data.sections.findIndex(
      (section) => section.id === sourceId
    );
    const targetIndex = courseQuery.data.sections.findIndex(
      (section) => section.id === targetId
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = moveItem(courseQuery.data.sections, sourceIndex, targetIndex);
    await apiFetch("/sections/reorder", {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        courseId: params.id,
        items: reordered.map((section, index) => ({
          id: section.id,
          order: index + 1
        }))
      })
    });
    await courseQuery.refetch();
  }

  async function reorderLessons(
    sectionId: string,
    sourceLessonId: string,
    targetLessonId: string
  ) {
    const section = courseQuery.data?.sections.find((item) => item.id === sectionId);
    if (!section || sourceLessonId === targetLessonId) {
      return;
    }

    const sourceIndex = section.lessons.findIndex(
      (lesson) => lesson.id === sourceLessonId
    );
    const targetIndex = section.lessons.findIndex(
      (lesson) => lesson.id === targetLessonId
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const reordered = moveItem(section.lessons, sourceIndex, targetIndex);
    await apiFetch("/lessons/reorder", {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({
        sectionId,
        items: reordered.map((lesson, index) => ({
          id: lesson.id,
          order: index + 1
        }))
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

  async function onConfirmDelete() {
    if (!confirmDeleteKey) {
      return;
    }

    const [entity, entityId] = confirmDeleteKey.split(":");
    if (entity === "section") {
      await deleteSection(entityId);
    } else if (entity === "lesson") {
      await deleteLesson(entityId);
    } else if (entity === "quiz") {
      await deleteQuiz(entityId);
    } else if (entity === "assignment") {
      await deleteAssignment(entityId);
    }
  }

  const outlineSections = courseQuery.data?.sections ?? [];
  const lessonsCount = outlineSections.reduce(
    (total, section) => total + section.lessons.length,
    0
  );
  const quizzesCount = assessmentsQuery.data?.quizzes.length ?? 0;
  const assignmentsCount = assessmentsQuery.data?.assignments.length ?? 0;

  return {
    params,
    accessToken,
    hasHydrated,
    isAuthorized,
    editorMode,
    setEditorMode,
    utilityTab,
    setUtilityTab,
    courseDraft,
    setCourseDraft,
    sectionDraft,
    setSectionDraft,
    lessonDraft,
    setLessonDraft,
    quizDraft,
    setQuizDraft,
    assignmentDraft,
    setAssignmentDraft,
    reviewState,
    setReviewState,
    thumbnailFile,
    setThumbnailFile,
    thumbnailPreviewUrl,
    lessonMediaFile,
    setLessonMediaFile,
    builderError,
    setBuilderError,
    builderSuccess,
    setBuilderSuccess,
    confirmDeleteKey,
    setConfirmDeleteKey,
    draggingSectionId,
    setDraggingSectionId,
    draggingLesson,
    setDraggingLesson,
    courseQuery,
    assessmentsQuery,
    learnersQuery,
    assignmentSubmissionsQuery,
    quizSubmissionsQuery,
    securityEventsQuery,
    reviewMutation,
    uploadThumbnailMutation,
    uploadLessonMediaMutation,
    selectedSection,
    selectedLesson,
    selectedQuiz,
    selectedAssignment,
    refreshAll,
    saveCourse,
    toggleStatus,
    saveSection,
    saveLesson,
    duplicateLesson,
    saveQuiz,
    saveAssignment,
    reorderSections,
    reorderLessons,
    submitReview,
    onConfirmDelete,
    outlineSections,
    lessonsCount,
    quizzesCount,
    assignmentsCount
  };
}
