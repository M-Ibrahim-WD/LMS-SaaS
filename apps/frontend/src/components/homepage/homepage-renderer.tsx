"use client";

import Link from "next/link";
import type { HomepageCard, HomepageContent } from "../../lib/homepage/types";

function renderBulletLines(card: HomepageCard) {
  if (!("bullets" in card) || !card.bullets?.length) {
    return null;
  }

  return (
    <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
      {card.bullets.map((bullet, index) => (
        <li key={`${card.id}-bullet-${index}`} className="flex gap-3">
          <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

function HomepageCardView({ card }: { card: HomepageCard }) {
  if (card.type === "FEATURED_INSTRUCTORS") {
    return (
      <article className="surface-card rounded-[28px] p-5 sm:p-6">
        <p className="section-kicker">{card.subtitle || "Featured instructors"}</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
        {card.body ? <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p> : null}

        <div className="mt-6 grid gap-4">
          {card.instructors.map((instructor) => (
            <div key={instructor.id} className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-sky-100">
                  {instructor.profileImage ? (
                    <img
                      src={instructor.profileImage}
                      alt={instructor.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-sky-700">
                      {instructor.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-semibold text-slate-950">{instructor.fullName}</h4>
                  {instructor.bio ? (
                    <p className="mt-1 text-sm leading-6 text-slate-600">{instructor.bio}</p>
                  ) : null}
                </div>
              </div>

              {instructor.courses.length ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {instructor.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-white"
                    >
                      <p className="text-base font-semibold text-slate-900">{course.title}</p>
                      {course.description ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                          {course.description}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article className="surface-card rounded-[28px] p-5 sm:p-6">
      {card.accentLabel ? <p className="section-kicker">{card.accentLabel}</p> : null}
      {card.subtitle ? <p className="section-kicker mt-1">{card.subtitle}</p> : null}
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{card.title}</h3>
      {card.body ? <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p> : null}
      {renderBulletLines(card)}
    </article>
  );
}

export function HomepageRenderer({ content }: { content: HomepageContent }) {
  return (
    <div className="space-y-5">
      {content.rows.map((row) => (
        <div
          key={row.id}
          className={`grid gap-5 ${row.columns === 2 ? "lg:grid-cols-2" : "grid-cols-1"}`}
        >
          {row.slots.map((card, index) =>
            card ? (
              <HomepageCardView key={card.id} card={card} />
            ) : (
              <div
                key={`${row.id}-empty-${index}`}
                className="surface-card flex min-h-[180px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400"
              >
                Empty slot
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}
