"use client";

import { useState, type ComponentPropsWithoutRef } from "react";

type PasswordInputProps = ComponentPropsWithoutRef<"input">;

function ClosedEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.6 10.7A3 3 0 0 0 13.3 13.4M9.9 5.2A10.9 10.9 0 0 1 12 5c5.2 0 9.4 3.1 10.9 7-1 2.5-3.2 4.7-6 5.9M6.6 6.7C4.5 8 2.9 9.8 2 12c1.5 3.9 5.7 7 10 7 1 0 2-.2 2.9-.4"
      />
    </svg>
  );
}

function OpenEyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={isVisible ? "Hide password" : "Show password"}
        title={isVisible ? "Hide password" : "Show password"}
        className={`absolute inset-y-0 right-3 inline-flex items-center justify-center transition ${
          isVisible ? "text-emerald-600 hover:text-emerald-700" : "text-rose-500 hover:text-rose-600"
        }`}
      >
        {isVisible ? <OpenEyeIcon /> : <ClosedEyeIcon />}
      </button>
    </div>
  );
}
