"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import { AdminShell } from "../_components/admin-shell";
import { AdminSiteMenu } from "../_components/admin-site-menu";
import type {
  HomepageCard,
  HomepageCardType,
  HomepageCatalogInstructor,
  HomepageContent,
  HomepageInstructorEntry,
  HomepageRow
} from "../../../lib/homepage/types";

type DraftResponse = {
  draftContent: HomepageContent;
  publishedAt?: string | null;
  hasPublishedContent: boolean;
};

type PickerState = {
  rowId: string;
  slotIndex: number;
};

const homepageNavItems = [
  {
    key: "homepage" as const,
    label: "Homepage",
    description: "Edit and publish the public homepage.",
    href: "/admin/homepage",
    visible: true
  }
];

const cardTypeCopy: Record<
  HomepageCardType,
  { title: string; subtitle: string; body: string }
> = {
  ABOUT_US: {
    title: "About Us",
    subtitle: "Who we are",
    body: "Introduce the people, mission, and story behind the platform in a warm and trustworthy way."
  },
  WHY_US: {
    title: "Why Us",
    subtitle: "What makes us different",
    body: "Highlight the value learners and instructors get from choosing your platform."
  },
  ABOUT_SITE: {
    title: "About the Site",
    subtitle: "Platform overview",
    body: "Explain what visitors can do here, how the learning experience works, and what the site offers."
  },
  TEXT_MEDIA: {
    title: "Custom Section",
    subtitle: "Flexible content",
    body: "Use this block for any text-first section such as testimonials, a mission statement, or a featured message."
  },
  FEATURED_INSTRUCTORS: {
    title: "Featured Instructors",
    subtitle: "Suggested educators",
    body: "Choose instructors and the courses you want to spotlight on the public homepage."
  }
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createRow(columns: 1 | 2): HomepageRow {
  return {
    id: createId("row"),
    columns,
    slots: Array.from({ length: columns }, () => null)
  };
}

function buildTemplateCard(type: Exclude<HomepageCardType, "FEATURED_INSTRUCTORS">): HomepageCard {
  const template = cardTypeCopy[type];
  return {
    id: createId("card"),
    type,
    title: template.title,
    subtitle: template.subtitle,
    body: template.body,
    accentLabel: type === "TEXT_MEDIA" ? "Editable block" : template.subtitle,
    bullets:
      type === "WHY_US"
        ? [
            "Clear learning paths for students.",
            "Organized tools for instructors.",
            "One platform for courses, messaging, and support."
          ]
        : type === "ABOUT_US"
          ? ["Mission-driven team", "Calm product experience", "Built for real education workflows"]
          : undefined
  };
}

function cloneCard(card: HomepageCard): HomepageCard {
  if (card.type === "FEATURED_INSTRUCTORS") {
    return {
      ...card,
      instructors: card.instructors.map((instructor) => ({
        ...instructor,
        courses: instructor.courses.map((course) => ({ ...course }))
      }))
    };
  }

  return {
    ...card,
    bullets: card.bullets ? [...card.bullets] : undefined
  };
}

function cloneContent(content: HomepageContent): HomepageContent {
  return {
    ...content,
    rows: content.rows.map((row) => ({
      ...row,
      slots: row.slots.map((slot) => (slot ? cloneCard(slot) : null))
    }))
  };
}

function updateSlot(
  content: HomepageContent,
  rowId: string,
  slotIndex: number,
  nextCard: HomepageCard | null
) {
  return {
    ...content,
    updatedAt: new Date().toISOString(),
    rows: content.rows.map((row) =>
      row.id === rowId
        ? {
            ...row,
            slots: row.slots.map((slot, index) => (index === slotIndex ? nextCard : slot))
          }
        : row
    )
  };
}

export default function AdminHomepagePage() {
  const { accessToken, hasHydrated, isAuthorized, user } = useRequireAuth({ roles: ["ADMIN"] });
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const [editingCardState, setEditingCardState] = useState<PickerState | null>(null);
  const [featuredSelection, setFeaturedSelection] = useState<Record<string, string[]>>({});

  const canManageHomepage =
    Boolean(user?.isSuperAdmin) || Boolean(user?.adminPermissions?.includes("MANAGE_HOMEPAGE"));

  const homepageQuery = useQuery({
    queryKey: ["admin", "homepage", "draft"],
    queryFn: () => apiFetch<DraftResponse>("/admin/homepage", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && canManageHomepage),
    staleTime: 0
  });

  const catalogQuery = useQuery({
    queryKey: ["admin", "homepage", "catalog"],
    queryFn: () =>
      apiFetch<HomepageCatalogInstructor[]>("/admin/homepage/catalog", {
        token: accessToken ?? undefined
      }),
    enabled: Boolean(accessToken && canManageHomepage)
  });

  const workingDraft = draft ?? homepageQuery.data?.draftContent ?? { rows: [] };

  const saveDraftMutation = useMutation({
    mutationFn: (content: HomepageContent) =>
      apiFetch<{ draftContent: HomepageContent; publishedAt?: string | null }>("/admin/homepage/draft", {
        method: "PUT",
        token: accessToken ?? undefined,
        body: JSON.stringify(content)
      }),
    onSuccess: (response) => {
      setDraft(response.draftContent);
      setMessage({ type: "success", text: "Homepage draft saved." });
    },
    onError: (error) => {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save homepage draft."
      });
    }
  });

  const publishDraftMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ publishedContent: HomepageContent; publishedAt?: string | null }>(
        "/admin/homepage/publish",
        {
          method: "POST",
          token: accessToken ?? undefined
        }
      ),
    onSuccess: (response) => {
      const publishedContent = response.publishedContent ?? workingDraft;
      setDraft(publishedContent);
      setMessage({ type: "success", text: "Homepage draft published successfully." });
    },
    onError: (error) => {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to publish homepage."
      });
    }
  });

  const selectedCard = useMemo(() => {
    if (!editingCardState) {
      return null;
    }

    const row = workingDraft.rows.find((entry) => entry.id === editingCardState.rowId);
    return row?.slots[editingCardState.slotIndex] ?? null;
  }, [editingCardState, workingDraft.rows]);

  const featuredSummary = useMemo(() => {
    const instructors = catalogQuery.data ?? [];
    return Object.entries(featuredSelection)
      .map(([instructorId, courseIds]) => {
        const instructor = instructors.find((entry) => entry.id === instructorId);
        if (!instructor || !courseIds.length) {
          return null;
        }

        const courses = instructor.instructorCourses.filter((course) => courseIds.includes(course.id));
        if (!courses.length) {
          return null;
        }

        const mappedInstructor: HomepageInstructorEntry = {
          id: instructor.id,
          fullName: instructor.fullName,
          bio: instructor.bio,
          profileImage: instructor.profileImage,
          courses
        };

        return mappedInstructor;
      })
      .filter(Boolean) as HomepageInstructorEntry[];
  }, [catalogQuery.data, featuredSelection]);

  function setWorkingDraft(nextDraft: HomepageContent) {
    setDraft(cloneContent(nextDraft));
  }

  function addRow(columns: 1 | 2) {
    setMessage(null);
    setWorkingDraft({
      ...workingDraft,
      updatedAt: new Date().toISOString(),
      rows: [...workingDraft.rows, createRow(columns)]
    });
  }

  function removeRow(rowId: string) {
    setMessage(null);
    setWorkingDraft({
      ...workingDraft,
      updatedAt: new Date().toISOString(),
      rows: workingDraft.rows.filter((row) => row.id !== rowId)
    });
  }

  function startCreateCard(rowId: string, slotIndex: number) {
    setPickerState({ rowId, slotIndex });
    setEditingCardState(null);
    setFeaturedSelection({});
  }

  function startEditCard(rowId: string, slotIndex: number) {
    const row = workingDraft.rows.find((entry) => entry.id === rowId);
    const card = row?.slots[slotIndex];
    if (!card) {
      return;
    }

    setEditingCardState({ rowId, slotIndex });
    setPickerState(null);

    if (card.type === "FEATURED_INSTRUCTORS") {
      setFeaturedSelection(
        Object.fromEntries(
          card.instructors.map((instructor) => [
            instructor.id,
            instructor.courses.map((course) => course.id)
          ])
        )
      );
      return;
    }

    setFeaturedSelection({});
  }

  function applyTemplate(type: Exclude<HomepageCardType, "FEATURED_INSTRUCTORS">) {
    if (!pickerState) {
      return;
    }

    setWorkingDraft(updateSlot(workingDraft, pickerState.rowId, pickerState.slotIndex, buildTemplateCard(type)));
    setPickerState(null);
  }

  function applyFeaturedInstructors() {
    if (!pickerState && !editingCardState) {
      return;
    }

    const target = pickerState ?? editingCardState;
    if (!target) {
      return;
    }

    const card: HomepageCard = {
      id: selectedCard?.id ?? createId("card"),
      type: "FEATURED_INSTRUCTORS",
      title: "Featured Instructors",
      subtitle: "Selected by the admin",
      body: "Meet some of the instructors and courses we recommend right now.",
      instructors: featuredSummary
    };

    setWorkingDraft(updateSlot(workingDraft, target.rowId, target.slotIndex, card));
    setPickerState(null);
    setEditingCardState(null);
    setFeaturedSelection({});
  }

  function removeCard(rowId: string, slotIndex: number) {
    setMessage(null);
    setWorkingDraft(updateSlot(workingDraft, rowId, slotIndex, null));
  }

  function updateCardText(field: "title" | "subtitle" | "body", value: string) {
    if (!editingCardState || !selectedCard || selectedCard.type === "FEATURED_INSTRUCTORS") {
      return;
    }

    const nextCard: HomepageCard = {
      ...selectedCard,
      [field]: value
    };
    setWorkingDraft(updateSlot(workingDraft, editingCardState.rowId, editingCardState.slotIndex, nextCard));
  }

  function updateBullets(value: string) {
    if (!editingCardState || !selectedCard || selectedCard.type === "FEATURED_INSTRUCTORS") {
      return;
    }

    const lines = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const nextCard: HomepageCard = {
      ...selectedCard,
      bullets: lines.length ? lines : undefined
    };
    setWorkingDraft(updateSlot(workingDraft, editingCardState.rowId, editingCardState.slotIndex, nextCard));
  }

  function toggleFeaturedCourse(instructorId: string, courseId: string) {
    setFeaturedSelection((current) => {
      const existing = current[instructorId] ?? [];
      const next = existing.includes(courseId)
        ? existing.filter((entry) => entry !== courseId)
        : [...existing, courseId];
      return {
        ...current,
        [instructorId]: next
      };
    });
  }

  if (!hasHydrated) {
    return <main className="p-8">Loading admin session...</main>;
  }

  if (!isAuthorized) {
    return <main className="p-8">Redirecting...</main>;
  }

  return (
    <AdminShell
      title="Homepage Builder"
      description="Build the public homepage row by row, keep edits in draft, and publish when the page is ready."
      active="homepage"
      navItems={homepageNavItems}
      headerActions={<AdminSiteMenu accessToken={accessToken} canHandleSupport={Boolean(user?.isSuperAdmin || user?.adminPermissions?.includes("HANDLE_SUPPORT"))} />}
    >
      {!canManageHomepage ? (
        <ContentCard className="p-6">
          <EmptyState
            title="Homepage access is restricted"
            description="This admin account does not have permission to edit and publish the public homepage."
            actionHref="/admin/overview"
            actionLabel="Return to overview"
          />
        </ContentCard>
      ) : (
        <>
          {message ? (
            <StatusBanner variant={message.type === "success" ? "success" : "error"}>
              {message.text}
            </StatusBanner>
          ) : null}
          {homepageQuery.error instanceof Error ? (
            <StatusBanner variant="error">{homepageQuery.error.message}</StatusBanner>
          ) : null}

          <ContentCard className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="section-kicker">Workflow</p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Draft first, publish when ready</h2>
                <p className="max-w-3xl text-sm leading-6 text-slate-600">
                  Add rows, click an empty slot to choose a homepage block, then publish the draft to replace the live public homepage.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => addRow(1)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Add 1-column row
                </button>
                <button
                  type="button"
                  onClick={() => addRow(2)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                >
                  Add 2-column row
                </button>
                <button
                  type="button"
                  onClick={() => saveDraftMutation.mutate(workingDraft)}
                  disabled={saveDraftMutation.isPending || homepageQuery.isLoading}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
                >
                  {saveDraftMutation.isPending ? "Saving..." : "Save draft"}
                </button>
                <button
                  type="button"
                  onClick={() => publishDraftMutation.mutate()}
                  disabled={publishDraftMutation.isPending || homepageQuery.isLoading}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {publishDraftMutation.isPending ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="section-kicker">Draft rows</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{workingDraft.rows.length}</p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="section-kicker">Published</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {homepageQuery.data?.hasPublishedContent ? "Live homepage exists" : "Nothing published yet"}
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="section-kicker">Last publish</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {homepageQuery.data?.publishedAt
                    ? new Date(homepageQuery.data.publishedAt).toLocaleString()
                    : "Not published yet"}
                </p>
              </div>
            </div>
          </ContentCard>

          <div className="space-y-5">
            {workingDraft.rows.length ? (
              workingDraft.rows.map((row, rowIndex) => (
                <ContentCard key={row.id} className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Row {rowIndex + 1}</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {row.columns === 1 ? "Single-card row" : "Two-card row"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      Delete row
                    </button>
                  </div>

                  <div className={`grid gap-4 ${row.columns === 2 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                    {row.slots.map((slot, slotIndex) =>
                      slot ? (
                        <div
                          key={slot.id}
                          className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="section-kicker">{slot.type.replaceAll("_", " ")}</p>
                              <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                                {slot.title}
                              </h3>
                              {slot.subtitle ? (
                                <p className="mt-2 text-sm font-medium text-slate-600">{slot.subtitle}</p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditCard(row.id, slotIndex)}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCard(row.id, slotIndex)}
                                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {slot.body ? <p className="mt-4 text-sm leading-6 text-slate-600">{slot.body}</p> : null}
                          {"bullets" in slot && slot.bullets?.length ? (
                            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
                              {slot.bullets.map((bullet, bulletIndex) => (
                                <li key={`${slot.id}-bullet-${bulletIndex}`} className="flex gap-3">
                                  <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {slot.type === "FEATURED_INSTRUCTORS" ? (
                            <div className="mt-4 space-y-3">
                              {slot.instructors.length ? (
                                slot.instructors.map((instructor) => (
                                  <div key={instructor.id} className="rounded-[20px] bg-slate-50 p-4">
                                    <p className="font-semibold text-slate-900">{instructor.fullName}</p>
                                    <p className="mt-2 text-sm text-slate-600">
                                      {instructor.courses.map((course) => course.title).join(" | ")}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-500">No instructors selected yet.</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <button
                          key={`${row.id}-slot-${slotIndex}`}
                          type="button"
                          onClick={() => startCreateCard(row.id, slotIndex)}
                          className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm font-medium text-slate-500 transition hover:border-sky-400 hover:bg-sky-50"
                        >
                          Click to add a homepage card here
                        </button>
                      )
                    )}
                  </div>
                </ContentCard>
              ))
            ) : (
              <ContentCard className="p-6">
                <EmptyState
                  title="Start with your first homepage row"
                  description="The page is intentionally blank. Add a row, then click an empty slot to choose what should appear there."
                />
              </ContentCard>
            )}
          </div>

          {pickerState ? (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-8">
              <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">Choose a card</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">Homepage block picker</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Pick one of the prepared sections below. The selected block will be inserted into the clicked slot.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerState(null)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {(["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => applyTemplate(type)}
                      className="rounded-[28px] border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-sky-300 hover:bg-white"
                    >
                      <p className="section-kicker">{cardTypeCopy[type].subtitle}</p>
                      <h4 className="mt-2 text-xl font-semibold text-slate-950">{cardTypeCopy[type].title}</h4>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{cardTypeCopy[type].body}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Featured instructors</p>
                      <h4 className="mt-2 text-xl font-semibold text-slate-950">Instructor and course selector</h4>
                    </div>
                    <button
                      type="button"
                      onClick={applyFeaturedInstructors}
                      disabled={!featuredSummary.length}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Add featured instructors
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {(catalogQuery.data ?? []).map((instructor) => (
                      <div key={instructor.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{instructor.fullName}</p>
                            {instructor.bio ? (
                              <p className="mt-1 text-sm leading-6 text-slate-600">{instructor.bio}</p>
                            ) : null}
                          </div>
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            {instructor.instructorCourses.length} courses
                          </span>
                        </div>

                        {instructor.instructorCourses.length ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {instructor.instructorCourses.map((course) => {
                              const selected = featuredSelection[instructor.id]?.includes(course.id) ?? false;
                              return (
                                <label
                                  key={course.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 transition ${
                                    selected
                                      ? "border-sky-300 bg-sky-50"
                                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleFeaturedCourse(instructor.id, course.id)}
                                    className="mt-1"
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-900">{course.title}</span>
                                    {course.description ? (
                                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                                        {course.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">This instructor does not have published courses yet.</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {editingCardState && selectedCard ? (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 py-8">
              <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">Edit card</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950">{selectedCard.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCardState(null);
                      setFeaturedSelection({});
                    }}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Close
                  </button>
                </div>

                {selectedCard.type === "FEATURED_INSTRUCTORS" ? (
                  <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="section-kicker">Instructor selection</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Choose the instructors and published courses that should appear in this homepage card.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={applyFeaturedInstructors}
                        className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Apply changes
                      </button>
                    </div>

                    <div className="mt-5 space-y-4">
                      {(catalogQuery.data ?? []).map((instructor) => (
                        <div key={instructor.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                          <p className="text-base font-semibold text-slate-950">{instructor.fullName}</p>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {instructor.instructorCourses.map((course) => {
                              const selected = featuredSelection[instructor.id]?.includes(course.id) ?? false;
                              return (
                                <label
                                  key={course.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-[20px] border p-4 ${
                                    selected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleFeaturedCourse(instructor.id, course.id)}
                                    className="mt-1"
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-900">{course.title}</span>
                                    {course.description ? (
                                      <span className="mt-1 block text-sm leading-6 text-slate-600">
                                        {course.description}
                                      </span>
                                    ) : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                      <input
                        value={selectedCard.title}
                        onChange={(event) => updateCardText("title", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Subtitle</span>
                      <input
                        value={selectedCard.subtitle ?? ""}
                        onChange={(event) => updateCardText("subtitle", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Body</span>
                      <textarea
                        value={selectedCard.body ?? ""}
                        onChange={(event) => updateCardText("body", event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">
                        Bullet points
                      </span>
                      <textarea
                        value={"bullets" in selectedCard ? selectedCard.bullets?.join("\n") ?? "" : ""}
                        onChange={(event) => updateBullets(event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        placeholder="Write one bullet per line"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
