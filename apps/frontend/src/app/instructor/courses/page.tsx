"use client";

import { useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api/client";
import { ContentCard } from "../../../components/content-card";
import { PageShell } from "../../../components/page-shell";
import { StatusBanner } from "../../../components/status-banner";
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
    } catch {
      setError("Could not create course");
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

  return (
    <PageShell
      title="Instructor Courses"
      description="Create new courses, publish them, and jump into the builder."
      backHref="/dashboard"
    >
      <ContentCard className="p-6">
        <h2 className="text-lg font-medium">Create Course</h2>
        <form onSubmit={createCourse} className="mt-3">
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Course title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <textarea
            className="mt-3 w-full rounded border px-3 py-2"
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              className="w-full rounded border px-3 py-2"
              placeholder="Category (e.g. Web Development)"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
            <select
              className="w-full rounded border px-3 py-2"
              value={level}
              onChange={(event) => setLevel(event.target.value as Course["level"])}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="course-paid-toggle"
              type="checkbox"
              checked={isPaid}
              onChange={(event) => setIsPaid(event.target.checked)}
            />
            <label htmlFor="course-paid-toggle" className="text-sm">
              Paid Course
            </label>
          </div>
          {isPaid ? (
            <input
              className="mt-3 w-full rounded border px-3 py-2"
              placeholder="Price (e.g. 199.99)"
              type="number"
              min={0.01}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          ) : null}
          {error ? <StatusBanner variant="error">{error}</StatusBanner> : null}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
          >
            {saving ? "Creating..." : "Create Course"}
          </button>
        </form>
      </ContentCard>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Manage Courses</h2>
        {coursesQuery.isLoading ? <StatusBanner>Loading courses...</StatusBanner> : null}
        {coursesQuery.isError ? <StatusBanner variant="error">Failed to load instructor courses.</StatusBanner> : null}
        {coursesQuery.data?.map((course) => (
          <ContentCard key={course.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-20 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400">
                  {course.thumbnailImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnailImage} alt={`${course.title} thumbnail`} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-medium">{course.title}</p>
                  <p className="text-sm text-slate-600">{course.description}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[course.category, course.level.toLowerCase()].filter(Boolean).join(" - ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {course.isPaid ? `Paid - ${course.price?.toFixed(2) ?? "0.00"}` : "Free"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleStatus(course)}
                  className="rounded border px-3 py-2 text-sm"
                >
                  {course.status === "DRAFT" ? "Publish" : "Set Draft"}
                </button>
                <a
                  href={`/instructor/courses/${course.id}/builder`}
                  className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  Builder
                </a>
              </div>
            </div>
          </ContentCard>
        ))}
      </section>
    </PageShell>
  );
}
