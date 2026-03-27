import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-8">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">404</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/dashboard" className="rounded-xl bg-slate-900 px-5 py-3 text-sm text-white">
            Go to Dashboard
          </Link>
          <Link href="/courses" className="rounded-xl border border-slate-300 px-5 py-3 text-sm text-slate-700">
            Browse Courses
          </Link>
        </div>
      </div>
    </main>
  );
}
