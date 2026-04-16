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
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      title={label}
      className={`group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h11" />
      </svg>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
        {label}
      </span>
    </button>
  );
}
