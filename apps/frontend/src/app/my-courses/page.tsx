"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "../../lib/api/client";
import { ContentCard } from "../../components/content-card";
import { EmptyState } from "../../components/empty-state";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { useRequireAuth } from "../../hooks/use-require-auth";

interface Course {
  id: string;
  title: string;
  description?: string | null;
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
    return <main className="p-8">Loading session...</main>;
  }

  return (
    <PageShell
      title="My Courses"
      description="Courses you enrolled in will appear here, with the next lesson ready to resume."
      backHref="/dashboard"
    >
      {myCoursesQuery.isLoading ? <StatusBanner>Loading courses...</StatusBanner> : null}
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
              <ContentCard className="transition hover:border-slate-300 hover:shadow-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{enrollment.course.title}</p>
                    <p className="text-sm text-slate-600">{enrollment.course.description}</p>
                    {enrollment.course.instructor ? (
                      <p className="mt-1 text-xs text-slate-500">{enrollment.course.instructor.fullName}</p>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
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

