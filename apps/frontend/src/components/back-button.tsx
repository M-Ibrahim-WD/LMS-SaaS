"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
}

export function BackButton({
  label = "Back",
  fallbackHref = "/dashboard",
  className = ""
}: BackButtonProps) {
  const router = useRouter();

  function onBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={onBack}
      className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 ${className}`.trim()}
    >
      {label}
    </button>
  );
}
