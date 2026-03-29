"use client";

import Link from "next/link";
import type { FormEvent } from "react";
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
  function renderProgress(course: StudentDashboardCourse) {
    if (!course.isEnrolled || !course.progress) {
      return null;
    }

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Progress {course.progress.completedLessons}/{course.progress.totalLessons}
          </span>
          <span>{course.progress.percentage}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-600 transition-all"
            style={{ width: `${course.progress.percentage}%` }}
          />
        </div>
        {course.learningState?.nextLesson ? (
          <p className="mt-2 text-xs text-slate-500">Next lesson: {course.learningState.nextLesson.title}</p>
        ) : null}
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
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex flex-col gap-4">
          <div className="h-40 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
            {course.thumbnailImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnailImage} alt={`${course.title} thumbnail`} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">{course.instructorName}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{course.title}</p>
              <p className="mt-2 text-sm text-slate-600">{course.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {course.category ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">{course.category}</span>
                ) : null}
                <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">
                  {course.level.toLowerCase()}
                </span>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                course.isPaid ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {course.isPaid ? `Paid ${course.price?.toFixed(2) ?? "0.00"}` : "Free"}
            </span>
          </div>
        </div>
        {course.isEnrolled ? (
          <div className="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-sky-700">
            <span>Enrolled</span>
            {course.learningState?.nextLesson ? <span>Resume: {course.learningState.nextLesson.title}</span> : null}
          </div>
        ) : null}
        {renderProgress(course)}
      </Link>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/my-courses" className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
          My Courses
        </Link>
        <Link href="/courses" className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Browse Courses
        </Link>
      </div>

      {continueLearning ? (
        <Link
          href={continueLearning.anchorHref}
          className="block rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                {continueLearning.thumbnailImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={continueLearning.thumbnailImage} alt={`${continueLearning.courseTitle} thumbnail`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-700">Continue Learning</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{continueLearning.courseTitle}</p>
              <p className="mt-1 text-sm text-slate-600">
                {continueLearning.instructorName} - next lesson: {continueLearning.lessonTitle}
              </p>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Resume now
            </span>
          </div>
        </Link>
      ) : null}

        <div className="rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">My Instructors</p>
            <p className="text-xs text-slate-500">Join multiple instructors using invite codes.</p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("student-invite-code")?.focus()}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium"
          >
            Add Instructor
          </button>
        </div>

        <form onSubmit={(event) => void onJoinInstructor(event)} className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            id="student-invite-code"
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm"
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
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isJoiningInstructor ? "Adding..." : "Add Instructor"}
          </button>
        </form>

        {studentJoinError ? <p className="mt-3 text-xs text-red-600">{studentJoinError}</p> : null}

        <div className="mt-4 space-y-2">
          {studentInstructors?.length ? (
            studentInstructors.map((item) => (
              <Link
                key={item.id}
                href={`/instructors/${item.instructor.id}`}
                className="block rounded border border-slate-200 p-3 text-sm transition hover:border-sky-300 hover:bg-sky-50/40"
              >
                <p className="font-medium">{item.instructor.fullName}</p>
                <p className="text-slate-600">{item.instructor.email}</p>
                <p className="mt-1 text-slate-500">{item.instructor.tenant?.name ?? "Instructor organization"}</p>
              </Link>
            ))
          ) : (
            <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              You have not joined any instructor yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Course Explorer</p>
            <p className="text-sm text-slate-500">Browse all followed instructors, filter by pricing, and search instantly.</p>
          </div>
          <label className="block w-full max-w-md">
            <span className="sr-only">Search courses</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "ALL", label: "All Courses" },
              { value: "MY", label: "My Courses" },
              { value: "INSTRUCTOR", label: "By Instructor" }
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onActiveTabChange(tab.value as StudentTab)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.value
                    ? "bg-slate-900 text-white shadow-sm"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "ALL", label: "All" },
              { value: "FREE", label: "Free" },
              { value: "PAID", label: "Paid" }
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => onFilterTypeChange(filter.value as CourseFilter)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  filterType === filter.value
                    ? "bg-sky-100 text-sky-800"
                    : "border border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {isLoadingCourses ? (
            <p className="text-sm text-slate-500">Loading courses...</p>
          ) : hasCourseError ? (
            <p className="text-sm text-red-600">Failed to load course dashboard.</p>
          ) : filteredStudentCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-base font-medium text-slate-700">{studentEmptyStateMessage}</p>
              <p className="mt-2 text-sm text-slate-500">Try another filter, search term, or join a new instructor.</p>
            </div>
          ) : activeTab === "INSTRUCTOR" ? (
            <div className="space-y-6">
              {Object.entries(groupedCoursesByInstructor).map(([instructorName, courses]) => (
                <section key={instructorName}>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">{instructorName}</h2>
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {courses.length} course{courses.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">{courses.map((course) => renderCourseCard(course))}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">{filteredStudentCourses.map((course) => renderCourseCard(course))}</div>
          )}
        </div>
      </div>
    </div>
  );
}

