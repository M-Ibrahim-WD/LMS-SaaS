export function SiteFooter({
  interactive = true,
  previewViewport
}: {
  interactive?: boolean;
  previewViewport?: "desktop" | "tablet" | "mobile";
}) {
  const containerClass =
    previewViewport === "mobile" ? "max-w-full rounded-[28px]" : "max-w-6xl rounded-full";

  return (
    <footer className="px-4 pb-5 pt-2 text-center text-sm text-slate-500 sm:px-6 sm:pb-6">
      <div
        className={`mx-auto border border-slate-200/70 bg-white/70 px-4 py-3 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.32)] backdrop-blur ${containerClass}`}
      >
        <span>Copyright © 2026 | powered by </span>
        {interactive ? (
          <a
            href="https://atharagency.co/"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-sky-700 transition hover:text-sky-800"
          >
            Athar Agency
          </a>
        ) : (
          <span className="font-bold text-sky-700">Athar Agency</span>
        )}
      </div>
    </footer>
  );
}
