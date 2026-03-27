"use client";

import type { ReactNode } from "react";

interface ProfileShellProps {
  children: ReactNode;
}

export function ProfileShell({ children }: ProfileShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}

interface ProfilePanelProps {
  children: ReactNode;
  className?: string;
}

export function ProfilePanel({ children, className = "" }: ProfilePanelProps) {
  return (
    <section
      className={`rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur ${className}`.trim()}
    >
      {children}
    </section>
  );
}

export function ProfileSkeleton() {
  return (
    <ProfilePanel className="animate-pulse">
      <div className="mx-auto h-24 w-24 rounded-full bg-slate-200" />
      <div className="mx-auto mt-4 h-6 w-40 rounded-full bg-slate-200" />
      <div className="mx-auto mt-3 h-4 w-64 rounded-full bg-slate-200" />
      <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </ProfilePanel>
  );
}
