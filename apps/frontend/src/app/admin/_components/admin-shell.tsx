"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type AdminSectionKey =
  | "overview"
  | "plans"
  | "tenants"
  | "users"
  | "courses"
  | "payments"
  | "admins"
  | "audit";

interface AdminNavItem {
  key: AdminSectionKey;
  label: string;
  description: string;
  href: string;
  visible: boolean;
}

interface AdminShellProps {
  title: string;
  description: string;
  active: AdminSectionKey;
  navItems: AdminNavItem[];
  headerActions?: ReactNode;
  children: ReactNode;
}

export function AdminShell({ title, description: _description, active, navItems, headerActions, children }: AdminShellProps) {
  return (
    <main className="mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <aside className="relative z-20 xl:sticky xl:top-6 xl:self-start">
          <div className="surface-card-strong relative overflow-visible rounded-[30px] p-5 sm:p-6">
            <p className="section-kicker">Admin</p>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Platform</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Keep the platform clean, accountable, and easy to operate.
                </p>
              </div>
              {headerActions ? <div className="flex shrink-0 sm:hidden">{headerActions}</div> : null}
            </div>
            <nav className="mt-6 grid grid-cols-4 gap-2 xl:grid-cols-1">
              {navItems.filter((item) => item.visible).map((item) => {
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block rounded-[20px] border px-2 py-2 text-center text-[0.72rem] font-semibold transition sm:px-4 sm:py-3 sm:text-sm xl:rounded-[24px] xl:px-4 xl:py-3 ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <p>{item.label}</p>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="relative z-10 min-w-0 space-y-5">
          <div className="surface-card-strong relative z-30 overflow-visible rounded-[30px] p-5 sm:p-6 lg:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker">Admin</p>
                <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {title}
                </h2>
              </div>
              {headerActions ? (
                <div className="hidden shrink-0 flex-wrap items-start justify-end gap-2 sm:flex">
                  {headerActions}
                </div>
              ) : null}
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
