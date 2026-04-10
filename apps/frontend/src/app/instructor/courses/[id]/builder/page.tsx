"use client";

import Link from "next/link";
import { useState } from "react";

import { BackButton } from "../../../../../components/back-button";
import { ConfirmationModal } from "../../../../../components/confirmation-modal";
import {
  EmptyState,
  PillButton,
  StatPill,
  WorkspacePanel
} from "../../../../../components/course-workspace";
import { StatusBanner } from "../../../../../components/status-banner";
import { StatusChip } from "../../../../../components/status-chip";

import type {
  AssessmentScopeType,
  AssignmentSubmissionGroup,
  Course,
  Lesson,
  QuizDraft,
  QuizSubmissionGroup
} from "./_components/course-builder-types";
import { formatBuilderDate } from "./_components/course-builder-types";
import { useCourseBuilderWorkspace } from "./_hooks/use-course-builder-workspace";

type BuilderTab = "course" | "sections" | "lessons" | "quizzes" | "assignments" | "learners";
type AssessmentViewTab = "authoring" | "submissions";

function buildScopeOptions(course: Course | undefined) {
  if (!course) {
    return [];
  }

  return course.sections.map((section) => ({
    id: section.id,
    label: `${section.order}. ${section.title}`,
    lessons: section.lessons.map((lesson) => ({
      id: lesson.id,
      label: `${section.order}.${lesson.order} ${lesson.title}`
    }))
  }));
}

function getScopeCopy(scopeType: AssessmentScopeType) {
  if (scopeType === "LESSON") {
    return "This assessment unlocks after the learner completes the selected lesson.";
  }

  if (scopeType === "SECTION") {
    return "This assessment unlocks after the learner completes every lesson in the selected section.";
  }

  return "This assessment unlocks only after the learner finishes the whole course.";
}

function updateQuizQuestion(
  questions: QuizDraft["questions"],
  index: number,
  updater: (question: QuizDraft["questions"][number]) => QuizDraft["questions"][number]
) {
  return questions.map((question, questionIndex) =>
    questionIndex === index ? updater(question) : question
  );
}

function resetScopeState(
  scopeType: AssessmentScopeType,
  sections: ReturnType<typeof buildScopeOptions>
) {
  const firstSection = sections[0];
  const firstLesson = firstSection?.lessons[0];

  return {
    scopeType,
    sectionId: scopeType === "COURSE" ? "" : firstSection?.id ?? "",
    lessonId: scopeType === "LESSON" ? firstLesson?.id ?? "" : ""
  };
}

function deriveActiveTab(builder: ReturnType<typeof useCourseBuilderWorkspace>): BuilderTab {
  if (builder.utilityTab === "learners" || builder.utilityTab === "submissions") {
    return "learners";
  }

  if (builder.editorMode.kind === "new-assignment" || builder.editorMode.kind === "assignment") {
    return "assignments";
  }

  if (builder.editorMode.kind === "new-quiz" || builder.editorMode.kind === "quiz") {
    return "quizzes";
  }

  if (builder.editorMode.kind === "new-lesson" || builder.editorMode.kind === "lesson") {
    return "lessons";
  }

  if (builder.editorMode.kind === "new-section" || builder.editorMode.kind === "section") {
    return "sections";
  }

  return "course";
}

function openBuilderTab(tab: BuilderTab, builder: ReturnType<typeof useCourseBuilderWorkspace>) {
  if (tab === "course") {
    builder.setUtilityTab("assessments");
    builder.setEditorMode({ kind: "course" });
    return;
  }

  if (tab === "sections") {
    builder.setUtilityTab("assessments");
    builder.setEditorMode(
      builder.selectedSection
        ? { kind: "section", sectionId: builder.selectedSection?.id ?? "" }
        : builder.outlineSections[0]
          ? { kind: "section", sectionId: builder.outlineSections[0].id }
          : { kind: "new-section" }
    );
    return;
  }

  if (tab === "lessons") {
    builder.setUtilityTab("assessments");
    const firstLesson = builder.outlineSections[0]?.lessons[0];
    if (builder.selectedLesson) {
      builder.setEditorMode({ kind: "lesson", lessonId: builder.selectedLesson?.id ?? "" });
    } else if (firstLesson) {
      builder.setEditorMode({ kind: "lesson", lessonId: firstLesson.id });
    } else if (builder.outlineSections[0]) {
      builder.setEditorMode({ kind: "new-lesson", sectionId: builder.outlineSections[0].id });
    } else {
      builder.setEditorMode({ kind: "new-section" });
    }
    return;
  }

  if (tab === "quizzes") {
    builder.setUtilityTab("assessments");
    builder.setEditorMode(
      builder.selectedQuiz
        ? { kind: "quiz", quizId: builder.selectedQuiz?.id ?? "" }
        : builder.assessmentsQuery.data?.quizzes[0]
          ? { kind: "quiz", quizId: builder.assessmentsQuery.data.quizzes[0].id }
          : { kind: "new-quiz" }
    );
    return;
  }

  if (tab === "assignments") {
    builder.setUtilityTab("assessments");
    builder.setEditorMode(
      builder.selectedAssignment
        ? { kind: "assignment", assignmentId: builder.selectedAssignment?.id ?? "" }
        : builder.assessmentsQuery.data?.assignments[0]
          ? { kind: "assignment", assignmentId: builder.assessmentsQuery.data.assignments[0].id }
          : { kind: "new-assignment" }
    );
    return;
  }

  builder.setEditorMode({ kind: "course" });
  builder.setUtilityTab("learners");
}

