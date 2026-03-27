"use client";

import type { ReactNode } from "react";
import { EmptyState } from "../empty-state";
import { ProfilePanel } from "./profile-shell";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, action }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  student: {
    fullName: string;
  };
  course?: {
    title: string;
  };
}

export function ReviewsList({ reviews }: { reviews: ReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <ProfilePanel>
        <EmptyState
          title="No reviews yet"
          description="Once learners start leaving feedback, their reviews will show up here."
        />
      </ProfilePanel>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <ProfilePanel key={review.id}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-950">{review.student.fullName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {review.course?.title ? `${review.course.title} • ` : ""}
                {new Date(review.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {review.rating}/5
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            {review.comment?.trim() ? review.comment : "No written comment was added for this review."}
          </p>
        </ProfilePanel>
      ))}
    </div>
  );
}

export function EmptyProfilePanel({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <ProfilePanel>
      <EmptyState title={title} description={description} />
    </ProfilePanel>
  );
}
