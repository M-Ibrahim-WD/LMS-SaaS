"use client";

import type { ReactNode } from "react";
import { ProfilePanel } from "./profile-shell";

interface StatItem {
  label: string;
  value: string;
  helper?: string;
}

interface ProfileHeaderProps {
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  badge?: string;
  stats: StatItem[];
  actions?: ReactNode;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileHeader({ name, bio, imageUrl, badge, stats, actions }: ProfileHeaderProps) {
  return (
    <ProfilePanel className="relative overflow-hidden text-center">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-gradient-to-r from-sky-200/40 via-emerald-100/25 to-amber-100/40 blur-3xl" />
      <div className="relative">
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-gradient-to-br from-slate-900 via-slate-700 to-sky-500 text-3xl font-semibold text-white shadow-lg shadow-slate-300/40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            initialsFromName(name)
          )}
        </div>
        {badge ? (
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-slate-400">{badge}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{name}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {bio?.trim() ? bio : "A focused learning profile built for clear discovery and fast navigation."}
        </p>
        {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 text-left shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              {stat.helper ? <p className="mt-1 text-xs text-slate-500">{stat.helper}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </ProfilePanel>
  );
}
