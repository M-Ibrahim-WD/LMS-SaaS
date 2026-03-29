import type { ReactNode } from "react";

type StatusChipTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "trial";

interface StatusChipProps {
  tone?: StatusChipTone;
  children: ReactNode;
}

const toneStyles: Record<StatusChipTone, string> = {
  default: "bg-slate-100 text-slate-700",
  info: "bg-sky-100 text-sky-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-700",
  trial: "bg-cyan-100 text-cyan-800"
};

export function StatusChip({ tone = "default", children }: StatusChipProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneStyles[tone]}`}>
      {children}
    </span>
  );
}
