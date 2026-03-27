import type { ReactNode } from "react";

type StatusVariant = "info" | "error" | "success";

interface StatusBannerProps {
  variant?: StatusVariant;
  children: ReactNode;
}

const styles: Record<StatusVariant, string> = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export function StatusBanner({ variant = "info", children }: StatusBannerProps) {
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles[variant]}`}>{children}</div>;
}
