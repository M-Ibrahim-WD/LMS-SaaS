"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../lib/api/client";
import { ContentCard } from "../../components/content-card";
import { EmptyState } from "../../components/empty-state";
import { PageShell } from "../../components/page-shell";
import { StatusBanner } from "../../components/status-banner";
import { StatusChip } from "../../components/status-chip";
import { useAuthStore } from "../../store/auth.store";

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
  instructor?: {
    id: string;
    fullName: string;
  };
}

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
}

function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="field-select flex items-center justify-between gap-2 px-3 text-left text-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <span className={`text-xs text-slate-500 transition ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.4)]">
          <div role="listbox" className="py-2">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition ${
                    selected
                      ? "bg-sky-50 font-medium text-sky-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CoursesPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [pricing, setPricing] = useState<"ALL" | "FREE" | "PAID">("ALL");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState<"ALL" | Course["level"]>("ALL");
  const [page, setPage] = useState(1);

  const coursePath = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (pricing !== "ALL") {
      params.set("pricing", pricing);
    }
    if (category.trim()) {
      params.set("category", category.trim());
    }
    if (level !== "ALL") {
      params.set("level", level);
    }

    params.set("page", String(page));
    params.set("pageSize", "12");
    return `/courses?${params.toString()}`;
  }, [category, level, page, pricing, search]);

  const coursesQuery = useQuery({
    queryKey: ["courses", "discover", search, pricing, category, level, page],
    queryFn: () => apiFetch<Course[]>(coursePath, { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken)
  });
  const coursesErrorMessage =
    coursesQuery.error instanceof Error ? coursesQuery.error.message : null;

  const availableCategories = useMemo(() => {
    return Array.from(
      new Set((coursesQuery.data ?? []).map((course) => course.category?.trim()).filter(Boolean) as string[])
    ).sort((left, right) => left.localeCompare(right));
  }, [coursesQuery.data]);

  const coursesByInstructor = (coursesQuery.data ?? []).reduce<Record<string, Course[]>>((groups, course) => {
    const key = course.instructor?.fullName ?? "Your Courses";
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(course);
    return groups;
  }, {});

  const pricingOptions: FilterSelectOption[] = [
    { value: "ALL", label: "All Pricing" },
    { value: "FREE", label: "Free" },
    { value: "PAID", label: "Paid" }
  ];

  const categoryOptions: FilterSelectOption[] = [
    { value: "", label: "All Categories" },
    ...availableCategories.map((item) => ({ value: item, label: item }))
  ];

  const levelOptions: FilterSelectOption[] = [
    { value: "ALL", label: "All Levels" },
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" }
  ];

  return (
    <PageShell
      title={user?.role === "INSTRUCTOR" ? "My Courses" : "Courses"}
      description="Browse the courses available in your current LMS workspace."
      backHref="/dashboard"
      actions={
        <>
          {user?.role === "INSTRUCTOR" ? (
            <Link href="/instructor/courses" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
              Open Course Manager
            </Link>
          ) : null}
          {user?.role === "STUDENT" ? (
            <Link href="/my-courses" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
              My Courses
            </Link>
          ) : null}
        </>
      }
    >
      <div className="mt-6 space-y-6">
        <ContentCard className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Discovery</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Explore by topic, level, and pricing</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone="info">{coursesQuery.data?.length ?? 0} visible courses</StatusChip>
              <StatusChip>{availableCategories.length} categories</StatusChip>
            </div>
          </div>
        </ContentCard>

        <div className="rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-sm">
          <input
            className="field-input"
            placeholder="Search by title, description, or category"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <FilterSelect
              value={pricing}
              options={pricingOptions}
              onChange={(nextValue) => {
                setPricing(nextValue as "ALL" | "FREE" | "PAID");
                setPage(1);
              }}
            />
            <FilterSelect
              value={category}
              options={categoryOptions}
              onChange={(nextValue) => {
                setCategory(nextValue);
                setPage(1);
              }}
            />
            <FilterSelect
              value={level}
              options={levelOptions}
              onChange={(nextValue) => {
                setLevel(nextValue as "ALL" | Course["level"]);
                setPage(1);
              }}
            />
          </div>
        </div>

        {coursesQuery.isLoading ? <StatusBanner>Loading courses...</StatusBanner> : null}
        {coursesQuery.isError ? (
          <StatusBanner variant="error">
            {coursesErrorMessage ?? "Failed to load courses."}
          </StatusBanner>
        ) : null}
        {!coursesQuery.isLoading && !coursesQuery.isError && Object.keys(coursesByInstructor).length === 0 ? (
          <EmptyState
            title="No courses found"
            description="Courses will appear here once instructors publish them."
          />
        ) : null}

        {Object.entries(coursesByInstructor).map(([instructorName, courses]) => (
          <section key={instructorName}>
            {user?.role === "STUDENT" ? (
              <h2 className="mb-3 text-lg font-semibold text-slate-800">{instructorName}</h2>
            ) : null}
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {courses.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <ContentCard className="h-full overflow-hidden p-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-4">
                    <div className="flex h-full flex-col">
                      <div className="h-28 w-full overflow-hidden rounded-[18px] bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 sm:h-36">
                        {course.thumbnailImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnailImage} alt={`${course.title} thumbnail`} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col pt-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="line-clamp-2 text-base font-semibold text-slate-950 sm:text-lg">{course.title}</p>
                          <StatusChip tone={course.isPaid ? "warning" : "success"}>
                            {course.isPaid ? `Paid ${course.price?.toFixed(2) ?? "0.00"}` : "Free"}
                          </StatusChip>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {course.category ? (
                            <StatusChip>{course.category}</StatusChip>
                          ) : null}
                          <StatusChip tone="info">{course.level.toLowerCase()}</StatusChip>
                        </div>
                        <p className="mt-auto pt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                          {course.instructor?.fullName ?? "Instructor"}
                        </p>
                      </div>
                    </div>
                  </ContentCard>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {!coursesQuery.isLoading && !coursesQuery.isError && coursesQuery.data?.length ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={(coursesQuery.data?.length ?? 0) < 12}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
