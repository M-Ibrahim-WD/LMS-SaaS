import type { ReactNode } from "react";

interface WorkspaceShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  utility?: ReactNode;
}

export function WorkspaceShell({ sidebar, main, utility }: WorkspaceShellProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <aside className="space-y-5">{sidebar}</aside>
      <section className="space-y-5">{main}</section>
      {utility ? <aside className="space-y-5">{utility}</aside> : null}
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
    <div className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm ${className}`.trim()}>
      {title || description || actions ? (
        <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
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
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400"
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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-6 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
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
    <div className={`rounded-2xl px-4 py-3 ${statToneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

