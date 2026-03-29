import type { ReactNode } from "react";

type StatusVariant = "info" | "error" | "success" | "warning";

interface StatusBannerProps {
  variant?: StatusVariant;
  children: ReactNode;
}

const styles: Record<StatusVariant, string> = {
  info: "border-sky-200 bg-sky-50/90 text-sky-800",
  error: "border-rose-200 bg-rose-50/95 text-rose-700",
  success: "border-emerald-200 bg-emerald-50/95 text-emerald-800",
  warning: "border-amber-200 bg-amber-50/95 text-amber-800"
};

export function StatusBanner({ variant = "info", children }: StatusBannerProps) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${styles[variant]}`}>{children}</div>;
}
