"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api/client";
import { ContentCard } from "../../../components/content-card";
import { PageShell } from "../../../components/page-shell";
import { StatusBanner } from "../../../components/status-banner";
import { PillButton, StatPill } from "../../../components/course-workspace";
import { useRequireAuth } from "../../../hooks/use-require-auth";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailImage?: string | null;
  category?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  isPaid: boolean;
  price?: number | null;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
}

export default function InstructorCoursesPage() {
  const router = useRouter();
  const { accessToken, hasHydrated, isAuthorized } = useRequireAuth({ roles: ["INSTRUCTOR"] });
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<Course["level"]>("BEGINNER");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const coursesQuery = useQuery({
    queryKey: ["instructor-courses"],
    queryFn: () => apiFetch<Course[]>("/courses", { token: accessToken ?? undefined }),
    enabled: Boolean(hasHydrated && accessToken && isAuthorized)
  });

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const created = await apiFetch<Course>("/courses", {
        method: "POST",
        token: accessToken ?? undefined,
        body: JSON.stringify({
          title,
          description: description || undefined,
          category: category || undefined,
          level,
          isPaid,
          price: isPaid ? Number(price) : undefined
        })
      });
      setTitle("");
      setDescription("");
      setCategory("");
      setLevel("BEGINNER");
      setIsPaid(false);
      setPrice("");
      await coursesQuery.refetch();
      router.push(`/instructor/courses/${created.id}/builder`);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : "Could not create course");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(course: Course) {
    const next = course.status === "DRAFT" ? "PUBLISHED" : "DRAFT";
    await apiFetch(`/courses/${course.id}/status`, {
      method: "PATCH",
      token: accessToken ?? undefined,
      body: JSON.stringify({ status: next })
    });
    await coursesQuery.refetch();
  }

  const courses = coursesQuery.data ?? [];
  const draftCount = courses.filter((course) => course.status === "DRAFT").length;
  const publishedCount = courses.filter((course) => course.status === "PUBLISHED").length;

  return (
    <PageShell
      title="Course Studio"
      description="Start a course with just the essentials, then continue in the full builder workspace for sections, lessons, quizzes, assignments, and publishing."
      backHref="/dashboard"
      maxWidthClassName="max-w-7xl"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <StatPill label="Total courses" value={String(courses.length)} tone="info" />
        <StatPill label="Drafts" value={String(draftCount)} tone="warning" />
        <StatPill label="Published" value={String(publishedCount)} tone="success" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <ContentCard className="rounded-[28px] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Quick course creation</h2>
              <p className="mt-2 text-sm text-slate-600">
                Create the shell here, then we’ll move straight into the builder to finish the real structure.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Step 1
            </span>
          </div>

          <form onSubmit={createCourse} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Course title</span>
              <input
                className="rounded-2xl border border-slate-300 px-3 py-2"
                placeholder="Modern JavaScript Foundations"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium text-slate-900">Description</span>
              <textarea
                className="min-h-28 rounded-2xl border border-slate-300 px-3 py-2"
                placeholder="Tell learners what they’ll achieve by the end of the course."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Category</span>
                <input
                  className="rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="Web Development"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Level</span>
                <select
                  className="rounded-2xl border border-slate-300 px-3 py-2"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as Course["level"])}
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </label>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Pricing</p>
                  <p className="mt-1 text-sm text-slate-600">Choose whether learners enroll for free or pay before access.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    id="course-paid-toggle"
                    type="checkbox"
                    checked={isPaid}
                    onChange={(event) => setIsPaid(event.target.checked)}
                  />
                  Paid course
                </label>
              </div>
              {isPaid ? (
                <input
                  className="mt-4 w-full rounded-2xl border border-slate-300 px-3 py-2"
                  placeholder="199.99"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              ) : null}
            </div>

            {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Creating course..." : "Create and open builder"}
            </button>
          </form>
        </ContentCard>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">What happens next</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">1. Structure</p>
                <p className="mt-1">Build sections and lessons in the workspace outline.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">2. Assess</p>
                <p className="mt-1">Add quizzes, assignments, and submission review flows.</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">3. Publish</p>
                <p className="mt-1">Upload media, preview the course, then publish with confidence.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-950 to-cyan-800 p-6 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-100">Workspace upgrade</p>
            <h3 className="mt-3 text-2xl font-semibold">No more browser prompts</h3>
            <p className="mt-3 max-w-xl text-sm text-cyan-50/85">
              Sections, lessons, quizzes, assignments, learner progress, and submissions now live in a proper authoring workspace instead of popup inputs.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">Your courses</h2>
          {coursesQuery.isLoading ? <span className="text-sm text-slate-500">Loading...</span> : null}
        </div>
        {coursesQuery.isError ? <StatusBanner variant="error">Failed to load instructor courses.</StatusBanner> : null}
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {courses.map((course) => (
            <ContentCard key={course.id} className="rounded-[28px] p-0 overflow-hidden">
              <div className="h-44 overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                {course.thumbnailImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.thumbnailImage} alt={`${course.title} thumbnail`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{course.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{course.description || "No description yet."}</p>
                  </div>
                  <span className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${course.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {course.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">{course.category || "Uncategorized"}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{course.level.toLowerCase()}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{course.isPaid ? `Paid ${course.price?.toFixed(2) ?? "0.00"}` : "Free"}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PillButton onClick={() => void toggleStatus(course)}>
                    {course.status === "DRAFT" ? "Publish" : "Move to draft"}
                  </PillButton>
                  <Link href={`/instructor/courses/${course.id}/builder`} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                    Open builder
                  </Link>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}



