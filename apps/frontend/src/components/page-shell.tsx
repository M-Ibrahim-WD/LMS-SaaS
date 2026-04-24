import type { ReactNode } from "react";
import { BackButton } from "./back-button";
import { SiteShellMenu } from "./site-shell-menu";

interface PageShellProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  actionsInlineOnMobile?: boolean;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function PageShell({
  title,
  description,
  backHref,
  actions,
  actionsInlineOnMobile = false,
  maxWidthClassName = "max-w-5xl",
  children
}: PageShellProps) {
  const resolvedActions = actions ?? <SiteShellMenu />;
  const useInlineActionsOnMobile = actionsInlineOnMobile || !actions;

  return (
    <main className={`mx-auto w-full ${maxWidthClassName} px-3 py-4 sm:px-6 sm:py-7 lg:px-8 lg:py-10`}>
      <div className="surface-card-strong overflow-hidden rounded-[26px] p-4 sm:rounded-[32px] sm:p-6 lg:p-8">
        <div className={`border-b border-slate-200/80 pb-5 ${useInlineActionsOnMobile ? "flex items-start justify-between gap-4 sm:flex-row sm:items-start sm:justify-between" : "flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"}`}>
          <div className="min-w-0">
            {backHref ? <BackButton fallbackHref={backHref} /> : null}
            <h1 className="mt-3 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-[2.15rem]">
              {title}
            </h1>
          </div>
          <div className={`${useInlineActionsOnMobile ? "shrink-0" : ""} flex flex-wrap gap-2 sm:justify-end`}>
            {resolvedActions}
          </div>
        </div>

        <div className="mt-6 lg:mt-7">{children}</div>
      </div>
    </main>
  );
}
