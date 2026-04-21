"use client";

import Link from "next/link";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { StatusChip } from "../../../components/status-chip";
import type { AdminCourseSummary } from "./admin-control-center.shared";

interface AdminCoursesSectionProps {
  courses?: AdminCourseSummary[];
  isLoading: boolean;
}

export function AdminCoursesSection({ courses, isLoading }: AdminCoursesSectionProps) {
  return (
    <ContentCard className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-kicker">Courses</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Course review catalog</h3>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {courses?.length ? (
          courses.map((course) => (
            <div key={course.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-slate-950">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.instructor.fullName} | {course.tenant.name}
                  </p>
                </div>
                <StatusChip tone="info">{course.status}</StatusChip>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {course._count.enrollments} enrollments | {course._count.reviews} reviews
              </p>
              <Link
                href={`/courses/${course.id}`}
                className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                Review course
              </Link>
            </div>
          ))
        ) : isLoading ? (
          <StatusBanner>Loading courses...</StatusBanner>
        ) : (
          <EmptyState
            title="No courses yet"
            description="Course review entries will appear here when instructors create content."
          />
        )}
      </div>
    </ContentCard>
  );
}
