export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold">LMS SaaS Starter</h1>
      <p className="mt-3 text-slate-700">Authentication and user management foundation is ready.</p>
      <div className="mt-6 flex gap-3">
        <a className="rounded-lg bg-slate-900 px-4 py-2 text-white" href="/login">
          Login
        </a>
        <a className="rounded-lg border border-slate-300 px-4 py-2" href="/register">
          Register
        </a>
        <a className="rounded-lg border border-slate-300 px-4 py-2" href="/courses">
          Browse Courses
        </a>
      </div>
    </main>
  );
}
