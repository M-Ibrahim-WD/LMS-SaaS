import type { ReactNode } from "react";

interface AuthPanelProps {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthPanel({ title, description, footer, children }: AuthPanelProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_30px_80px_-34px_rgba(15,23,42,0.34)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_30%),linear-gradient(160deg,#0f172a_0%,#0f766e_55%,#14b8a6_100%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/75">ATHAR LMS</p>
            <h2 className="mt-6 max-w-sm text-4xl font-semibold tracking-tight text-balance">ATHAR</h2>
          </div>
          <div />
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <p className="section-kicker">Account Access</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">{title}</h1>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 border-t border-slate-100 pt-5">{footer}</div> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
