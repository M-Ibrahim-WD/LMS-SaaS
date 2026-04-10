"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";

interface WorkspaceShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  utility?: ReactNode;
}

export function WorkspaceShell({ sidebar, main, utility }: WorkspaceShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(36);
  const [utilityWidth, setUtilityWidth] = useState(32);

  const sidebarStyle = useMemo<CSSProperties>(
    () => ({
      flex: `0 0 clamp(16rem, ${sidebarWidth}vw, 24rem)`,
      width: `clamp(16rem, ${sidebarWidth}vw, 24rem)`
    }),
    [sidebarWidth]
  );

  const mainStyle = useMemo<CSSProperties>(
    () => ({
      flex: utility ? "1 0 clamp(20rem, 70vw, 48rem)" : "1 0 min(100%, 48rem)",
      width: utility ? "clamp(20rem, 70vw, 48rem)" : "min(100%, 48rem)"
    }),
    [utility]
  );

  const utilityStyle = useMemo<CSSProperties>(
    () => ({
      flex: `0 0 clamp(15rem, ${utilityWidth}vw, 22rem)`,
      width: `clamp(15rem, ${utilityWidth}vw, 22rem)`
    }),
    [utilityWidth]
  );

  return (
    <div>
      <div className="mobile-split-resizer xl:hidden">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Navigation</label>
        <input
          aria-label="Adjust navigation panel width"
          type="range"
          min={28}
          max={44}
          value={sidebarWidth}
          onChange={(event) => setSidebarWidth(Number(event.target.value))}
        />
        {utility ? (
          <>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Details</label>
            <input
              aria-label="Adjust details panel width"
              type="range"
              min={26}
              max={40}
              value={utilityWidth}
              onChange={(event) => setUtilityWidth(Number(event.target.value))}
            />
          </>
        ) : null}
      </div>

      <div
        className={`mobile-split-shell ${
          utility
            ? "xl:grid-cols-[280px_minmax(0,1fr)_300px] 2xl:grid-cols-[320px_minmax(0,1fr)_340px]"
            : "xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]"
        }`}
      >
        <aside className="mobile-split-pane space-y-5 xl:sticky xl:top-6 xl:self-start" style={sidebarStyle}>
          {sidebar}
        </aside>
        <section className="mobile-split-main space-y-5" style={mainStyle}>
          {main}
        </section>
        {utility ? (
          <aside className="mobile-split-utility space-y-5 xl:sticky xl:top-6 xl:self-start" style={utilityStyle}>
            {utility}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

interface WorkspacePanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WorkspacePanel({ title, description, actions, children, className = "" }: WorkspacePanelProps) {
  return (
    <div className={`surface-card overflow-hidden rounded-[22px] p-4 sm:rounded-[28px] sm:p-5 ${className}`.trim()}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-[1.1rem]">{title}</h2> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

interface PillButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function PillButton({ active = false, onClick, children, type = "button", disabled = false }: PillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-slate-300 bg-white/95 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center sm:p-8">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

interface StatPillProps {
  label: string;
  value: string;
  tone?: "default" | "success" | "info" | "warning";
}

const statToneClasses: Record<NonNullable<StatPillProps["tone"]>, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-800",
  info: "bg-sky-100 text-sky-800",
  warning: "bg-amber-100 text-amber-800"
};

export function StatPill({ label, value, tone = "default" }: StatPillProps) {
  return (
    <div className={`rounded-2xl px-4 py-3 shadow-sm ${statToneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
