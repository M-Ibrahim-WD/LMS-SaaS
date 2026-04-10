"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "../../lib/api/client";
import { ContentCard } from "../../components/content-card";
import { EmptyState } from "../../components/empty-state";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { StatusChip } from "../../components/status-chip";
import { useRequireAuth } from "../../hooks/use-require-auth";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED";
  instructor?: {
    id: string;
    fullName: string;
  };
}

interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
}

interface Enrollment {
  id: string;
  courseId: string;
  createdAt: string;
  course: Course;
  progress?: CourseProgress | null;
  learningState?: {
    lastLessonId: string | null;
    nextLesson?: {
      id: string;
      title: string;
      order: number;
    } | null;
  } | null;
}

export default function MyCoursesPage() {
  const { accessToken, user, hasHydrated, isAuthorized } = useRequireAuth({ roles: ["STUDENT"] });

  const myCoursesQuery = useQuery({
    queryKey: ["enrollments", "my-courses"],
    queryFn: () => apiFetch<Enrollment[]>("/enrollments/my-courses", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && isAuthorized)
  });

  if (!hasHydrated) {
    return <main className="p-8">My Courses</main>;
  }

  return (
    <PageShell
      title="My Courses"
      description=""
      backHref="/dashboard"
    >
      {myCoursesQuery.isLoading ? <StatusBanner>My Courses</StatusBanner> : null}
      {myCoursesQuery.isError ? (
        <StatusBanner variant="error">Failed to load your courses. Please try again.</StatusBanner>
      ) : null}
      {myCoursesQuery.data && myCoursesQuery.data.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No enrolled courses yet"
            description="Enroll in a course to start learning here."
            actionHref="/courses"
            actionLabel="Browse Courses"
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {myCoursesQuery.data?.map((enrollment) => {
          const resumeHref = enrollment.learningState?.nextLesson
            ? `/courses/${enrollment.course.id}#lesson-${enrollment.learningState.nextLesson.id}`
            : `/courses/${enrollment.course.id}`;

          return (
            <Link key={enrollment.id} href={resumeHref}>
              <ContentCard className="transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-row gap-3 sm:gap-4">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[22px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 sm:h-36 sm:w-44">
                      {enrollment.course.thumbnailImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={enrollment.course.thumbnailImage} alt={`${enrollment.course.title} thumbnail`} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-slate-950">{enrollment.course.title}</p>
                        <StatusChip tone={enrollment.progress?.isComplete ? "success" : "trial"}>
                          {enrollment.progress?.isComplete ? "Completed" : "In progress"}
                        </StatusChip>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{enrollment.course.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {enrollment.course.category ? <StatusChip>{enrollment.course.category}</StatusChip> : null}
                        {enrollment.course.level ? <StatusChip tone="info">{enrollment.course.level.toLowerCase()}</StatusChip> : null}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 lg:text-right">
                    {enrollment.course.instructor ? (
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">{enrollment.course.instructor.fullName}</p>
                    ) : null}
                    {enrollment.learningState?.nextLesson ? (
                      <>
                        <p className="font-medium text-slate-900">Continue learning</p>
                        <p>Lesson {enrollment.learningState.nextLesson.order}</p>
                        <p className="text-xs text-slate-500">{enrollment.learningState.nextLesson.title}</p>
                      </>
                    ) : enrollment.progress?.isComplete ? (
                      <p className="font-medium text-emerald-700">Completed</p>
                    ) : (
                      <p className="font-medium text-slate-700">Open course</p>
                    )}
                  </div>
                </div>
                {enrollment.progress ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Progress {enrollment.progress.completedLessons}/{enrollment.progress.totalLessons}
                      </span>
                      <span>{enrollment.progress.percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-sky-600 transition-all"
                        style={{ width: `${enrollment.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </ContentCard>
            </Link>
          );
        })}
      </div>
    </PageShell>
  );
}



