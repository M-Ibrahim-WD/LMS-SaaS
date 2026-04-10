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
    <main className={`mx-auto w-full ${maxWidthClassName} px-3 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-10`}>
      <div className="surface-card-strong overflow-hidden rounded-[26px] p-4 sm:rounded-[32px] sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {backHref ? <BackButton fallbackHref={backHref} /> : null}
            <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-[2.15rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[0.96rem]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
        </div>

        <div className="mt-6 lg:mt-7">{children}</div>
      </div>
    </main>
  );
}
