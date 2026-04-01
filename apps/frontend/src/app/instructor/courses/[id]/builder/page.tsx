"use client";

import Link from "next/link";

import { BackButton } from "../../../../../components/back-button";
import { ConfirmationModal } from "../../../../../components/confirmation-modal";
import {
  EmptyState,
  PillButton,
  StatPill,
  WorkspacePanel,
  WorkspaceShell
} from "../../../../../components/course-workspace";
import { StatusBanner } from "../../../../../components/status-banner";
import { StatusChip } from "../../../../../components/status-chip";

import { CourseBuilderUtilityRail } from "./_components/course-builder-utility-rail";
import { useCourseBuilderWorkspace } from "./_hooks/use-course-builder-workspace";

export default function CourseBuilderPage() {
  const builder = useCourseBuilderWorkspace();

  return (
    <main className="mx-auto max-w-[1700px] p-6 lg:p-8">
      <div className="surface-card-strong sticky top-4 z-20 mb-6 flex flex-col gap-4 rounded-[30px] p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <BackButton fallbackHref="/instructor/courses" />
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Course Builder</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Build the full learning journey here. Sections, lessons, quizzes, assignments, learner progress, and submissions now live inside one workspace instead of scattered prompt windows.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusChip tone={builder.courseQuery.data?.status === "PUBLISHED" ? "success" : "warning"}>
              {builder.courseQuery.data?.status === "PUBLISHED" ? "Published" : "Draft"}
            </StatusChip>
            <StatusChip tone={builder.builderError ? "danger" : builder.builderSuccess ? "success" : "info"}>
              {builder.builderError ? "Needs attention" : builder.builderSuccess ? "Changes saved" : "Workspace ready"}
            </StatusChip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PillButton onClick={() => void builder.refreshAll()}>Refresh workspace</PillButton>
          <Link
            href={`/courses/${builder.params.id}`}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
          >
            Preview course
          </Link>
          <PillButton onClick={() => void builder.toggleStatus()}>
            {builder.courseQuery.data?.status === "PUBLISHED" ? "Set draft" : "Publish course"}
          </PillButton>
        </div>
      </div>

      {builder.builderError ? <StatusBanner variant="error">{builder.builderError}</StatusBanner> : null}
      {builder.builderSuccess ? (
        <div className="mt-3">
          <StatusBanner variant="success">{builder.builderSuccess}</StatusBanner>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <StatPill label="Sections" value={String(builder.outlineSections.length)} tone="info" />
        <StatPill label="Lessons" value={String(builder.lessonsCount)} tone="default" />
        <StatPill label="Assessments" value={`${builder.quizzesCount + builder.assignmentsCount}`} tone="warning" />
        <StatPill label="Learners" value={String(builder.learnersQuery.data?.length ?? 0)} tone="success" />
      </div>

      <div className="mt-6">
        <WorkspaceShell
          sidebar={
            <WorkspacePanel
              title="Course outline"
              description="Drag to reorder. Click any item to open its editor."
              actions={<PillButton onClick={() => builder.setEditorMode({ kind: "new-section" })}>New section</PillButton>}
            >
              <form onSubmit={builder.handleCreateSection} className="mb-4 grid gap-2">
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Quick add section"
                  value={builder.sectionTitle}
                  onChange={(event) => builder.setSectionTitle(event.target.value)}
                  required
                />
                <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  Add section
                </button>
              </form>
              <div className="space-y-3">
                {builder.outlineSections.length ? (
                  builder.outlineSections.map((section) => (
                    <div
                      key={section.id}
                      draggable
                      onDragStart={() => builder.setDraggingSectionId(section.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => {
                        if (builder.draggingSectionId) {
                          void builder.reorderSections(builder.draggingSectionId, section.id);
                        }
                        builder.setDraggingSectionId(null);
                      }}
                      className={`rounded-3xl border p-3 transition ${
                        (builder.editorMode.kind === "section" && builder.editorMode.sectionId === section.id) ||
                        (builder.editorMode.kind === "new-lesson" && builder.editorMode.sectionId === section.id)
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => builder.setEditorMode({ kind: "section", sectionId: section.id })}
                          className="text-left"
                        >
                          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Section {section.order}</p>
                          <p className="mt-1 text-sm font-semibold">{section.title}</p>
                        </button>
                        <PillButton onClick={() => builder.setEditorMode({ kind: "new-lesson", sectionId: section.id })}>
                          Lesson
                        </PillButton>
                      </div>
                      <div className="mt-3 space-y-2">
                        {section.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            type="button"
                            draggable
                            onDragStart={() => builder.setDraggingLesson({ sectionId: section.id, lessonId: lesson.id })}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (builder.draggingLesson && builder.draggingLesson.sectionId === section.id) {
                                void builder.reorderLessons(section.id, builder.draggingLesson.lessonId, lesson.id);
                              }
                              builder.setDraggingLesson(null);
                            }}
                            onClick={() => builder.setEditorMode({ kind: "lesson", lessonId: lesson.id })}
                            className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                              builder.editorMode.kind === "lesson" && builder.editorMode.lessonId === lesson.id
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
              {builder.courseQuery.isLoading ? <StatusBanner>Loading the builder...</StatusBanner> : null}
              {builder.courseQuery.isError ? <StatusBanner variant="error">Could not load this course builder.</StatusBanner> : null}

              {builder.courseQuery.data ? (
                <WorkspacePanel
                  title={builder.courseQuery.data.title}
                  description={builder.courseQuery.data.description ?? "Build a sharper learning flow from here."}
                  actions={
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${builder.courseQuery.data.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {builder.courseQuery.data.status}
                      </span>
                      <PillButton active={builder.editorMode.kind === "course"} onClick={() => builder.setEditorMode({ kind: "course" })}>
                        Course details
                      </PillButton>
                    </div>
                  }
                >
                  <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <div className="space-y-4">
                      <div className="h-48 overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                        {builder.thumbnailPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={builder.thumbnailPreviewUrl} alt={`${builder.courseQuery.data.title} thumbnail`} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => builder.setThumbnailFile(event.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                      />
                      <div className="flex flex-wrap gap-2">
                        <PillButton onClick={() => void builder.uploadThumbnailMutation.mutateAsync()} disabled={!builder.thumbnailFile || builder.uploadThumbnailMutation.isPending}>
                          {builder.uploadThumbnailMutation.isPending ? "Uploading..." : "Upload thumbnail"}
                        </PillButton>
                        {builder.thumbnailFile ? <PillButton onClick={() => builder.setThumbnailFile(null)}>Clear</PillButton> : null}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <StatPill label="Status" value={builder.courseQuery.data.status} tone={builder.courseQuery.data.status === "PUBLISHED" ? "success" : "warning"} />
                      <StatPill label="Price" value={builder.courseQuery.data.isPaid ? `${Number(builder.courseQuery.data.price ?? 0).toFixed(2)}` : "Free"} tone="info" />
                      <StatPill label="Category" value={builder.courseQuery.data.category || "Not set"} tone="default" />
                      <StatPill label="Level" value={(builder.courseQuery.data.level ?? "BEGINNER").toLowerCase()} tone="default" />
                    </div>
                  </div>
                </WorkspacePanel>
              ) : null}

              {builder.editorMode.kind === "course" ? (
                <WorkspacePanel title="Course metadata" description="Edit the main course settings here, then publish from the workspace header.">
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void builder.saveCourse();
                    }}
                    className="grid gap-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
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
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-32 rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.description} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px]">
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Level</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.level} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, level: event.target.value as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" }))}>
                          <option value="BEGINNER">Beginner</option>
                          <option value="INTERMEDIATE">Intermediate</option>
                          <option value="ADVANCED">Advanced</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Pricing mode</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.courseDraft.isPaid ? "PAID" : "FREE"} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, isPaid: event.target.value === "PAID", price: event.target.value === "PAID" ? current.price : "" }))}>
                          <option value="FREE">Free</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Price</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" type="number" min={0.01} step="0.01" disabled={!builder.courseDraft.isPaid} value={builder.courseDraft.price} onChange={(event) => builder.setCourseDraft((current) => ({ ...current, price: event.target.value }))} />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">Save course</PillButton>
                      <PillButton onClick={() => builder.courseQuery.data && builder.setCourseDraft({ title: builder.courseQuery.data.title, description: builder.courseQuery.data.description ?? "", category: builder.courseQuery.data.category ?? "", level: builder.courseQuery.data.level ?? "BEGINNER", isPaid: Boolean(builder.courseQuery.data.isPaid), price: builder.courseQuery.data.price?.toString() ?? "" })}>Reset</PillButton>
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(builder.editorMode.kind === "new-section" || builder.editorMode.kind === "section") ? (
                <WorkspacePanel title={builder.editorMode.kind === "new-section" ? "Create section" : "Edit section"} description="Sections shape the learning path and keep lessons grouped with intention.">
                  <form onSubmit={builder.saveSection} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Section title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.sectionDraft.title} onChange={(event) => builder.setSectionDraft({ title: event.target.value })} required />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{builder.editorMode.kind === "new-section" ? "Create section" : "Save section"}</PillButton>
                      <PillButton onClick={() => builder.setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {builder.editorMode.kind === "section" && builder.selectedSection ? (
                        <PillButton onClick={() => builder.setConfirmDeleteKey(`section:${builder.selectedSection?.id ?? ""}`)}>Delete section</PillButton>
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(builder.editorMode.kind === "new-lesson" || builder.editorMode.kind === "lesson") ? (
                <WorkspacePanel title={builder.editorMode.kind === "new-lesson" ? `Add lesson${builder.selectedSection ? ` to ${builder.selectedSection.title}` : ""}` : "Edit lesson"} description="Use structured lesson forms so authoring stays inside the builder, not browser popups.">
                  <form onSubmit={builder.saveLesson} className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Lesson title</span>
                        <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.title} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, title: event.target.value }))} required />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Lesson type</span>
                        <select className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.type} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, type: event.target.value as "TEXT" | "VIDEO" | "FILE" }))}>
                          <option value="TEXT">Text</option>
                          <option value="VIDEO">Video</option>
                          <option value="FILE">File</option>
                        </select>
                      </label>
                    </div>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Lesson content or URL</span>
                      <textarea className="min-h-48 rounded-2xl border border-slate-300 px-3 py-2" value={builder.lessonDraft.content} onChange={(event) => builder.setLessonDraft((current) => ({ ...current, content: event.target.value }))} placeholder={builder.lessonDraft.type === "VIDEO" ? "Paste the video URL or embed-friendly link" : "Write the lesson content or reference file URL"} required />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{builder.editorMode.kind === "new-lesson" ? "Create lesson" : "Save lesson"}</PillButton>
                      <PillButton onClick={() => builder.setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {builder.editorMode.kind === "lesson" ? <PillButton onClick={() => void builder.duplicateLesson()}>Duplicate lesson</PillButton> : null}
                      {builder.editorMode.kind === "lesson" && builder.selectedLesson ? (
                        <PillButton onClick={() => builder.setConfirmDeleteKey(`lesson:${builder.selectedLesson?.id ?? ""}`)}>Delete lesson</PillButton>
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(builder.editorMode.kind === "new-quiz" || builder.editorMode.kind === "quiz") ? (
                <WorkspacePanel title={builder.editorMode.kind === "new-quiz" ? "Create quiz" : "Edit quiz"} description="Build the quiz with explicit question forms and clear answer validation.">
                  <form onSubmit={builder.saveQuiz} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Quiz title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.title} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={builder.quizDraft.description} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <div className="space-y-4">
                      {builder.quizDraft.questions.map((question, index) => (
                        <div key={`${builder.editorMode.kind}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">Question {index + 1}</p>
                            {builder.quizDraft.questions.length > 1 ? (
                              <PillButton onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))}>
                                Remove
                              </PillButton>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-3">
                            <input className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Question text" value={question.question} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, question: event.target.value } : item) }))} required />
                            <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="One option per line" value={question.options} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, options: event.target.value } : item) }))} required />
                            <input className="rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Correct answer (must match one line above)" value={question.correctAnswer} onChange={(event) => builder.setQuizDraft((current) => ({ ...current, questions: current.questions.map((item, itemIndex) => itemIndex === index ? { ...item, correctAnswer: event.target.value } : item) }))} required />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PillButton onClick={() => builder.setQuizDraft((current) => ({ ...current, questions: [...current.questions, { question: "", options: "", correctAnswer: "" }] }))}>
                        Add question
                      </PillButton>
                      <PillButton type="submit">{builder.editorMode.kind === "new-quiz" ? "Create quiz" : "Save quiz"}</PillButton>
                      <PillButton onClick={() => builder.setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {builder.editorMode.kind === "quiz" && builder.selectedQuiz ? (
                        <PillButton onClick={() => builder.setConfirmDeleteKey(`quiz:${builder.selectedQuiz?.id ?? ""}`)}>Delete quiz</PillButton>
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {(builder.editorMode.kind === "new-assignment" || builder.editorMode.kind === "assignment") ? (
                <WorkspacePanel title={builder.editorMode.kind === "new-assignment" ? "Create assignment" : "Edit assignment"} description="Assignments should feel like part of the learning design, not an afterthought.">
                  <form onSubmit={builder.saveAssignment} className="grid gap-4">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Assignment title</span>
                      <input className="rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.title} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, title: event.target.value }))} required />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Description</span>
                      <textarea className="min-h-24 rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.description} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, description: event.target.value }))} />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium text-slate-900">Instructions</span>
                      <textarea className="min-h-40 rounded-2xl border border-slate-300 px-3 py-2" value={builder.assignmentDraft.instructions} onChange={(event) => builder.setAssignmentDraft((current) => ({ ...current, instructions: event.target.value }))} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <PillButton type="submit">{builder.editorMode.kind === "new-assignment" ? "Create assignment" : "Save assignment"}</PillButton>
                      <PillButton onClick={() => builder.setEditorMode({ kind: "course" })}>Cancel</PillButton>
                      {builder.editorMode.kind === "assignment" && builder.selectedAssignment ? (
                        <PillButton onClick={() => builder.setConfirmDeleteKey(`assignment:${builder.selectedAssignment?.id ?? ""}`)}>Delete assignment</PillButton>
                      ) : null}
                    </div>
                  </form>
                </WorkspacePanel>
              ) : null}

              {builder.editorMode.kind === "course" && !builder.outlineSections.length && !builder.quizzesCount && !builder.assignmentsCount ? (
                <WorkspacePanel title="Start building" description="Use the sidebar and utility rail to shape the first version of the course.">
                  <EmptyState
                    title="This course is still empty"
                    description="Create a section, add your first lesson, then bring in quizzes and assignments to complete the learning path."
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <PillButton onClick={() => builder.setEditorMode({ kind: "new-section" })}>Create section</PillButton>
                        <PillButton onClick={() => builder.setEditorMode({ kind: "new-quiz" })}>Create quiz</PillButton>
                        <PillButton onClick={() => builder.setEditorMode({ kind: "new-assignment" })}>Create assignment</PillButton>
                      </div>
                    }
                  />
                </WorkspacePanel>
              ) : null}
            </>
          }
          utility={
            <CourseBuilderUtilityRail
              utilityTab={builder.utilityTab}
              setUtilityTab={builder.setUtilityTab}
              editorMode={builder.editorMode}
              setEditorMode={builder.setEditorMode}
              assessments={builder.assessmentsQuery.data}
              learners={builder.learnersQuery.data}
              assignmentSubmissions={builder.assignmentSubmissionsQuery.data}
              reviewState={builder.reviewState}
              setReviewState={builder.setReviewState}
              submitReview={builder.submitReview}
            />
          }
        />
      </div>

      <ConfirmationModal
        open={Boolean(builder.confirmDeleteKey)}
        title="Delete this item?"
        description="This action removes the selected item from the course workspace. Use this only when you are sure it should no longer be part of the learning flow."
        confirmLabel="Delete permanently"
        tone="danger"
        onCancel={() => builder.setConfirmDeleteKey(null)}
        onConfirm={() => void builder.onConfirmDelete()}
      />
    </main>
  );
}