function renderAnswerPreview(
  group: QuizSubmissionGroup,
  submission: QuizSubmissionGroup["submissions"][number]
) {
  if (!Array.isArray(submission.answers)) {
    return <p className="text-sm text-slate-500">Answer format not available.</p>;
  }

  return (
    <div className="space-y-3">
      {group.questions.map((question, index) => {
        const answers = submission.answers as unknown[];
        const studentAnswer = answers[index];
        const isCorrect = studentAnswer === question.correctAnswer;

        return (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {index + 1}. {question.question}
            </p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Student: {String(studentAnswer ?? "No answer")}
              </span>
              <span className={`rounded-full px-3 py-1 ${isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                Correct: {question.correctAnswer}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CourseBuilderPage() {
  const builder = useCourseBuilderWorkspace();
  const scopeOptions = buildScopeOptions(builder.courseQuery.data);
  const selectedLessonMedia = builder.selectedLesson as Lesson | null;
  const activeTab = deriveActiveTab(builder);
  const [quizViewTab, setQuizViewTab] = useState<AssessmentViewTab>("authoring");
  const [assignmentViewTab, setAssignmentViewTab] = useState<AssessmentViewTab>("authoring");
  const tabItems: Array<{ id: BuilderTab; label: string; hint: string }> = [
    { id: "course", label: "Course", hint: "Basics" },
    { id: "sections", label: "Sections", hint: "Outline" },
    { id: "lessons", label: "Lessons", hint: "Content" },
    { id: "quizzes", label: "Quizzes", hint: "Checks" },
    { id: "assignments", label: "Assignments", hint: "Work" },
    { id: "learners", label: "Learners", hint: "Progress" }
  ];

  const renderCourseTab = () => (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <WorkspacePanel title="Course media" description="Keep the thumbnail and top-level course identity in one clean place.">
        <div className="space-y-4">
          <div className="h-52 overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
            {builder.thumbnailPreviewUrl ? (
              <img src={builder.thumbnailPreviewUrl} alt={`${builder.courseQuery.data?.title ?? "Course"} thumbnail`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => builder.setThumbnailFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
          <div className="flex flex-wrap gap-2">
            <PillButton type="button" onClick={() => void builder.uploadThumbnailMutation.mutateAsync()} disabled={!builder.thumbnailFile || builder.uploadThumbnailMutation.isPending}>
              {builder.uploadThumbnailMutation.isPending ? "Uploading..." : "Upload thumbnail"}
            </PillButton>
            {builder.thumbnailFile ? <PillButton type="button" onClick={() => builder.setThumbnailFile(null)}>Clear</PillButton> : null}
          </div>
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Course info" description="This tab is only for the course itself: title, promise, level, pricing, and publish state.">
        <form onSubmit={(event) => { event.preventDefault(); void builder.saveCourse(); }} className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatPill label="Status" value={builder.courseQuery.data?.status ?? "Draft"} tone={builder.courseQuery.data?.status === "PUBLISHED" ? "success" : "warning"} />
            <StatPill label="Pricing" value={builder.courseQuery.data?.isPaid ? `${Number(builder.courseQuery.data?.price ?? 0).toFixed(2)}` : "Free"} tone="info" />
            <StatPill label="Sections" value={String(builder.outlineSections.length)} tone="default" />
            <StatPill label="Lessons" value={String(builder.lessonsCount)} tone="default" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Course title</span>
              <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.title} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, title: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Category</span>
              <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.category} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Web development, design, productivity..." />
            </label>
          </div>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Course description</span>
            <textarea className="min-h-36 rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.description} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Level</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.level} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, level: (event.target.value as Course["level"]) ?? "BEGINNER" }))}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Pricing mode</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.isPaid ? "PAID" : "FREE"} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, isPaid: event.target.value === "PAID", price: event.target.value === "PAID" ? current.price : "" }))}><option value="FREE">Free</option><option value="PAID">Paid</option></select></label>
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Price</span><input className="rounded-2xl border border-slate-300 px-3 py-2" type="number" min={0.01} step="0.01" disabled={!builder.courseDraft.isPaid} value={builder.courseDraft.price} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, price: event.target.value }))} /></label>
          </div>
          <div className="flex flex-wrap gap-2"><PillButton type="submit">Save course info</PillButton><PillButton type="button" onClick={() => void builder.toggleStatus()}>{builder.courseQuery.data?.status === "PUBLISHED" ? "Move to draft" : "Publish course"}</PillButton></div>
        </form>
      </WorkspacePanel>
    </div>
  );

  const renderSectionsTab = () => (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <WorkspacePanel title="Sections" description="Only the course structure lives here. Create, edit, and reorder sections without the extra builder clutter." actions={<PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-section" })}>Add section</PillButton>}>
        <div className="space-y-3">
          {builder.outlineSections.length ? builder.outlineSections.map((section) => (
            <button key={section.id} type="button" draggable onDragStart={() => builder.setDraggingSectionId(section.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (builder.draggingSectionId) { void builder.reorderSections(builder.draggingSectionId, section.id); } builder.setDraggingSectionId(null); }} onClick={() => builder.setEditorMode({ kind: "section", sectionId: section.id })} className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${builder.editorMode.kind === "section" && builder.editorMode.sectionId === section.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">Section {section.order}</p><p className="mt-2 text-base font-semibold">{section.title}</p><p className="mt-2 text-sm leading-6 opacity-80">{section.description?.trim() || "Add section details so learners understand the purpose of this block."}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{section.lessons.length} lessons</span></div>
            </button>
          )) : <EmptyState title="No sections yet" description="Create the first section to start building the course outline." action={<PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-section" })}>Create section</PillButton>} />}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title={builder.editorMode.kind === "new-section" ? "Create section" : builder.editorMode.kind === "section" ? "Edit section" : "Section editor"} description="Each section should have a strong title and a short explanation learners will see on the course page.">
        {builder.editorMode.kind === "new-section" || builder.editorMode.kind === "section" ? (
          <form onSubmit={builder.saveSection} className="grid gap-4">
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Section title</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.sectionDraft.title} onChange={(event) => builder.setSectionDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Section details</span><textarea className="min-h-40 rounded-2xl border border-slate-300 px-3 py-2" value={builder.sectionDraft.description} onChange={(event) => builder.setSectionDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Explain the focus of this section. Students will see this on the course page." /></label>
            <div className="flex flex-wrap gap-2"><PillButton type="submit">{builder.editorMode.kind === "new-section" ? "Create section" : "Save section"}</PillButton>{builder.editorMode.kind === "section" && builder.selectedSection ? <PillButton type="button" onClick={() => builder.setConfirmDeleteKey(`section:${builder.selectedSection?.id ?? ""}`)}>Delete section</PillButton> : null}</div>
          </form>
        ) : <EmptyState title="Select a section" description="Choose a section from the left or create a new one to edit its details here." />}
      </WorkspacePanel>
    </div>
  );

  const renderLessonsTab = () => (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <WorkspacePanel title="Lessons" description="This tab is only for lesson order, written content, and uploaded media.">
        <div className="space-y-4">
          {builder.outlineSections.length ? builder.outlineSections.map((section) => (
            <div key={section.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Section {section.order}</p><p className="mt-1 text-base font-semibold text-slate-900">{section.title}</p></div><PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-lesson", sectionId: section.id })}>Add lesson</PillButton></div>
              <div className="mt-3 space-y-2">
                {section.lessons.length ? section.lessons.map((lesson) => (
                  <button key={lesson.id} type="button" draggable onDragStart={() => builder.setDraggingLesson({ sectionId: section.id, lessonId: lesson.id })} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (builder.draggingLesson && builder.draggingLesson.sectionId === section.id) { void builder.reorderLessons(section.id, builder.draggingLesson.lessonId, lesson.id); } builder.setDraggingLesson(null); }} onClick={() => builder.setEditorMode({ kind: "lesson", lessonId: lesson.id })} className={`w-full rounded-2xl border px-4 py-3 text-left transition ${builder.editorMode.kind === "lesson" && builder.editorMode.lessonId === lesson.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold">{lesson.title}</p><p className="mt-1 text-[11px] uppercase tracking-[0.18em] opacity-70">{lesson.type === "TEXT" ? "Text lesson" : lesson.type === "VIDEO" ? "Video lesson" : "PDF lesson"}</p><p className="mt-2 line-clamp-2 text-xs leading-5 opacity-80">{lesson.description?.trim() || "Add written lesson guidance and one uploaded media file."}</p></div><span className="text-xs font-semibold opacity-70">{lesson.order}</span></div>
                  </button>
                )) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600">No lessons in this section yet.</div>}
              </div>
            </div>
          )) : <EmptyState title="No sections yet" description="Create a section first, then you can add and arrange lessons here." />}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title={builder.editorMode.kind === "new-lesson" ? `Add lesson${builder.selectedSection ? ` to ${builder.selectedSection.title}` : ""}` : builder.editorMode.kind === "lesson" ? "Edit lesson" : "Lesson editor"} description="Every lesson has written content and optionally one uploaded media item from the device.">
        {builder.editorMode.kind === "new-lesson" || builder.editorMode.kind === "lesson" ? (
          <form onSubmit={builder.saveLesson} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Lesson title</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.title} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Media type</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.type} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, type: event.target.value as Lesson["type"] }))}><option value="TEXT">Text only</option><option value="VIDEO">Video upload</option><option value="FILE">PDF upload</option></select></label>
            </div>
            <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Written lesson content</span><textarea className="min-h-44 rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.description} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, description: event.target.value }))} required /></label>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">Lesson media</p><p className="mt-1 text-sm text-slate-600">Upload one browser-viewable file from the device. Video, PDF, image, audio, and text files can now render directly inside the course page.</p></div>{selectedLessonMedia?.mediaFileName ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Current: {selectedLessonMedia.mediaFileName}</span> : null}</div>
              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><input type="file" accept={builder.lessonDraft.type === "VIDEO" ? "video/mp4,video/webm,video/quicktime" : builder.lessonDraft.type === "FILE" ? "application/pdf,.pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,audio/mpeg,audio/mp3,audio/wav,audio/ogg,text/plain,.txt" : "video/mp4,video/webm,video/quicktime,application/pdf,.pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,audio/mpeg,audio/mp3,audio/wav,audio/ogg,text/plain,.txt"} onChange={(event) => builder.setLessonMediaFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />{builder.lessonMediaFile ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">Ready: {builder.lessonMediaFile.name}</div> : null}</div>
              {selectedLessonMedia?.hasProtectedMedia ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"><p className="font-medium text-slate-900">Existing uploaded media</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">{selectedLessonMedia.mediaFileName ?? "Protected lesson media ready"}</span><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{selectedLessonMedia.mediaContentType ?? "Uploaded media"}</span></div><p className="mt-3 text-xs leading-5 text-slate-500">Learners will view this media inline inside the course page through a protected viewer instead of an external open button.</p></div> : null}
            </div>
            <div className="flex flex-wrap gap-2"><PillButton type="submit">{builder.editorMode.kind === "new-lesson" ? "Create lesson" : "Save lesson"}</PillButton>{builder.editorMode.kind === "lesson" ? <PillButton type="button" onClick={() => void builder.duplicateLesson()}>Duplicate lesson</PillButton> : null}{builder.editorMode.kind === "lesson" && builder.selectedLesson ? <PillButton type="button" onClick={() => builder.setConfirmDeleteKey(`lesson:${builder.selectedLesson?.id ?? ""}`)}>Delete lesson</PillButton> : null}</div>
          </form>
        ) : <EmptyState title="Select a lesson" description="Choose a lesson from the left or add a new one to edit written content and media here." />}
      </WorkspacePanel>
    </div>
  );

  const renderQuizForm = () => (
    <form onSubmit={builder.saveQuiz} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Quiz title</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.title} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
        <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Scope</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.scopeType} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, ...resetScopeState(event.target.value as AssessmentScopeType, scopeOptions) }))}><option value="COURSE">Course</option><option value="SECTION">Section</option><option value="LESSON">Lesson</option></select></label>
      </div>
      <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Description</span><textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.description} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, description: event.target.value }))} /></label>
      {builder.quizDraft.scopeType !== "COURSE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Section</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.sectionId} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, sectionId: event.target.value, lessonId: current.scopeType === "LESSON" ? scopeOptions.find((section) => section.id === event.target.value)?.lessons[0]?.id ?? "" : "" }))}>{scopeOptions.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
          {builder.quizDraft.scopeType === "LESSON" ? <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Lesson</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.lessonId} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, lessonId: event.target.value }))}>{(scopeOptions.find((section) => section.id === builder.quizDraft.sectionId)?.lessons ?? []).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}</select></label> : null}
        </div>
      ) : null}
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{getScopeCopy(builder.quizDraft.scopeType)}</div>
      <div className="space-y-4">
        {builder.quizDraft.questions.map((question, questionIndex) => (
          <div key={questionIndex} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-slate-900">Question {questionIndex + 1}</p>{builder.quizDraft.questions.length > 1 ? <PillButton type="button" onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: current.questions.filter((_, index) => index !== questionIndex) }))}>Remove</PillButton> : null}</div>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Question prompt</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={question.question} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: updateQuizQuestion(current.questions, questionIndex, (currentQuestion) => ({ ...currentQuestion, question: event.target.value })) }))} required /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <label key={optionIndex} className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Answer {optionIndex + 1}</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={option} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: updateQuizQuestion(current.questions, questionIndex, (currentQuestion) => ({ ...currentQuestion, options: currentQuestion.options.map((item, index) => index === optionIndex ? event.target.value : item) })) }))} required /></label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2"><PillButton type="button" onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: updateQuizQuestion(current.questions, questionIndex, (currentQuestion) => ({ ...currentQuestion, options: [...currentQuestion.options, ""] })) }))}>Add answer field</PillButton>{question.options.length > 2 ? <PillButton type="button" onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: updateQuizQuestion(current.questions, questionIndex, (currentQuestion) => ({ ...currentQuestion, options: currentQuestion.options.slice(0, -1), correctOptionIndex: Math.min(currentQuestion.correctOptionIndex, currentQuestion.options.length - 2) })) }))}>Remove last answer</PillButton> : null}</div>
              <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Correct answer</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={question.correctOptionIndex} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: updateQuizQuestion(current.questions, questionIndex, (currentQuestion) => ({ ...currentQuestion, correctOptionIndex: Number(event.target.value) })) }))}>{question.options.map((option, optionIndex) => <option key={optionIndex} value={optionIndex}>{option.trim() || `Answer ${optionIndex + 1}`}</option>)}</select></label>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2"><PillButton type="button" onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: [...current.questions, { question: "", options: ["", ""], correctOptionIndex: 0 }] }))}>Add question</PillButton><PillButton type="submit">{builder.editorMode.kind === "new-quiz" ? "Create quiz" : "Save quiz"}</PillButton>{builder.editorMode.kind === "quiz" && builder.selectedQuiz ? <PillButton type="button" onClick={() => builder.setConfirmDeleteKey(`quiz:${builder.selectedQuiz?.id ?? ""}`)}>Delete quiz</PillButton> : null}</div>
    </form>
  );

  const renderQuizzesTab = () => (
    <WorkspacePanel
      title="Quizzes"
      description="Switch between quiz authoring and student answers without carrying both views on the screen at once."
      actions={
        <div className="flex flex-wrap gap-2">
          <PillButton
            type="button"
            active={quizViewTab === "authoring"}
            onClick={() => setQuizViewTab("authoring")}
          >
            Authoring
          </PillButton>
          <PillButton
            type="button"
            active={quizViewTab === "submissions"}
            onClick={() => setQuizViewTab("submissions")}
          >
            Student answers
          </PillButton>
        </div>
      }
    >
      {quizViewTab === "authoring" ? (
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Quiz list</p>
              <PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-quiz" })}>
                New quiz
              </PillButton>
            </div>
            {(builder.assessmentsQuery.data?.quizzes ?? []).length ? (
              (builder.assessmentsQuery.data?.quizzes ?? []).map((quiz) => (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() => builder.setEditorMode({ kind: "quiz", quizId: quiz.id })}
                  className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                    builder.editorMode.kind === "quiz" && builder.editorMode.quizId === quiz.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{quiz.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">{quiz.scopeLabel}</p>
                  <p className="mt-2 text-xs opacity-80">{quiz.questions.length} questions</p>
                </button>
              ))
            ) : (
              <EmptyState
                title="No quizzes yet"
                description="Create the first quiz for a lesson, section, or the whole course."
                action={
                  <PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-quiz" })}>
                    Create quiz
                  </PillButton>
                }
              />
            )}
          </div>
          <div>
            {builder.editorMode.kind === "new-quiz" || builder.editorMode.kind === "quiz" ? (
              renderQuizForm()
            ) : (
              <EmptyState
                title="Select a quiz"
                description="Choose a quiz from the left or create a new one to edit it here."
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {builder.quizSubmissionsQuery.isLoading ? <StatusBanner>Loading quiz submissions...</StatusBanner> : null}
          {(builder.quizSubmissionsQuery.data ?? []).length ? (
            (builder.quizSubmissionsQuery.data ?? []).map((group) => (
              <div key={group.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{group.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{group.scopeLabel}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {group.submissions.length} submissions
                  </span>
                </div>
                {group.submissions.length ? (
                  <div className="mt-4 space-y-4">
                    {group.submissions.map((submission) => (
                      <div key={submission.id} className="rounded-[22px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{submission.student.fullName}</p>
                            <p className="mt-1 text-xs text-slate-500">{submission.student.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                              Score {submission.score}/{submission.totalQuestions}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                              {formatBuilderDate(submission.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4">{renderAnswerPreview(group, submission)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No student answers yet.</p>
                )}
              </div>
            ))
          ) : builder.quizSubmissionsQuery.isLoading ? null : (
            <EmptyState
              title="No quiz submissions yet"
              description="Student answers will appear here as soon as learners complete quizzes."
            />
          )}
        </div>
      )}
    </WorkspacePanel>
  );

  const renderAssignmentForm = () => (
    <form onSubmit={builder.saveAssignment} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Assignment title</span><input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.title} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, title: event.target.value }))} required /></label>
        <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Scope</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.scopeType} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, ...resetScopeState(event.target.value as AssessmentScopeType, scopeOptions) }))}><option value="COURSE">Course</option><option value="SECTION">Section</option><option value="LESSON">Lesson</option></select></label>
      </div>
      <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Description</span><textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.description} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, description: event.target.value }))} /></label>
      <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Instructions</span><textarea className="min-h-40 rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.instructions} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, instructions: event.target.value }))} /></label>
      {builder.assignmentDraft.scopeType !== "COURSE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Section</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.sectionId} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, sectionId: event.target.value, lessonId: current.scopeType === "LESSON" ? scopeOptions.find((section) => section.id === event.target.value)?.lessons[0]?.id ?? "" : "" }))}>{scopeOptions.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>
          {builder.assignmentDraft.scopeType === "LESSON" ? <label className="grid gap-2 text-sm text-slate-700"><span className="font-medium text-slate-900">Lesson</span><select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.lessonId} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, lessonId: event.target.value }))}>{(scopeOptions.find((section) => section.id === builder.assignmentDraft.sectionId)?.lessons ?? []).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.label}</option>)}</select></label> : null}
        </div>
      ) : null}
      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">{getScopeCopy(builder.assignmentDraft.scopeType)}</div>
      <div className="flex flex-wrap gap-2"><PillButton type="submit">{builder.editorMode.kind === "new-assignment" ? "Create assignment" : "Save assignment"}</PillButton>{builder.editorMode.kind === "assignment" && builder.selectedAssignment ? <PillButton type="button" onClick={() => builder.setConfirmDeleteKey(`assignment:${builder.selectedAssignment?.id ?? ""}`)}>Delete assignment</PillButton> : null}</div>
    </form>
  );

  const renderAssignmentReview = (group: AssignmentSubmissionGroup) => (
    <div key={group.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-base font-semibold text-slate-900">{group.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{group.scopeLabel}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{group.submissions.length} submissions</span></div>
      {group.submissions.length ? <div className="mt-4 space-y-4">{group.submissions.map((submission) => (<div key={submission.id} className="rounded-[22px] border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{submission.student.fullName}</p><p className="mt-1 text-xs text-slate-500">{submission.student.email}</p></div><div className="flex flex-wrap gap-2 text-xs"><span className={`rounded-full px-3 py-1 font-semibold ${submission.status === "REVIEWED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{submission.status === "REVIEWED" ? "Reviewed" : "Pending review"}</span><span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{formatBuilderDate(submission.updatedAt)}</span></div></div><div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{submission.content}</div><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"><textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" placeholder="Feedback for the learner" value={builder.reviewState[submission.id]?.feedback ?? submission.feedback ?? ""} onChange={(event) => builder.setReviewState((current) => ({ ...current, [submission.id]: { feedback: event.target.value, score: current[submission.id]?.score ?? (submission.score?.toString() ?? "") } }))} /><input className="rounded-2xl border border-slate-300 px-3 py-2" type="number" min={0} max={100} step="0.1" placeholder="Score" value={builder.reviewState[submission.id]?.score ?? submission.score?.toString() ?? ""} onChange={(event) => builder.setReviewState((current) => ({ ...current, [submission.id]: { feedback: current[submission.id]?.feedback ?? submission.feedback ?? "", score: event.target.value } }))} /><PillButton type="button" onClick={() => void builder.submitReview(group.id, submission.id)} disabled={builder.reviewMutation.isPending}>Save review</PillButton></div></div>))}</div> : <p className="mt-4 text-sm text-slate-500">No student submissions yet.</p>}
    </div>
  );

  const renderAssignmentsTab = () => (
    <WorkspacePanel
      title="Assignments"
      description="Switch between assignment authoring and student submissions without overloading the screen."
      actions={
        <div className="flex flex-wrap gap-2">
          <PillButton
            type="button"
            active={assignmentViewTab === "authoring"}
            onClick={() => setAssignmentViewTab("authoring")}
          >
            Authoring
          </PillButton>
          <PillButton
            type="button"
            active={assignmentViewTab === "submissions"}
            onClick={() => setAssignmentViewTab("submissions")}
          >
            Student answers
          </PillButton>
        </div>
      }
    >
      {assignmentViewTab === "authoring" ? (
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Assignment list</p>
              <PillButton
                type="button"
                onClick={() => builder.setEditorMode({ kind: "new-assignment" })}
              >
                New assignment
              </PillButton>
            </div>
            {(builder.assessmentsQuery.data?.assignments ?? []).length ? (
              (builder.assessmentsQuery.data?.assignments ?? []).map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => builder.setEditorMode({ kind: "assignment", assignmentId: assignment.id })}
                  className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                    builder.editorMode.kind === "assignment" &&
                    builder.editorMode.assignmentId === assignment.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{assignment.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">{assignment.scopeLabel}</p>
                </button>
              ))
            ) : (
              <EmptyState
                title="No assignments yet"
                description="Create the first assignment for a lesson, section, or the full course."
                action={
                  <PillButton type="button" onClick={() => builder.setEditorMode({ kind: "new-assignment" })}>
                    Create assignment
                  </PillButton>
                }
              />
            )}
          </div>
          <div>
            {builder.editorMode.kind === "new-assignment" || builder.editorMode.kind === "assignment" ? (
              renderAssignmentForm()
            ) : (
              <EmptyState
                title="Select an assignment"
                description="Choose an assignment from the left or create a new one to edit it here."
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {builder.assignmentSubmissionsQuery.isLoading ? <StatusBanner>Loading assignment submissions...</StatusBanner> : null}
          {(builder.assignmentSubmissionsQuery.data ?? []).length ? (
            (builder.assignmentSubmissionsQuery.data ?? []).map(renderAssignmentReview)
          ) : builder.assignmentSubmissionsQuery.isLoading ? null : (
            <EmptyState
              title="No assignment submissions yet"
              description="Student work will appear here as soon as learners submit assignments."
            />
          )}
        </div>
      )}
    </WorkspacePanel>
  );

  const renderLearnersTab = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <WorkspacePanel title="Learner progress" description="This tab is dedicated to student progress, completion, and certificate readiness.">
        <div className="space-y-4">
          {(builder.learnersQuery.data ?? []).length ? (builder.learnersQuery.data ?? []).map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-base font-semibold text-slate-900">{entry.learner.fullName}</p><p className="mt-1 text-sm text-slate-500">{entry.learner.email}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">{entry.progress.percentage}% complete</span>{entry.certificate ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Certificate issued</span> : null}</div></div>
              <div className="mt-4 grid gap-3 md:grid-cols-4"><StatPill label="Completed lessons" value={`${entry.progress.completedLessons}/${entry.progress.totalLessons}`} tone="default" /><StatPill label="Quizzes" value={`${entry.assessments.quizzesCompleted}/${entry.assessments.quizzesTotal}`} tone="info" /><StatPill label="Assignments" value={`${entry.assessments.assignmentsSubmitted}/${entry.assessments.assignmentsTotal}`} tone="warning" /><StatPill label="Joined" value={formatBuilderDate(entry.enrolledAt)} tone="success" /></div>
            </div>
          )) : <EmptyState title="No learners yet" description="Learner progress will appear here once students enroll in this course." />}
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Security activity" description="Recent protected-content events for this course. This view is audit-focused and helps you spot suspicious viewer behavior quickly.">
        {builder.securityEventsQuery.isLoading ? (
          <StatusBanner>Loading security activity...</StatusBanner>
        ) : (builder.securityEventsQuery.data ?? []).length ? (
          <div className="space-y-3">
            {(builder.securityEventsQuery.data ?? []).map((event) => (
              <div key={event.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{event.user.fullName}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.user.email}</p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-800">
                    {event.eventType.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-800">{event.lesson.title}</p>
                <p className="mt-1 text-xs text-slate-500">{formatBuilderDate(event.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No security events yet" description="Protected viewer alerts will appear here if learners trigger suspicious-content signals." />
        )}
      </WorkspacePanel>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1700px] px-3 py-4 sm:px-5 sm:py-6 lg:p-8">
      <div className="surface-card-strong sticky top-2 z-20 mb-6 flex flex-col gap-4 rounded-[24px] p-4 sm:top-4 sm:rounded-[30px] sm:p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <BackButton fallbackHref="/instructor/courses" />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Course Builder</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Each tab now focuses on one job only, so instructors can move through course building without the old left-right clutter.</p>
          <div className="mt-4 flex flex-wrap gap-2"><StatusChip tone={builder.courseQuery.data?.status === "PUBLISHED" ? "success" : "warning"}>{builder.courseQuery.data?.status === "PUBLISHED" ? "Published" : "Draft"}</StatusChip><StatusChip tone={builder.builderError ? "danger" : builder.builderSuccess ? "success" : "info"}>{builder.builderError ? "Needs attention" : builder.builderSuccess ? "Changes saved" : "Builder ready"}</StatusChip></div>
        </div>
        <div className="flex flex-wrap gap-2"><PillButton type="button" onClick={() => void builder.refreshAll()}>Refresh workspace</PillButton><Link href={`/courses/${builder.params.id}`} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">Preview course</Link></div>
      </div>

      {builder.builderError ? <StatusBanner variant="error">{builder.builderError}</StatusBanner> : null}
      {builder.builderSuccess ? <div className="mt-3"><StatusBanner variant="success">{builder.builderSuccess}</StatusBanner></div> : null}
      {builder.courseQuery.isLoading ? <div className="mt-3"><StatusBanner>Loading the builder...</StatusBanner></div> : null}
      {builder.courseQuery.isError ? <div className="mt-3"><StatusBanner variant="error">Could not load this course builder.</StatusBanner></div> : null}
      <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm sm:rounded-[28px]"><div className="flex gap-0 overflow-x-auto px-2 py-2">{tabItems.map((tab) => { const isActive = activeTab === tab.id; return (<button key={tab.id} type="button" onClick={() => openBuilderTab(tab.id, builder)} className={`group relative min-w-[120px] flex-1 rounded-[18px] px-3 py-3 text-left transition sm:min-w-[140px] sm:rounded-[22px] sm:px-4 ${isActive ? "bg-slate-950 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">{tab.hint}</div><div className="mt-1 text-sm font-semibold">{tab.label}</div><div className={`mt-3 h-1 rounded-full transition ${isActive ? "bg-emerald-400" : "bg-slate-200 group-hover:bg-slate-300"}`} /></button>); })}</div></div>
      <div className="mt-6">{activeTab === "course" ? renderCourseTab() : null}{activeTab === "sections" ? renderSectionsTab() : null}{activeTab === "lessons" ? renderLessonsTab() : null}{activeTab === "quizzes" ? renderQuizzesTab() : null}{activeTab === "assignments" ? renderAssignmentsTab() : null}{activeTab === "learners" ? renderLearnersTab() : null}</div>
      <ConfirmationModal open={Boolean(builder.confirmDeleteKey)} title="Delete item" description="This action cannot be undone. The content and learner progress linked to it may be affected." confirmLabel="Delete" cancelLabel="Cancel" onConfirm={() => void builder.onConfirmDelete()} onCancel={() => builder.setConfirmDeleteKey(null)} />
    </main>
  );
}

