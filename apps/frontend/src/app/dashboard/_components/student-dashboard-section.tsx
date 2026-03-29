"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusChip } from "../../../components/status-chip";
import type {
  ContinueLearningItem,
  CourseFilter,
  StudentDashboardCourse,
  StudentInstructorItem,
  StudentTab
} from "./dashboard-types";

interface StudentDashboardSectionProps {
  studentInviteCode: string;
  studentJoinError: string | null;
  activeTab: StudentTab;
  filterType: CourseFilter;
  searchQuery: string;
  continueLearning: ContinueLearningItem | null;
  studentInstructors?: StudentInstructorItem[];
  filteredStudentCourses: StudentDashboardCourse[];
  groupedCoursesByInstructor: Record<string, StudentDashboardCourse[]>;
  studentEmptyStateMessage: string;
  isJoiningInstructor: boolean;
  isLoadingCourses: boolean;
  hasCourseError: boolean;
  onJoinInstructor: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onStudentInviteCodeChange: (value: string) => void;
  clearStudentJoinError: () => void;
  onActiveTabChange: (value: StudentTab) => void;
  onFilterTypeChange: (value: CourseFilter) => void;
  onSearchQueryChange: (value: string) => void;
}

export function StudentDashboardSection({
  studentInviteCode,
  studentJoinError,
  activeTab,
  filterType,
  searchQuery,
  continueLearning,
  studentInstructors,
  filteredStudentCourses,
  groupedCoursesByInstructor,
  studentEmptyStateMessage,
  isJoiningInstructor,
  isLoadingCourses,
  hasCourseError,
  onJoinInstructor,
  onStudentInviteCodeChange,
  clearStudentJoinError,
  onActiveTabChange,
  onFilterTypeChange,
  onSearchQueryChange
}: StudentDashboardSectionProps) {
  const myCourseCount = filteredStudentCourses.filter((course) => course.isEnrolled).length;
  const completedCount = filteredStudentCourses.filter((course) => course.progress?.isComplete).length;

  function renderProgress(course: StudentDashboardCourse) {
    if (!course.isEnrolled || !course.progress) {
      return null;
    }

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {course.progress.completedLessons}/{course.progress.totalLessons} lessons
          </span>
          <span>{course.progress.percentage}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${course.progress.percentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {course.progress.isComplete
            ? "Completed"
            : course.learningState?.nextLesson
              ? `Next lesson: ${course.learningState.nextLesson.title}`
              : "Resume your course"}
        </p>
      </div>
    );
  }

  function renderCourseCard(course: StudentDashboardCourse) {
    const href = course.learningState?.nextLesson
      ? `/courses/${course.id}#lesson-${course.learningState.nextLesson.id}`
      : `/courses/${course.id}`;

    return (
      <Link
        key={course.id}
        href={href}
        className="group block rounded-[26px] border border-slate-200 bg-white/95 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex flex-col gap-4">
          <div className="relative h-44 overflow-hidden rounded-[22px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
            {course.thumbnailImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnailImage} alt={`${course.title} thumbnail`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            ) : null}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{course.instructorName}</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{course.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>
            </div>
            <StatusChip tone={course.isPaid ? "warning" : "success"}>
              {course.isPaid ? `Paid ${course.price?.toFixed(2) ?? "0.00"}` : "Free"}
            </StatusChip>
          </div>
          <div className="flex flex-wrap gap-2">
            {course.category ? <StatusChip>{course.category}</StatusChip> : null}
            <StatusChip tone="info">{course.level.toLowerCase()}</StatusChip>
            {course.isEnrolled ? (
              <StatusChip tone={course.progress?.isComplete ? "success" : "trial"}>
                {course.progress?.isComplete ? "Completed" : "In progress"}
              </StatusChip>
            ) : null}
          </div>
        </div>
        {renderProgress(course)}
      </Link>
    );
  }

  return (
    <div className="space-y-5">
      {continueLearning ? (
        <Link
          href={continueLearning.anchorHref}
          className="block overflow-hidden rounded-[30px] border border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_30%),linear-gradient(155deg,#082f49_0%,#0369a1_52%,#14b8a6_100%)] p-6 text-white shadow-[0_28px_65px_-34px_rgba(3,105,161,0.7)] transition hover:shadow-[0_36px_70px_-30px_rgba(3,105,161,0.62)] sm:p-7"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-24 w-32 overflow-hidden rounded-[22px] bg-white/15">
                {continueLearning.thumbnailImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={continueLearning.thumbnailImage} alt={`${continueLearning.courseTitle} thumbnail`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Continue learning</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{continueLearning.courseTitle}</h2>
                <p className="mt-2 text-sm leading-7 text-white/82">
                  {continueLearning.instructorName} • next lesson: {continueLearning.lessonTitle}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">
              Resume lesson
            </span>
          </div>
        </Link>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ContentCard className="p-5">
          <p className="section-kicker">Learning now</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{myCourseCount}</p>
          <p className="mt-2 text-sm text-slate-600">Courses currently enrolled and ready to continue.</p>
        </ContentCard>
        <ContentCard className="p-5">
          <p className="section-kicker">Completed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{completedCount}</p>
          <p className="mt-2 text-sm text-slate-600">Courses fully completed in your current workspace.</p>
        </ContentCard>
        <ContentCard className="p-5">
          <p className="section-kicker">Instructors</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{studentInstructors?.length ?? 0}</p>
          <p className="mt-2 text-sm text-slate-600">Teachers and academies you are currently connected to.</p>
        </ContentCard>
        <ContentCard className="p-5">
          <p className="section-kicker">Discover</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{filteredStudentCourses.length}</p>
          <p className="mt-2 text-sm text-slate-600">Courses matching your current filters and search.</p>
        </ContentCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-5">
          <ContentCard className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">Learning catalog</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Find the right next course</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/my-courses" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  My Courses
                </Link>
                <Link href="/courses" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                  Browse all
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.4fr))]">
              <input
                className="field-input"
                placeholder="Search by course title or description"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
              <select className="field-select" value={activeTab} onChange={(event) => onActiveTabChange(event.target.value as StudentTab)}>
                <option value="ALL">All Courses</option>
                <option value="MY">My Courses</option>
                <option value="INSTRUCTOR">By Instructor</option>
              </select>
              <select className="field-select" value={filterType} onChange={(event) => onFilterTypeChange(event.target.value as CourseFilter)}>
                <option value="ALL">All Pricing</option>
                <option value="FREE">Free</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {hasCourseError ? (
              <p className="mt-4 text-sm text-rose-600">We could not load courses right now. Please refresh and try again.</p>
            ) : null}

            <div className="mt-5 space-y-6">
              {isLoadingCourses ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-72 animate-pulse rounded-[26px] border border-slate-200 bg-slate-100" />
                  ))}
                </div>
              ) : filteredStudentCourses.length ? (
                Object.entries(groupedCoursesByInstructor).map(([instructorName, courses]) => (
                  <div key={instructorName}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{instructorName}</p>
                        <p className="text-xs text-slate-500">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {courses.map((course) => renderCourseCard(course))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title={studentEmptyStateMessage} description="Adjust your filters or join another instructor to discover more courses." />
              )}
            </div>
          </ContentCard>
        </div>

        <div className="space-y-5">
          <ContentCard className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Your instructors</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Connected academies</h3>
              </div>
              <StatusChip tone="info">{studentInstructors?.length ?? 0} linked</StatusChip>
            </div>
            <div className="mt-5 space-y-3">
              {studentInstructors?.length ? (
                studentInstructors.map((item) => (
                  <Link
                    key={item.id}
                    href={`/instructors/${item.instructor.id}`}
                    className="block rounded-[24px] border border-slate-200 bg-slate-50/85 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <p className="font-semibold text-slate-950">{item.instructor.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.instructor.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.instructor.tenant?.name ?? "Instructor workspace"}</p>
                  </Link>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/85 p-5 text-sm text-slate-600">
                  You are not linked to any instructor yet.
                </div>
              )}
            </div>
          </ContentCard>

          <ContentCard className="p-6">
            <p className="section-kicker">Join a workspace</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Add another instructor</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Enter an instructor invite code to follow their academy and see their published courses.
            </p>
            <form onSubmit={(event) => void onJoinInstructor(event)} className="mt-5 space-y-4">
              <input
                id="student-invite-code"
                className="field-input"
                placeholder="Enter invite code"
                value={studentInviteCode}
                onChange={(event) => {
                  onStudentInviteCodeChange(event.target.value.toUpperCase());
                  if (studentJoinError) {
                    clearStudentJoinError();
                  }
                }}
              />
              <button
                type="submit"
                disabled={isJoiningInstructor}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isJoiningInstructor ? "Adding instructor..." : "Join instructor"}
              </button>
            </form>
            {studentJoinError ? <p className="mt-3 text-sm text-rose-600">{studentJoinError}</p> : null}
          </ContentCard>
        </div>
      </section>
    </div>
  );
}
