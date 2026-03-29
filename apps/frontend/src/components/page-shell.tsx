import type { ReactNode } from "react";
import { BackButton } from "./back-button";

interface PageShellProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function PageShell({
  title,
  description,
  backHref,
  actions,
  maxWidthClassName = "max-w-5xl",
  children
}: PageShellProps) {
  return (
    <main className={`mx-auto w-full ${maxWidthClassName} px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8`}>
      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6 lg:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {backHref ? <BackButton fallbackHref={backHref} /> : null}
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-[2rem]">{title}</h1>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
