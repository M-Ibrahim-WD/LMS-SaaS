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
    <div className="sticky top-3 z-10 mt-6 rounded-full border border-white/80 bg-white/90 p-2 shadow-sm backdrop-blur">
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-pressed={active}
              title={item.label}
              className={`flex min-w-0 items-center justify-center rounded-full px-3 py-2.5 text-sm font-medium transition md:gap-2 ${
                active
                  ? "bg-slate-950 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.9)]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-[18px] leading-none md:text-base" aria-hidden="true">
                {item.icon}
              </span>
              <span className="ml-0 hidden truncate md:ml-2 md:inline">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
