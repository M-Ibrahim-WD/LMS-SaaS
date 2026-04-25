"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HomepageRenderer } from "../components/homepage/homepage-renderer";
import { StatusBanner } from "../components/status-banner";
import { apiFetch } from "../lib/api/client";
import type { HomepageContent } from "../lib/homepage/types";

const fallbackHomepage: HomepageContent = {
  rows: [
    {
      id: "fallback-row",
      columns: 1,
      slots: [
        {
          id: "fallback-card",
          type: "ABOUT_SITE",
          title: "ATHAR LMS",
          subtitle: "Learning platform",
          body: "A calm space for courses, lessons, assignments, messaging, and support."
        }
      ]
    }
  ]
};

export default function HomePage() {
  const [content, setContent] = useState<HomepageContent>(fallbackHomepage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepage() {
      try {
        const response = await apiFetch<{ content: HomepageContent }>("/homepage/published");
        if (!cancelled && response.content?.rows?.length) {
          setContent(response.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load the homepage.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHomepage();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="surface-card-strong rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="section-kicker">ATHAR LMS</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Learn, teach, and grow in one organized place.
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Login
            </Link>
            <Link href="/register" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800">
              Register
            </Link>
            <Link href="/courses" className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800">
              Browse Courses
            </Link>
          </div>
        </div>
      </header>

      {error ? <div className="mt-5"><StatusBanner variant="error">{error}</StatusBanner></div> : null}
      {loading ? <div className="mt-5"><StatusBanner>Loading homepage...</StatusBanner></div> : null}

      <div className="mt-6">
        <HomepageRenderer content={content} />
      </div>
    </main>
  );
}
