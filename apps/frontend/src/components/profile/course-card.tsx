"use client";

import Link from "next/link";

interface ProfileCourseCardProps {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  isPaid?: boolean;
  studentsCount?: number;
  averageRating?: number | null;
  reviewsCount?: number;
  badge?: string;
  href?: string;
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => {
        const filled = rating >= index + 0.5;

        return (
          <span
            key={index}
            className={`text-[12px] leading-none ${filled ? "text-amber-500" : "text-slate-300"}`}
          >
            {"\u2605"}
          </span>
        );
      })}
    </span>
  );
}

function gradientForTitle(title: string) {
  const gradients = [
    "from-sky-500 via-cyan-500 to-emerald-400",
    "from-amber-500 via-orange-500 to-rose-500",
    "from-indigo-500 via-sky-500 to-cyan-400",
    "from-emerald-500 via-teal-500 to-sky-500"
  ];

  const code = title.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return gradients[code % gradients.length];
}

export function ProfileCourseCard({
  id,
  title,
  description,
  imageUrl,
  price,
  isPaid,
  studentsCount,
  averageRating,
  reviewsCount,
  badge,
  href
}: ProfileCourseCardProps) {
  const targetHref = href ?? `/courses/${id}`;
  return (
    <Link
      href={targetHref}
      className="group overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_24px_70px_-48px_rgba(15,23,42,0.65)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.75)]"
    >
      <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${gradientForTitle(title)} p-5 text-white`}>
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={`${title} thumbnail`} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/35 to-slate-900/10" />
          </>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <span className="relative z-10 rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-[0.22em] backdrop-blur">
            {badge ?? (isPaid ? "Paid" : "Free")}
          </span>
          <span className="relative z-10 rounded-full bg-slate-950/25 px-3 py-1 text-xs backdrop-blur">
            {isPaid ? `$${(price ?? 0).toFixed(2)}` : "Free"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-950 transition group-hover:text-sky-700">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {description?.trim() ? description : ""}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>{studentsCount ?? 0} students</span>
            {reviewsCount ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                {averageRating !== null && averageRating !== undefined ? (
                  <>
                    <RatingStars rating={averageRating} />
                    <span>{averageRating.toFixed(1)}</span>
                  </>
                ) : (
                  <span>Rated</span>
                )}
                <span className="text-slate-400">•</span>
                <span>{reviewsCount}</span>
              </span>
            ) : null}
          </div>
          <span className="font-medium text-slate-700">Open course</span>
        </div>
      </div>
    </Link>
  );
}



