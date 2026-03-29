import { ReactNode } from "react";

interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className = "" }: ContentCardProps) {
  return (
    <div
      className={`rounded-[26px] border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur sm:p-5 lg:p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
