"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
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
  const [navWidth, setNavWidth] = useState(34);

  const navStyle = useMemo<CSSProperties>(
    () => ({
      flex: `0 0 clamp(16rem, ${navWidth}vw, 23rem)`,
      width: `clamp(16rem, ${navWidth}vw, 23rem)`
    }),
    [navWidth]
  );

  const contentStyle = useMemo<CSSProperties>(
    () => ({
      flex: "1 0 clamp(21rem, 72vw, 70rem)",
      width: "clamp(21rem, 72vw, 70rem)"
    }),
    []
  );

  return (
    <main className="mx-auto w-full max-w-[96rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mobile-split-resizer xl:hidden">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</label>
        <input
          aria-label="Adjust admin navigation width"
          type="range"
          min={28}
          max={42}
          value={navWidth}
          onChange={(event) => setNavWidth(Number(event.target.value))}
        />
      </div>

      <div className="mobile-split-shell xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="mobile-split-pane xl:sticky xl:top-6 xl:self-start" style={navStyle}>
          <div className="surface-card-strong rounded-[30px] p-5">
            <p className="section-kicker">Admin</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Platform</h1>
            <div className="mt-5">
              <BackButton fallbackHref="/dashboard" label="Back to dashboard" />
            </div>
            <nav className="mt-6 space-y-2">
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

        <section className="mobile-split-main space-y-5" style={contentStyle}>
          <div className="surface-card-strong rounded-[30px] p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="section-kicker">Admin</p>
                <h2 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {title}
                </h2>
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
