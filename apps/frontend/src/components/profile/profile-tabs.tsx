"use client";

import type { ReactNode } from "react";

interface ProfileTabItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface ProfileTabsProps {
  items: ProfileTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function ProfileTabs({ items, activeKey, onChange }: ProfileTabsProps) {
  return (
    <div className="sticky top-3 z-10 mt-6 overflow-x-auto rounded-full border border-white/80 bg-white/90 p-2 shadow-sm backdrop-blur">
      <div className="flex min-w-max items-center gap-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-pressed={active}
              title={item.label}
              className={`flex h-11 w-11 items-center justify-center rounded-full px-0 py-0 text-sm font-medium transition md:h-auto md:w-auto md:gap-2 md:px-4 md:py-2.5 ${
                active
                  ? "bg-slate-950 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-[18px] leading-none md:text-base" aria-hidden="true">
                {item.icon}
              </span>
              <span className="hidden md:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
