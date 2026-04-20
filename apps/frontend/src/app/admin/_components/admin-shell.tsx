"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "../../../components/back-button";

export type AdminSectionKey =
  | "overview"
  | "plans"
  | "tenants"
  | "users"
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

export function AdminShell({ title, description, active, navItems, headerActions, children }: AdminShellProps) {
  return (
    <main className="mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="surface-card-strong rounded-[30px] p-5 sm:p-6">
            <p className="section-kicker">Admin</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Platform</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Keep the platform clean, accountable, and easy to operate.
            </p>
            <div className="mt-5">
              <BackButton fallbackHref="/dashboard" label="Back to dashboard" />
            </div>
            <nav className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {navItems.filter((item) => item.visible).map((item) => {
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block rounded-[24px] border px-4 py-3 transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                        : "border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          <div className="surface-card-strong rounded-[30px] p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="section-kicker">Admin</p>
                <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-[0.98rem]">
                  {description}
                </p>
              </div>
              {headerActions ? <div className="flex flex-wrap gap-2">{headerActions}</div> : null}
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
