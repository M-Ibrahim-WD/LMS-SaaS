"use client";

import type { SVGProps } from "react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} />;
}

export function GridIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </IconBase>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M16 12h4" />
      <circle cx="16" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function AnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M5 19V9M12 19V5M19 19v-8" />
    </IconBase>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M5 18l2.5-2H18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2z" />
    </IconBase>
  );
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5z" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1 0 2.8a2 2 0 0 1-2.8 0l-.1-.1a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9a1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8 0a2 2 0 0 1 0-2.8l.1-.1a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6a1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 0 1 0-2.8a2 2 0 0 1 2.8 0l.1.1a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V4a2 2 0 0 1 4 0v.2a1 1 0 0 0 .6.9a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 0a2 2 0 0 1 0 2.8l-.1.1a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6H20a2 2 0 0 1 0 4h-.2a1 1 0 0 0-.9.6z" />
    </IconBase>
  );
}

export function CertificateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M7 4h10v8H7z" />
      <path d="M10 12v7l2-1.5L14 19v-7" />
    </IconBase>
  );
}

export function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M4 13h4l2-5l4 9l2-4h4" />
    </IconBase>
  );
}

export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase className="h-4 w-4" {...props}>
      <path d="M16 19v-1a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v1" />
      <path d="M10 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M14 5.2A3 3 0 0 1 14 11" />
    </IconBase>
  );
}
