import type { ReactNode } from "react";

function SvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      {children}
    </svg>
  );
}

export function BackIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></SvgIcon>;
}

export function PlusIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M12 5v14M5 12h14" /></SvgIcon>;
}

export function MonitorIcon() {
  return <SvgIcon><rect x="3" y="4" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M8 20h8M12 16v4" /></SvgIcon>;
}

export function TabletIcon() {
  return <SvgIcon><rect x="5" y="3" width="14" height="18" rx="2.5" /><path strokeLinecap="round" d="M11 18h2" /></SvgIcon>;
}

export function PhoneIcon() {
  return <SvgIcon><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path strokeLinecap="round" d="M11 18.5h2" /></SvgIcon>;
}

export function LayersIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5L12 12 3 7.5 12 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" /></SvgIcon>;
}

export function BoxIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path strokeLinecap="round" d="M8 9h8M8 13h8" /></SvgIcon>;
}

export function ContainerIcon() {
  return <SvgIcon><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path strokeLinecap="round" d="M8 5v14M16 5v14" /></SvgIcon>;
}

export function TextIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h10" /></SvgIcon>;
}

export function HeadingIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 6v12M19 6v12M5 12h14" /><path strokeLinecap="round" d="M12 18h6" /></SvgIcon>;
}

export function ButtonIcon() {
  return <SvgIcon><rect x="4" y="7" width="16" height="10" rx="5" /></SvgIcon>;
}

export function ImageIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 15-4.5-4.5L8 18" /></SvgIcon>;
}

export function StarIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.8 5.67 6.26.91-4.53 4.42 1.07 6.25L12 17.27l-5.6 2.95 1.07-6.25L2.94 9.58l6.26-.91L12 3Z" /></SvgIcon>;
}

export function PlayIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path fill="currentColor" stroke="none" d="m10 9 5 3-5 3V9Z" /></SvgIcon>;
}

export function SparkIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4M12 17v4M4.2 4.2 7 7M17 17l2.8 2.8M3 12h4M17 12h4M4.2 19.8 7 17M17 7l2.8-2.8" /></SvgIcon>;
}

export function SpacerIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" /></SvgIcon>;
}

export function DividerIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M4 12h16" /><path strokeLinecap="round" d="M7 8h10M7 16h10" opacity=".55" /></SvgIcon>;
}

export function ListIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M9 7h11M9 12h11M9 17h11" /><circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" /></SvgIcon>;
}

export function CardIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path strokeLinecap="round" d="M7 9h10M7 13h6" /></SvgIcon>;
}

export function BookIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" /><path strokeLinecap="round" d="M9 7h7M9 11h6" /></SvgIcon>;
}

export function UsersIcon() {
  return <SvgIcon><circle cx="9" cy="8" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path strokeLinecap="round" d="M16 11a2.5 2.5 0 0 0 0-5M18 18a4 4 0 0 0-3-3.8" /></SvgIcon>;
}

export function InfoIcon() {
  return <SvgIcon><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 11v5M12 8h.01" /></SvgIcon>;
}

export function CheckIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" /><circle cx="12" cy="12" r="9" opacity=".35" /></SvgIcon>;
}

export function QuestionIcon() {
  return <SvgIcon><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9a2.7 2.7 0 1 1 4.1 2.3c-.9.6-1.6 1.1-1.6 2.2" /><path strokeLinecap="round" d="M12 17h.01" /></SvgIcon>;
}

export function QuoteIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M8 8H5v5h3v3c0 1.7-1 3-3 3M19 8h-3v5h3v3c0 1.7-1 3-3 3" /></SvgIcon>;
}

export function ChartIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 19V9M12 19V5M19 19v-7" /><path strokeLinecap="round" d="M3 19h18" /></SvgIcon>;
}

export function EyeIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></SvgIcon>;
}

export function EyeOffIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M3 3 21 21" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 6.7C4.3 8.2 3 10.5 3 12c0 0 3.5 6 10 6 1.8 0 3.4-.5 4.8-1.2M9.9 5.1A11.5 11.5 0 0 1 12 5c6.5 0 10 6 10 6-.4.8-1.1 1.8-1.9 2.7" /></SvgIcon>;
}

export function CopyIcon() {
  return <SvgIcon><rect x="8" y="8" width="10" height="10" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" /></SvgIcon>;
}

export function ClipboardIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6l1 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" /><path strokeLinecap="round" d="M9 10h6M9 14h6" /></SvgIcon>;
}

export function TrashIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M4 7h16M10 11v6M14 11v6" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></SvgIcon>;
}

export function UndoIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></SvgIcon>;
}

export function RedoIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></SvgIcon>;
}

export function ChevronIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m8 10 4 4 4-4" /></SvgIcon>;
}

export function UpIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m7 14 5-5 5 5" /></SvgIcon>;
}

export function DownIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" /></SvgIcon>;
}

export function RowDirectionIcon() {
  return <SvgIcon><rect x="4" y="7" width="7" height="10" rx="1.5" /><rect x="13" y="7" width="7" height="10" rx="1.5" /></SvgIcon>;
}

export function ColumnDirectionIcon() {
  return <SvgIcon><rect x="6" y="4" width="12" height="6" rx="1.5" /><rect x="6" y="14" width="12" height="6" rx="1.5" /></SvgIcon>;
}

export function WrapIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M4 7h10a4 4 0 0 1 0 8H8" /><path strokeLinecap="round" strokeLinejoin="round" d="m10 12-4 3 4 3" /></SvgIcon>;
}

export function NoWrapIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M4 12h16" /><path strokeLinecap="round" strokeLinejoin="round" d="m16 8 4 4-4 4" /></SvgIcon>;
}

export function AlignStartIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 5v14M9 8h10M9 16h6" /></SvgIcon>;
}

export function AlignCenterIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M12 5v14M7 8h10M9 16h6" /></SvgIcon>;
}

export function AlignEndIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M19 5v14M5 8h10M9 16h6" /></SvgIcon>;
}

export function AlignBetweenIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 5v14M19 5v14M8 9h8M8 15h8" /></SvgIcon>;
}

export function StretchIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 6v12M19 6v12M8 8h8M8 16h8" /><path strokeLinecap="round" strokeLinejoin="round" d="m8 12 2-2M8 12l2 2M16 12l-2-2M16 12l-2 2" /></SvgIcon>;
}
