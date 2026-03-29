import { ReactNode } from "react";

interface ContentCardProps {
  children: ReactNode;
  className?: string;
}

export function ContentCard({ children, className = "" }: ContentCardProps) {
  return (
    <div
      className={`surface-card rounded-[28px] p-4 sm:p-5 lg:p-6 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
