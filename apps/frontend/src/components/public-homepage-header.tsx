"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearAuthCookie } from "../lib/auth/session";
import { useAuthStore } from "../store/auth.store";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" d="M5 7h14" />
      <path strokeLinecap="round" d="M5 12h14" />
      <path strokeLinecap="round" d="M5 17h14" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 7V5.5A2.5 2.5 0 0 0 11.5 3h-5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h5a2.5 2.5 0 0 0 2.5-2.5V17" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m17 8 4 4-4 4" />
    </svg>
  );
}

type PublicActionLinkProps = {
  href: string;
  label: string;
  active?: boolean;
  accent?: boolean;
  interactive?: boolean;
};

function PublicActionLink({
  href,
  label,
  active = false,
  accent = false,
  interactive = true
}: PublicActionLinkProps) {
  const className = `inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition ${
    active
      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
      : accent
        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100"
        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
  }`;

  if (!interactive) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function PublicIconButton({
  label,
  onClick,
  tone = "default"
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 hover:-translate-y-0.5 hover:shadow-md ${
        tone === "danger"
          ? "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-rose-200"
          : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 focus-visible:ring-emerald-200"
      }`}
    >
      <LogoutIcon />
    </button>
  );
}

export function PublicHomepageHeader({
  previewViewport,
  interactive = true
}: {
  previewViewport?: "desktop" | "tablet" | "mobile";
  interactive?: boolean;
}) {
  return <PublicHomepageHeaderView previewViewport={previewViewport} interactive={interactive} />;
}

export function PublicHomepageHeaderView({
  previewViewport,
  interactive = true
}: {
  previewViewport?: "desktop" | "tablet" | "mobile";
  interactive?: boolean;
}) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const forceDesktop = previewViewport === "desktop" || previewViewport === "tablet";
  const forceMobile = previewViewport === "mobile";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function onLogout() {
    clearSession();
    clearAuthCookie();
    router.push("/login");
  }

  const isSignedIn = hasHydrated && Boolean(user);
  const dashboardHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const welcomeLabel = user?.fullName?.trim() ? `Welcome back, ${user.fullName.split(" ")[0]}.` : "Learn, teach, and grow in one organized place.";

  return (
    <header className="surface-card-strong rounded-[30px] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        {interactive ? (
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
              <Image src="/favicon.webp" alt="ATHAR LMS logo" fill className="object-contain" sizes="48px" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">ATHAR LMS</span>
              <span className="mt-1 block truncate text-sm text-slate-500">Organized learning for every role</span>
            </span>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden">
              <Image src="/favicon.webp" alt="ATHAR LMS logo" fill className="object-contain" sizes="48px" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">ATHAR LMS</span>
              <span className="mt-1 block truncate text-sm text-slate-500">Organized learning for every role</span>
            </span>
          </div>
        )}

        <div className={`${forceMobile ? "hidden" : forceDesktop ? "flex" : "hidden sm:flex"} items-center gap-3`}>
          <PublicActionLink href="/courses" label="Browse Courses" interactive={interactive} />
          {isSignedIn ? (
            <>
              <PublicActionLink href={dashboardHref} label="Dashboard" accent interactive={interactive} />
              {interactive ? <PublicIconButton label="Logout" onClick={onLogout} tone="danger" /> : null}
            </>
          ) : (
            <>
              <PublicActionLink href="/login" label="Login" active interactive={interactive} />
              <PublicActionLink href="/register" label="Register" interactive={interactive} />
            </>
          )}
        </div>

        <div
          ref={mobileMenuRef}
          className={`relative self-start ${forceDesktop ? "hidden" : forceMobile ? "block" : "sm:hidden"}`}
        >
          <button
            type="button"
            onClick={() => {
              if (interactive) {
                setMobileMenuOpen((current) => !current);
              }
            }}
            aria-label="Menu"
            disabled={!interactive}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md"
          >
            <MenuIcon />
          </button>

          {interactive && mobileMenuOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.55rem)] z-30 flex min-w-[13rem] flex-col gap-2 rounded-[28px] border border-slate-200 bg-white/90 p-3 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)] backdrop-blur-2xl">
              <PublicActionLink href="/courses" label="Browse Courses" />
              {isSignedIn ? (
                <>
                  <PublicActionLink href={dashboardHref} label="Dashboard" accent />
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <PublicActionLink href="/login" label="Login" active />
                  <PublicActionLink href="/register" label="Register" />
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200/80 pt-6">
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {welcomeLabel}
        </h1>
      </div>
    </header>
  );
}
