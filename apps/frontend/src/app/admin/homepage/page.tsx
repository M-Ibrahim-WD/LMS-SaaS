"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import {
  HomepageCardView,
  HomepageRenderer,
  getContainerStyle,
  type HomepageRendererViewport
} from "../../../components/homepage/homepage-renderer";
import { PublicHomepageHeader } from "../../../components/public-homepage-header";
import { SiteFooter } from "../../../components/site-footer";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import type {
  HomepageAlign,
  HomepageBorder,
  HomepageBorderStyle,
  HomepageBoxSpacing,
  HomepageButtonStyle,
  HomepageCard,
  HomepageCardType,
  HomepageCatalogInstructor,
  HomepageColumn,
  HomepageContainer,
  HomepageContainerAlign,
  HomepageContainerDirection,
  HomepageContainerJustify,
  HomepageContainerWrap,
  HomepageContent,
  HomepageElement,
  HomepageImageFit,
  HomepageImageHeightPreset,
  HomepageImagePosition,
  HomepageInstructorEntry,
  HomepageLengthUnit,
  HomepageLengthValue,
  HomepageResponsiveVisibility,
  HomepageRow,
  HomepageStyleUnit,
  HomepageTextTag,
  HomepageVideoAspectRatio
} from "../../../lib/homepage/types";

type DraftResponse = {
  draftContent: HomepageContent;
  publishedContent: HomepageContent;
  publishedAt?: string | null;
  hasPublishedContent: boolean;
};

type SidebarTab = "CONTENT" | "STYLE" | "ADVANCED";
type SidebarMode = "ELEMENTS" | "NAVIGATOR";
type Selection = { kind: "container"; id: string } | { kind: "widget"; id: string } | null;
type DeleteTarget = Selection;

type WidgetCatalogItem = {
  type: HomepageCardType;
  title: string;
  description: string;
};

function SvgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      {children}
    </svg>
  );
}

function BackIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></SvgIcon>;
}

function PlusIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M12 5v14M5 12h14" /></SvgIcon>;
}

function MonitorIcon() {
  return <SvgIcon><rect x="3" y="4" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M8 20h8M12 16v4" /></SvgIcon>;
}

function TabletIcon() {
  return <SvgIcon><rect x="5" y="3" width="14" height="18" rx="2.5" /><path strokeLinecap="round" d="M11 18h2" /></SvgIcon>;
}

function PhoneIcon() {
  return <SvgIcon><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path strokeLinecap="round" d="M11 18.5h2" /></SvgIcon>;
}

function LayersIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5L12 12 3 7.5 12 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" /></SvgIcon>;
}

function BoxIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><path strokeLinecap="round" d="M8 9h8M8 13h8" /></SvgIcon>;
}

function TextIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h10" /></SvgIcon>;
}

function ButtonIcon() {
  return <SvgIcon><rect x="4" y="7" width="16" height="10" rx="5" /></SvgIcon>;
}

function ImageIcon() {
  return <SvgIcon><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="m20 15-4.5-4.5L8 18" /></SvgIcon>;
}

function StarIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.8 5.67 6.26.91-4.53 4.42 1.07 6.25L12 17.27l-5.6 2.95 1.07-6.25L2.94 9.58l6.26-.91L12 3Z" /></SvgIcon>;
}

function EyeIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></SvgIcon>;
}

function EyeOffIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M3 3 21 21" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.7 6.7C4.3 8.2 3 10.5 3 12c0 0 3.5 6 10 6 1.8 0 3.4-.5 4.8-1.2M9.9 5.1A11.5 11.5 0 0 1 12 5c6.5 0 10 6 10 6-.4.8-1.1 1.8-1.9 2.7" /></SvgIcon>;
}

function CopyIcon() {
  return <SvgIcon><rect x="8" y="8" width="10" height="10" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" /></SvgIcon>;
}

function TrashIcon() {
  return <SvgIcon><path strokeLinecap="round" d="M4 7h16M10 11v6M14 11v6" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></SvgIcon>;
}

function UndoIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></SvgIcon>;
}

function RedoIcon() {
  return <SvgIcon><path strokeLinecap="round" strokeLinejoin="round" d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></SvgIcon>;
}

function isContainer(element: HomepageElement): element is HomepageContainer {
  return element.type === "CONTAINER";
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBox(value: number): HomepageBoxSpacing {
  return { top: value, right: value, bottom: value, left: value, unit: "px", linked: true };
}

function createNoBorder(): HomepageBorder {
  return { enabled: false, width: 0, color: "#0f172a", style: "solid", radius: 0, unit: "px" };
}

function createVisibility(): HomepageResponsiveVisibility {
  return { desktop: true, tablet: true, mobile: true };
}

function createButtonStyle(): HomepageButtonStyle {
  return {
    backgroundColor: "#020617",
    textColor: "#ffffff",
    hoverBackgroundColor: "#0f172a",
    hoverTextColor: "#ffffff",
    border: createNoBorder()
  };
}

function createContainer(children: HomepageElement[] = []): HomepageContainer {
  return {
    id: createId("container"),
    type: "CONTAINER",
    builderLabel: "Container",
    direction: "column",
    wrap: "wrap",
    justify: "start",
    align: "stretch",
    gap: 10,
    visibility: createVisibility(),
    spacing: { padding: createBox(10), margin: createBox(10) },
    background: { color: "transparent" },
    border: createNoBorder(),
    width: { value: 100, unit: "%" },
    children
  };
}

function createWidget(type: HomepageCardType): HomepageCard {
  const base = {
    id: createId("widget"),
    type,
    title: type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
    visibility: createVisibility(),
    spacing: { padding: createBox(0), margin: createBox(0) },
    background: { color: "transparent" },
    border: createNoBorder(),
    buttonStyle: createButtonStyle()
  };

  if (type === "HEADING") return { ...base, type, title: "Heading", textTag: "H2", content: "New heading", textAlign: "left" };
  if (type === "TEXT") return { ...base, type, title: "Text", content: "Write your text here.", textAlign: "left" };
  if (type === "BUTTON") return { ...base, type, title: "Button", label: "Click here", href: "/courses", variant: "primary", textAlign: "left" };
  if (type === "IMAGE_BLOCK") {
    return {
      ...base,
      type,
      title: "Image",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
      altText: "Homepage image",
      caption: "",
      imageHeightPreset: "medium",
      imageFit: "cover",
      imagePosition: "center"
    };
  }
  if (type === "VIDEO") return { ...base, type, title: "Video", videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "", aspectRatio: "16:9" };
  if (type === "ICON") return { ...base, type, title: "Icon", iconSymbol: "*", content: "Icon text", textAlign: "center" };
  if (type === "SPACER") return { ...base, type, title: "Spacer", heightPreset: "medium" };
  if (type === "DIVIDER") return { ...base, type, title: "Divider", dividerStyle: "solid" };
  if (type === "LIST") return { ...base, type, title: "List", items: ["First item", "Second item"] };
  if (type === "CARD") return { ...base, type, title: "Card", subtitle: "Subtitle", body: "Card content.", buttonLabel: "", buttonHref: "" };
  if (type === "COURSE_LIST") return { ...base, type, title: "Course List", items: [] };
  if (type === "INSTRUCTOR_LIST") return { ...base, type, title: "Instructor List", instructors: [] };
  if (type === "FEATURED_INSTRUCTORS") return { ...base, type, title: "Featured Instructors", instructors: [] };
  return {
    ...base,
    type,
    title: type === "ABOUT_US" ? "About Us" : type === "WHY_US" ? "Why Us" : type === "ABOUT_SITE" ? "About This Site" : "Custom Section",
    subtitle: "Who we are",
    body: "Use this block to describe your platform.",
    bullets: ["Clear learning paths", "Modern course experience", "Built for education"]
  };
}

function normalizeRowColumns(row: HomepageRow): HomepageColumn[] {
  if (row.columnsData?.length) return row.columnsData.map((column) => ({ ...column, widgets: column.widgets ?? [] }));
  const slots = row.slots ?? Array.from({ length: row.columns }, () => null);
  return Array.from({ length: row.columns }, (_, index) => ({
    id: `${row.id}-column-${index + 1}`,
    widgets: slots[index] ? [slots[index] as HomepageCard] : []
  }));
}

function rowsToContainers(rows: HomepageRow[]): HomepageContainer[] {
  return rows.map((row) => {
    const columns = normalizeRowColumns(row);
    return {
      ...createContainer(
        columns.map((column) => ({
          ...createContainer(column.widgets),
          id: column.id,
          builderLabel: column.builderLabel || "Container",
          hidden: column.hidden,
          visibility: column.visibility ?? createVisibility(),
          direction: "column",
          gap: column.gapPreset === "tight" ? 12 : column.gapPreset === "loose" ? 28 : 20,
          spacing: column.spacing ?? { padding: createBox(10), margin: createBox(10) },
          background: column.background ?? { color: column.backgroundColor ?? "transparent" },
          border: column.border ?? createNoBorder(),
          width: row.columns === 2 ? { value: 50, unit: "%" } : { value: 100, unit: "%" }
        }))
      ),
      id: row.id,
      builderLabel: row.builderLabel || "Container",
      hidden: row.hidden,
      visibility: row.visibility ?? createVisibility(),
      direction: row.columns === 2 ? "row" : "column",
      gap: row.gapPreset === "tight" ? 12 : row.gapPreset === "loose" ? 28 : 20,
      background: row.background ?? { color: row.backgroundColor ?? "transparent" },
      backgroundImage: row.backgroundImage,
      border: row.border ?? createNoBorder(),
      spacing: row.spacing ?? { padding: createBox(10), margin: createBox(10) }
    };
  });
}

function normalizeContent(content: HomepageContent): HomepageContent {
  const containers = content.containers?.length ? content.containers : rowsToContainers(content.rows ?? []);
  return { ...content, rows: content.rows ?? [], containers };
}

function cloneContent(content: HomepageContent): HomepageContent {
  return normalizeContent(JSON.parse(JSON.stringify(content)) as HomepageContent);
}

function cloneElement<T extends HomepageElement>(element: T): T {
  const cloned = JSON.parse(JSON.stringify(element)) as T;
  const replaceIds = (entry: HomepageElement): HomepageElement => {
    if (isContainer(entry)) {
      return { ...entry, id: createId("container"), children: entry.children.map(replaceIds) };
    }
    return { ...entry, id: createId("widget") };
  };
  return replaceIds(cloned) as T;
}

function updateElementList(elements: HomepageElement[], id: string, updater: (element: HomepageElement) => HomepageElement): HomepageElement[] {
  return elements.map((element) => {
    if (element.id === id) return updater(element);
    if (isContainer(element)) return { ...element, children: updateElementList(element.children, id, updater) };
    return element;
  });
}

function removeElementList(elements: HomepageElement[], id: string): HomepageElement[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) => (isContainer(element) ? { ...element, children: removeElementList(element.children, id) } : element));
}

function addElementToContainer(elements: HomepageElement[], containerId: string | null, child: HomepageElement): HomepageElement[] {
  if (!containerId) return [...elements, child];
  return elements.map((element) => {
    if (isContainer(element) && element.id === containerId) return { ...element, children: [...element.children, child] };
    if (isContainer(element)) return { ...element, children: addElementToContainer(element.children, containerId, child) };
    return element;
  });
}

function findElement(elements: HomepageElement[], id: string | undefined): HomepageElement | null {
  if (!id) return null;
  for (const element of elements) {
    if (element.id === id) return element;
    if (isContainer(element)) {
      const found = findElement(element.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getParentContainerId(elements: HomepageElement[], id: string): string | null {
  for (const element of elements) {
    if (isContainer(element)) {
      if (element.children.some((child) => child.id === id)) return element.id;
      const found = getParentContainerId(element.children, id);
      if (found) return found;
    }
  }
  return null;
}

function getWidgetIcon(type: HomepageCardType) {
  if (type === "HEADING") return <TextIcon />;
  if (type === "TEXT" || type === "LIST") return <TextIcon />;
  if (type === "BUTTON") return <ButtonIcon />;
  if (type === "IMAGE_BLOCK") return <ImageIcon />;
  return <StarIcon />;
}

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function LengthControl({
  label,
  value,
  onChange
}: {
  label: string;
  value?: HomepageLengthValue;
  onChange: (value: HomepageLengthValue | undefined) => void;
}) {
  const length = value ?? {};
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          value={length.value ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? undefined : { ...length, value: Number(event.target.value), unit: length.unit ?? "%" })}
          className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm"
          placeholder="Auto"
        />
        <select
          value={length.unit ?? "%"}
          onChange={(event) => onChange({ ...length, value: length.value ?? 100, unit: event.target.value as HomepageLengthUnit })}
          className="rounded-2xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="%">%</option>
          <option value="px">px</option>
        </select>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
  allowTransparent = true
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
}) {
  const normalized = value && value !== "transparent" ? value : "#ffffff";
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "#ffffff"}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-11 rounded-xl border border-slate-300 bg-white p-1"
        />
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={allowTransparent ? "transparent or #000000" : "#000000"}
          className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm"
        />
        {allowTransparent ? (
          <button type="button" onClick={() => onChange("transparent")} className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
            Clear
          </button>
        ) : null}
      </div>
    </label>
  );
}

function BoxSpacingControl({
  label,
  value,
  onChange
}: {
  label: string;
  value?: HomepageBoxSpacing;
  onChange: (value: HomepageBoxSpacing) => void;
}) {
  const box = value ?? createBox(10);
  const updateSide = (side: "top" | "right" | "bottom" | "left", nextValue: number) => {
    if (box.linked) onChange({ ...box, top: nextValue, right: nextValue, bottom: nextValue, left: nextValue });
    else onChange({ ...box, [side]: nextValue });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <div className="flex gap-2">
          <select value={box.unit} onChange={(event) => onChange({ ...box, unit: event.target.value as HomepageStyleUnit })} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs">
            <option value="px">px</option>
            <option value="%">%</option>
          </select>
          <button type="button" onClick={() => onChange({ ...box, linked: !box.linked })} className={`rounded-full px-2 py-1 text-xs font-semibold ${box.linked ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
            {box.linked ? "Linked" : "Free"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <label key={side}>
            <span className="mb-1 block text-center text-[0.62rem] uppercase tracking-[0.12em] text-slate-500">{side}</span>
            <input type="number" value={box[side]} onChange={(event) => updateSide(side, Number(event.target.value))} className="w-full rounded-xl border border-slate-300 px-2 py-2 text-center text-sm" />
          </label>
        ))}
      </div>
    </div>
  );
}

function BorderControl({ value, onChange }: { value?: HomepageBorder; onChange: (value: HomepageBorder) => void }) {
  const border = value ?? createNoBorder();
  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
        Border
        <input type="checkbox" checked={border.enabled ?? false} onChange={(event) => onChange({ ...border, enabled: event.target.checked, width: event.target.checked ? border.width || 1 : 0 })} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Width</span>
          <input type="number" value={border.width ?? 0} onChange={(event) => onChange({ ...border, width: Number(event.target.value) })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">Radius</span>
          <input type="number" value={border.radius ?? 0} onChange={(event) => onChange({ ...border, radius: Number(event.target.value) })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <ColorControl label="Border color" value={border.color ?? "#000000"} allowTransparent={false} onChange={(color) => onChange({ ...border, color })} />
      <select value={border.style ?? "solid"} onChange={(event) => onChange({ ...border, style: event.target.value as HomepageBorderStyle })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
        <option value="solid">Solid</option>
        <option value="dashed">Dashed</option>
        <option value="dotted">Dotted</option>
      </select>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  active,
  tone = "default",
  disabled
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
}) {
  const toneClass = tone === "danger" ? "text-rose-600 hover:bg-rose-50" : tone === "success" ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-700 hover:bg-slate-100";
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition disabled:opacity-40 ${active ? "bg-slate-950 text-white" : toneClass}`}>
      {children}
    </button>
  );
}

function VisibilityControls({
  visibility,
  onChange
}: {
  visibility?: HomepageResponsiveVisibility;
  onChange: (visibility: HomepageResponsiveVisibility) => void;
}) {
  const current = visibility ?? createVisibility();
  const toggle = (device: keyof HomepageResponsiveVisibility) => onChange({ ...current, [device]: !(current[device] ?? true) });
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Device visibility</p>
      <div className="flex gap-2">
        <IconButton label="Desktop" active={current.desktop ?? true} onClick={() => toggle("desktop")}><MonitorIcon /></IconButton>
        <IconButton label="Tablet" active={current.tablet ?? true} onClick={() => toggle("tablet")}><TabletIcon /></IconButton>
        <IconButton label="Mobile" active={current.mobile ?? true} onClick={() => toggle("mobile")}><PhoneIcon /></IconButton>
      </div>
    </div>
  );
}

const widgetCatalog: WidgetCatalogItem[] = [
  { type: "ABOUT_US", title: "Us", description: "About your team" },
  { type: "WHY_US", title: "Why Us", description: "Benefits block" },
  { type: "ABOUT_SITE", title: "About Site", description: "Platform intro" },
  { type: "TEXT_MEDIA", title: "Custom", description: "Flexible content" },
  { type: "HEADING", title: "Heading", description: "H1-H6 heading" },
  { type: "TEXT", title: "Text", description: "Paragraph text" },
  { type: "BUTTON", title: "Button", description: "Clickable public button" },
  { type: "IMAGE_BLOCK", title: "Image", description: "Uploaded image" },
  { type: "VIDEO", title: "Video", description: "Video embed" },
  { type: "ICON", title: "Icon", description: "Icon text" },
  { type: "SPACER", title: "Spacer", description: "Vertical space" },
  { type: "DIVIDER", title: "Divider", description: "Separator line" },
  { type: "LIST", title: "List", description: "Bullet list" },
  { type: "CARD", title: "Card", description: "Text card" },
  { type: "COURSE_LIST", title: "Courses", description: "Course list" },
  { type: "INSTRUCTOR_LIST", title: "Instructors", description: "Instructor list" },
  { type: "FEATURED_INSTRUCTORS", title: "Featured", description: "Featured instructors" }
];

function DesktopOnlyMessage() {
  return (
    <main className="p-8">
      <ContentCard className="p-6">
        <EmptyState
          title="Homepage editing is desktop only"
          description="Use a desktop-size screen to build and publish the homepage. This builder is intentionally disabled on mobile devices."
          actionHref="/admin/overview"
          actionLabel="Return to overview"
        />
      </ContentCard>
    </main>
  );
}

export default function AdminHomepagePage() {
  const { accessToken, hasHydrated, isAuthorized, user } = useRequireAuth({ roles: ["ADMIN"] });
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [savedDraft, setSavedDraft] = useState<HomepageContent | null>(null);
  const [undoStack, setUndoStack] = useState<HomepageContent[]>([]);
  const [redoStack, setRedoStack] = useState<HomepageContent[]>([]);
  const [hasPendingDraftChanges, setHasPendingDraftChanges] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("ELEMENTS");
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("CONTENT");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [canvasViewport, setCanvasViewport] = useState<HomepageRendererViewport>("desktop");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [showPreviewHeader, setShowPreviewHeader] = useState(true);
  const [showPreviewFooter, setShowPreviewFooter] = useState(true);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [homepageImageFile, setHomepageImageFile] = useState<File | null>(null);
  const [featuredSelection, setFeaturedSelection] = useState<Record<string, string[]>>({});

  const canManageHomepage = Boolean(user?.isSuperAdmin) || Boolean(user?.adminPermissions?.includes("MANAGE_HOMEPAGE"));

  const homepageQuery = useQuery({
    queryKey: ["admin", "homepage", "draft"],
    queryFn: () => apiFetch<DraftResponse>("/admin/homepage", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && canManageHomepage),
    staleTime: 0
  });

  const catalogQuery = useQuery({
    queryKey: ["admin", "homepage", "catalog"],
    queryFn: () => apiFetch<HomepageCatalogInstructor[]>("/admin/homepage/catalog", { token: accessToken ?? undefined }),
    enabled: Boolean(accessToken && canManageHomepage)
  });

  useEffect(() => {
    if (!homepageQuery.data?.draftContent) return;
    const nextDraft = cloneContent(homepageQuery.data.draftContent);
    setDraft((current) => current ?? cloneContent(nextDraft));
    setSavedDraft((current) => current ?? cloneContent(nextDraft));
    setHasPendingDraftChanges(false);
  }, [homepageQuery.data?.draftContent]);

  const workingDraft = draft ?? savedDraft ?? cloneContent(homepageQuery.data?.draftContent ?? { rows: [], containers: [] });
  const publishedPreview = cloneContent(homepageQuery.data?.publishedContent ?? { rows: [], containers: [] });
  const selectedElement = findElement(workingDraft.containers ?? [], selection?.id);
  const selectedContainer = selectedElement && isContainer(selectedElement) ? selectedElement : null;
  const selectedWidget = selectedElement && !isContainer(selectedElement) ? selectedElement : null;
  const targetContainerId = selection?.kind === "container" ? selection.id : selection?.kind === "widget" ? getParentContainerId(workingDraft.containers ?? [], selection.id) : null;

  const filteredWidgets = useMemo(() => {
    const query = widgetSearch.trim().toLowerCase();
    return widgetCatalog.filter((item) => !query || item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query));
  }, [widgetSearch]);

  const selectedImagePreviewUrl = useMemo(() => {
    if (homepageImageFile) return URL.createObjectURL(homepageImageFile);
    return selectedWidget?.type === "IMAGE_BLOCK" ? selectedWidget.imageUrl : null;
  }, [homepageImageFile, selectedWidget]);

  useEffect(() => () => {
    if (homepageImageFile && selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
  }, [homepageImageFile, selectedImagePreviewUrl]);

  const selectedFeatured = useMemo(() => {
    if (selectedWidget?.type !== "FEATURED_INSTRUCTORS") return {};
    return Object.fromEntries(selectedWidget.instructors.map((instructor) => [instructor.id, instructor.courses.map((course) => course.id)]));
  }, [selectedWidget]);

  useEffect(() => {
    if (selectedWidget?.type === "FEATURED_INSTRUCTORS") setFeaturedSelection(selectedFeatured);
  }, [selectedFeatured, selectedWidget?.id, selectedWidget?.type]);

  const saveDraftMutation = useMutation({
    mutationFn: (content: HomepageContent) =>
      apiFetch<{ draftContent: HomepageContent }>("/admin/homepage/draft", {
        method: "PUT",
        token: accessToken ?? undefined,
        body: JSON.stringify(content)
      }),
    onSuccess: (response) => {
      const nextDraft = cloneContent(response.draftContent);
      setDraft(nextDraft);
      setSavedDraft(cloneContent(nextDraft));
      setHasPendingDraftChanges(false);
      setMessage({ type: "success", text: "Homepage draft saved." });
    },
    onError: (error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save homepage draft." })
  });

  const publishDraftMutation = useMutation({
    mutationFn: () => apiFetch<{ publishedContent: HomepageContent }>("/admin/homepage/publish", { method: "POST", token: accessToken ?? undefined }),
    onSuccess: (response) => {
      const published = cloneContent(response.publishedContent);
      setDraft(published);
      setSavedDraft(cloneContent(published));
      setHasPendingDraftChanges(false);
      setPublishConfirmOpen(false);
      setMessage({ type: "success", text: "Homepage published." });
    },
    onError: (error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to publish homepage." })
  });

  const uploadHomepageImageMutation = useMutation({
    mutationFn: async () => {
      if (!homepageImageFile) throw new Error("Please choose an image first.");
      const formData = new FormData();
      formData.append("file", homepageImageFile);
      return apiFetch<{ imageUrl: string }>("/admin/homepage/upload-image", {
        method: "POST",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: (response) => {
      if (selectedWidget?.type === "IMAGE_BLOCK") updateWidget(selectedWidget.id, { imageUrl: response.imageUrl });
      setHomepageImageFile(null);
    },
    onError: (error) => setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to upload homepage image." })
  });

  function setWorkingDraft(nextDraft: HomepageContent) {
    setUndoStack((current) => [...current.slice(-24), cloneContent(workingDraft)]);
    setRedoStack([]);
    setDraft(cloneContent({ ...nextDraft, updatedAt: new Date().toISOString() }));
    setHasPendingDraftChanges(true);
  }

  function updateContainers(nextContainers: HomepageContainer[]) {
    setWorkingDraft({ ...workingDraft, rows: [], containers: nextContainers });
  }

  function updateElement(id: string, updater: (element: HomepageElement) => HomepageElement) {
    updateContainers(updateElementList(workingDraft.containers ?? [], id, updater) as HomepageContainer[]);
  }

  function updateContainer(id: string, patch: Partial<HomepageContainer>) {
    updateElement(id, (element) => (isContainer(element) ? { ...element, ...patch } : element));
  }

  function updateWidget(id: string, patch: Partial<HomepageCard>) {
    updateElement(id, (element) => (!isContainer(element) ? ({ ...element, ...patch } as HomepageCard) : element));
  }

  function addElement(element: HomepageElement) {
    const next = addElementToContainer(workingDraft.containers ?? [], targetContainerId, element) as HomepageContainer[];
    updateContainers(next);
    setSelection({ kind: isContainer(element) ? "container" : "widget", id: element.id });
    setSidebarTab("CONTENT");
  }

  function addRootContainer() {
    const container = createContainer();
    updateContainers([...(workingDraft.containers ?? []), container]);
    setSelection({ kind: "container", id: container.id });
    setSidebarTab("ADVANCED");
  }

  function duplicateSelected(target: Selection) {
    if (!target) return;
    const element = findElement(workingDraft.containers ?? [], target.id);
    if (!element) return;
    const parentId = getParentContainerId(workingDraft.containers ?? [], target.id);
    const cloned = cloneElement(element);
    updateContainers(addElementToContainer(workingDraft.containers ?? [], parentId, cloned) as HomepageContainer[]);
    setSelection({ kind: isContainer(cloned) ? "container" : "widget", id: cloned.id });
  }

  function removeSelected(target: Selection) {
    if (!target) return;
    updateContainers(removeElementList(workingDraft.containers ?? [], target.id) as HomepageContainer[]);
    setSelection(null);
    setDeleteTarget(null);
  }

  function undo() {
    setUndoStack((current) => {
      const previous = current.at(-1);
      if (!previous) return current;
      setRedoStack((redo) => [...redo.slice(-24), cloneContent(workingDraft)]);
      setDraft(cloneContent(previous));
      setHasPendingDraftChanges(true);
      return current.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack((current) => {
      const next = current.at(-1);
      if (!next) return current;
      setUndoStack((undoItems) => [...undoItems.slice(-24), cloneContent(workingDraft)]);
      setDraft(cloneContent(next));
      setHasPendingDraftChanges(true);
      return current.slice(0, -1);
    });
  }

  function applyFeaturedInstructors() {
    if (selectedWidget?.type !== "FEATURED_INSTRUCTORS") return;
    const instructors = (catalogQuery.data ?? [])
      .map((instructor) => {
        const courseIds = featuredSelection[instructor.id] ?? [];
        if (!courseIds.length) return null;
        return {
          id: instructor.id,
          fullName: instructor.fullName,
          bio: instructor.bio,
          profileImage: instructor.profileImage,
          courses: instructor.instructorCourses.filter((course) => courseIds.includes(course.id))
        } satisfies HomepageInstructorEntry;
      })
      .filter(Boolean) as HomepageInstructorEntry[];
    updateWidget(selectedWidget.id, { instructors });
  }

  if (!hasHydrated || !isAuthorized) return null;
  if (typeof window !== "undefined" && window.innerWidth < 1024) return <DesktopOnlyMessage />;

  if (!canManageHomepage) {
    return (
      <main className="p-8">
        <ContentCard className="p-6">
          <EmptyState title="Homepage access required" description="Your admin account does not have permission to manage the homepage." actionHref="/admin/overview" actionLabel="Return to overview" />
        </ContentCard>
      </main>
    );
  }

  const renderNavigatorItems = (elements: HomepageElement[], depth = 0) => (
    <div className="space-y-1">
      {elements.map((element) => {
        const active = selection?.id === element.id;
        return (
          <div key={element.id}>
            <button
              type="button"
              onClick={() => {
                setSelection({ kind: isContainer(element) ? "container" : "widget", id: element.id });
                setSidebarTab("CONTENT");
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-slate-950 text-white" : "hover:bg-slate-100 text-slate-700"}`}
              style={{ paddingLeft: `${12 + depth * 14}px` }}
            >
              {isContainer(element) ? <BoxIcon /> : getWidgetIcon(element.type)}
              <span className="min-w-0 flex-1 truncate">{element.builderLabel || (isContainer(element) ? "Container" : element.title) || "Element"}</span>
            </button>
            {isContainer(element) && element.children.length ? renderNavigatorItems(element.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  const renderCanvasElement = (element: HomepageElement): React.ReactNode => {
    const active = selection?.id === element.id;
    if (isContainer(element)) {
      return (
        <div
          key={element.id}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            setSelection({ kind: "container", id: element.id });
            setSidebarTab("ADVANCED");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelection({ kind: "container", id: element.id });
            }
          }}
          className={`group/container relative min-h-[44px] outline-offset-2 transition ${active ? "outline outline-2 outline-teal-500" : "hover:outline hover:outline-1 hover:outline-teal-300"}`}
          style={getContainerStyle(element, canvasViewport)}
        >
          <span className="pointer-events-none absolute left-2 top-0 z-20 hidden -translate-y-1/2 rounded-full bg-teal-600 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow group-hover/container:inline-flex">
            Container
          </span>
          {element.children.length ? element.children.map(renderCanvasElement) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelection({ kind: "container", id: element.id });
                setSidebarMode("ELEMENTS");
              }}
              className="flex min-h-24 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-400 hover:border-sky-400 hover:text-sky-600"
              title="Add element"
            >
              <PlusIcon />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={element.id}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          setSelection({ kind: "widget", id: element.id });
          setSidebarTab("CONTENT");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelection({ kind: "widget", id: element.id });
          }
        }}
        className={`group/widget relative outline-offset-2 transition ${active ? "outline outline-2 outline-sky-500" : "hover:outline hover:outline-1 hover:outline-sky-300"}`}
      >
        <span className="pointer-events-none absolute left-2 top-0 z-20 hidden -translate-y-1/2 rounded-full bg-sky-600 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow group-hover/widget:inline-flex">
          Widget
        </span>
        <HomepageCardView card={element} viewport={canvasViewport} mode="builder" />
      </div>
    );
  };

  const renderContentTab = () => {
    if (selectedContainer) {
      return (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Navigator label</span>
            <input value={selectedContainer.builderLabel ?? ""} onChange={(event) => updateContainer(selectedContainer.id, { builderLabel: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button type="button" onClick={() => setSidebarMode("ELEMENTS")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            <PlusIcon />
            Add inside this container
          </button>
        </div>
      );
    }

    if (!selectedWidget) return null;

    if (selectedWidget.type === "HEADING") {
      return (
        <div className="space-y-4">
          <select value={selectedWidget.textTag} onChange={(event) => updateWidget(selectedWidget.id, { textTag: event.target.value as Exclude<HomepageTextTag, "P"> })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
            {(["H1", "H2", "H3", "H4", "H5", "H6"] as const).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (selectedWidget.type === "TEXT") {
      return <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={8} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />;
    }

    if (selectedWidget.type === "BUTTON") {
      return (
        <div className="space-y-4">
          <input value={selectedWidget.label} onChange={(event) => updateWidget(selectedWidget.id, { label: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Button label" />
          <input value={selectedWidget.href} onChange={(event) => updateWidget(selectedWidget.id, { href: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="/courses" />
        </div>
      );
    }

    if (selectedWidget.type === "IMAGE_BLOCK") {
      return (
        <div className="space-y-4">
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => setHomepageImageFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
          <button type="button" disabled={!homepageImageFile || uploadHomepageImageMutation.isPending} onClick={() => uploadHomepageImageMutation.mutate()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {uploadHomepageImageMutation.isPending ? "Uploading..." : "Upload image"}
          </button>
          {selectedImagePreviewUrl ? <img src={selectedImagePreviewUrl} alt="Preview" className="h-40 w-full rounded-2xl object-cover" /> : null}
          <input value={selectedWidget.altText ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { altText: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Alt text" />
          <textarea value={selectedWidget.caption ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { caption: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Caption" />
        </div>
      );
    }

    if (selectedWidget.type === "VIDEO") {
      return (
        <div className="space-y-4">
          <input value={selectedWidget.videoUrl} onChange={(event) => updateWidget(selectedWidget.id, { videoUrl: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
          <textarea value={selectedWidget.caption ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { caption: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (selectedWidget.type === "ICON") {
      return <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={4} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />;
    }

    if (selectedWidget.type === "LIST") {
      return <textarea value={selectedWidget.items.join("\n")} onChange={(event) => updateWidget(selectedWidget.id, { items: event.target.value.split("\n").filter(Boolean) })} rows={6} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />;
    }

    if (selectedWidget.type === "FEATURED_INSTRUCTORS") {
      return (
        <div className="space-y-4">
          <button type="button" onClick={applyFeaturedInstructors} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Apply selection</button>
          {(catalogQuery.data ?? []).map((instructor) => (
            <div key={instructor.id} className="rounded-2xl border border-slate-200 p-3">
              <p className="font-semibold text-slate-900">{instructor.fullName}</p>
              <div className="mt-3 space-y-2">
                {instructor.instructorCourses.map((course) => {
                  const checked = featuredSelection[instructor.id]?.includes(course.id) ?? false;
                  return (
                    <label key={course.id} className="flex gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setFeaturedSelection((current) => {
                          const selected = current[instructor.id] ?? [];
                          return { ...current, [instructor.id]: checked ? selected.filter((id) => id !== course.id) : [...selected, course.id] };
                        })}
                      />
                      {course.title}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Title" />
        <input value={selectedWidget.subtitle ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { subtitle: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subtitle" />
        <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Body" />
      </div>
    );
  };

  const renderStyleTab = () => {
    if (selectedContainer) {
      return <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Container layout, background, border, padding, margin, and size live in Advanced.</p>;
    }
    if (!selectedWidget) return null;
    return (
      <div className="space-y-4">
        {"textAlign" in selectedWidget ? (
          <select value={selectedWidget.textAlign ?? "left"} onChange={(event) => updateWidget(selectedWidget.id, { textAlign: event.target.value as HomepageAlign })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
            <option value="left">Left</option>
            <option value="center">Center</option>
          </select>
        ) : null}
        <ColorControl label="Text color" value={selectedWidget.textColor ?? ""} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { textColor: color })} />
        {selectedWidget.type === "BUTTON" || selectedWidget.type === "CARD" ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
            <ColorControl label="Button background" value={selectedWidget.buttonStyle?.backgroundColor ?? "#020617"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), backgroundColor: color } })} />
            <ColorControl label="Button text" value={selectedWidget.buttonStyle?.textColor ?? "#ffffff"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), textColor: color } })} />
            <ColorControl label="Hover background" value={selectedWidget.buttonStyle?.hoverBackgroundColor ?? "#0f172a"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), hoverBackgroundColor: color } })} />
            <ColorControl label="Hover text" value={selectedWidget.buttonStyle?.hoverTextColor ?? "#ffffff"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), hoverTextColor: color } })} />
            <BorderControl value={selectedWidget.buttonStyle?.border} onChange={(border) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), border } })} />
          </div>
        ) : null}
        {selectedWidget.type === "IMAGE_BLOCK" ? (
          <>
            <select value={selectedWidget.imageHeightPreset ?? "medium"} onChange={(event) => updateWidget(selectedWidget.id, { imageHeightPreset: event.target.value as HomepageImageHeightPreset })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="compact">Compact</option>
              <option value="medium">Medium</option>
              <option value="tall">Tall</option>
            </select>
            <select value={selectedWidget.imageFit ?? "cover"} onChange={(event) => updateWidget(selectedWidget.id, { imageFit: event.target.value as HomepageImageFit })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
            </select>
            <select value={selectedWidget.imagePosition ?? "center"} onChange={(event) => updateWidget(selectedWidget.id, { imagePosition: event.target.value as HomepageImagePosition })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="center">Center</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
            </select>
          </>
        ) : null}
        {selectedWidget.type === "VIDEO" ? (
          <select value={selectedWidget.aspectRatio ?? "16:9"} onChange={(event) => updateWidget(selectedWidget.id, { aspectRatio: event.target.value as HomepageVideoAspectRatio })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
          </select>
        ) : null}
      </div>
    );
  };

  const renderAdvancedTab = () => {
    const element = selectedContainer ?? selectedWidget;
    if (!element) return null;
    const updateCommon = (patch: Partial<HomepageContainer> | Partial<HomepageCard>) => {
      if (isContainer(element)) updateContainer(element.id, patch as Partial<HomepageContainer>);
      else updateWidget(element.id, patch as Partial<HomepageCard>);
    };
    return (
      <div className="space-y-5">
        <div className="flex gap-2">
          <IconButton label={element.hidden ? "Show" : "Hide"} tone={element.hidden ? "success" : "default"} onClick={() => updateCommon({ hidden: !element.hidden })}>{element.hidden ? <EyeIcon /> : <EyeOffIcon />}</IconButton>
          <IconButton label="Duplicate" onClick={() => duplicateSelected(selection)}><CopyIcon /></IconButton>
          <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(selection)}><TrashIcon /></IconButton>
        </div>
        <VisibilityControls visibility={element.visibility} onChange={(visibility) => updateCommon({ visibility })} />
        {isContainer(element) ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <select value={element.direction ?? "column"} onChange={(event) => updateContainer(element.id, { direction: event.target.value as HomepageContainerDirection })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                <option value="column">Below each other</option>
                <option value="row">Next to each other</option>
              </select>
              <select value={element.wrap ?? "wrap"} onChange={(event) => updateContainer(element.id, { wrap: event.target.value as HomepageContainerWrap })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                <option value="wrap">Wrap</option>
                <option value="nowrap">No wrap</option>
              </select>
              <select value={element.justify ?? "start"} onChange={(event) => updateContainer(element.id, { justify: event.target.value as HomepageContainerJustify })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
                <option value="between">Space between</option>
              </select>
              <select value={element.align ?? "stretch"} onChange={(event) => updateContainer(element.id, { align: event.target.value as HomepageContainerAlign })} className="rounded-2xl border border-slate-300 px-3 py-2 text-sm">
                <option value="stretch">Stretch</option>
                <option value="start">Start</option>
                <option value="center">Center</option>
                <option value="end">End</option>
              </select>
            </div>
            <label>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Gap</span>
              <input type="number" value={element.gap ?? 10} onChange={(event) => updateContainer(element.id, { gap: Number(event.target.value) })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <LengthControl label="Width" value={element.width} onChange={(width) => updateContainer(element.id, { width })} />
            <LengthControl label="Max width" value={element.maxWidth} onChange={(maxWidth) => updateContainer(element.id, { maxWidth })} />
            <LengthControl label="Min height" value={element.minHeight} onChange={(minHeight) => updateContainer(element.id, { minHeight })} />
            <LengthControl label="Height" value={element.height} onChange={(height) => updateContainer(element.id, { height })} />
          </>
        ) : selectedWidget?.type === "ICON" ? (
          <input value={selectedWidget.iconSymbol} onChange={(event) => updateWidget(selectedWidget.id, { iconSymbol: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Icon symbol" />
        ) : null}
        <BoxSpacingControl label="Padding" value={element.spacing?.padding} onChange={(padding) => updateCommon({ spacing: { ...(element.spacing ?? {}), padding } })} />
        <BoxSpacingControl label="Margin" value={element.spacing?.margin} onChange={(margin) => updateCommon({ spacing: { ...(element.spacing ?? {}), margin } })} />
        <ColorControl label="Background color" value={element.background?.color ?? "transparent"} onChange={(color) => updateCommon({ background: { ...(element.background ?? {}), color } })} />
        {isContainer(element) ? (
          <input value={element.backgroundImage ?? ""} onChange={(event) => updateContainer(element.id, { backgroundImage: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Background image URL" />
        ) : null}
        <BorderControl value={element.border} onChange={(border) => updateCommon({ border })} />
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex h-[4.75rem] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
        <div className="flex items-center gap-3">
          <a href="/admin/overview" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700"><BackIcon /></a>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-teal-700">Homepage</p>
            <h1 className="text-lg font-semibold text-slate-950">Builder</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Undo" disabled={!undoStack.length} onClick={undo}><UndoIcon /></IconButton>
          <IconButton label="Redo" disabled={!redoStack.length} onClick={redo}><RedoIcon /></IconButton>
          <div className="mx-2 flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {(["desktop", "tablet", "mobile"] as const).map((viewport) => (
              <IconButton key={viewport} label={viewport} active={canvasViewport === viewport} onClick={() => setCanvasViewport(viewport)}>
                {viewport === "desktop" ? <MonitorIcon /> : viewport === "tablet" ? <TabletIcon /> : <PhoneIcon />}
              </IconButton>
            ))}
          </div>
          <IconButton label={showPreviewHeader ? "Hide header" : "Show header"} active={showPreviewHeader} onClick={() => setShowPreviewHeader((value) => !value)}><LayersIcon /></IconButton>
          <IconButton label={showPreviewFooter ? "Hide footer" : "Show footer"} active={showPreviewFooter} onClick={() => setShowPreviewFooter((value) => !value)}><BoxIcon /></IconButton>
          {hasPendingDraftChanges ? (
            <button type="button" onClick={() => saveDraftMutation.mutate(workingDraft)} disabled={saveDraftMutation.isPending} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">
              {saveDraftMutation.isPending ? "Saving..." : "Draft"}
            </button>
          ) : null}
          <button type="button" onClick={() => setResetConfirmOpen(true)} disabled={!homepageQuery.data?.hasPublishedContent} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
            Reset
          </button>
          {!hasPendingDraftChanges && savedDraft ? (
            <button type="button" onClick={() => setPublishConfirmOpen(true)} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Publish
            </button>
          ) : null}
        </div>
      </div>

      <div className={`grid min-h-[calc(100vh-4.75rem)] ${sidebarOpen ? "grid-cols-[20rem_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {sidebarOpen ? (
          <aside className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto border-r border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-700">Editor</p>
                <h2 className="text-xl font-semibold text-slate-950">{selection ? (selectedContainer ? "Container" : "Widget") : "Elements"}</h2>
              </div>
              <IconButton label="Close sidebar" onClick={() => setSidebarOpen(false)}><BackIcon /></IconButton>
            </div>

            {message ? <div className="mt-4"><StatusBanner variant={message.type}>{message.text}</StatusBanner></div> : null}
            {homepageQuery.error instanceof Error ? <div className="mt-4"><StatusBanner variant="error">{homepageQuery.error.message}</StatusBanner></div> : null}

            {!selection ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] border border-slate-200 bg-slate-100 p-1">
                  <button type="button" onClick={() => setSidebarMode("ELEMENTS")} className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${sidebarMode === "ELEMENTS" ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}>Elements</button>
                  <button type="button" onClick={() => setSidebarMode("NAVIGATOR")} className={`rounded-2xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${sidebarMode === "NAVIGATOR" ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}>Navigator</button>
                </div>
                {sidebarMode === "ELEMENTS" ? (
                  <div className="mt-4 space-y-4">
                    <button type="button" onClick={() => addElement(createContainer())} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                      <BoxIcon />
                      Container
                    </button>
                    <input value={widgetSearch} onChange={(event) => setWidgetSearch(event.target.value)} placeholder="Search widgets" className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                    <div className="grid grid-cols-2 gap-3">
                      {filteredWidgets.map((item) => (
                        <button key={item.type} type="button" onClick={() => addElement(createWidget(item.type))} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50">
                          {getWidgetIcon(item.type)}
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">{renderNavigatorItems(workingDraft.containers ?? [])}</div>
                )}
              </>
            ) : (
              <>
                <div className="mt-4 flex gap-2 rounded-[20px] border border-slate-200 bg-slate-100 p-1">
                  {(["CONTENT", "STYLE", "ADVANCED"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => setSidebarTab(tab)} className={`flex-1 rounded-2xl px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.11em] ${sidebarTab === tab ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  {sidebarTab === "CONTENT" ? renderContentTab() : sidebarTab === "STYLE" ? renderStyleTab() : renderAdvancedTab()}
                </div>
                <button type="button" onClick={() => { setSelection(null); setSidebarMode("ELEMENTS"); }} className="mt-4 w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  Back to elements
                </button>
              </>
            )}
          </aside>
        ) : (
          <button type="button" onClick={() => setSidebarOpen(true)} className="fixed left-3 top-24 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl">
            <LayersIcon />
          </button>
        )}

        <section className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(16,185,129,0.12),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_44%,#e2e8f0_100%)] px-4 py-5 lg:px-8">
          <div className={`mx-auto transition-all ${canvasViewport === "mobile" ? "max-w-[390px]" : canvasViewport === "tablet" ? "max-w-[820px]" : "max-w-6xl"}`} onClick={() => setSelection(null)}>
            {showPreviewHeader ? <PublicHomepageHeader previewViewport={canvasViewport === "auto" ? "desktop" : canvasViewport} interactive={false} /> : null}
            <div className="mt-6 min-h-[360px]">
              {(workingDraft.containers ?? []).length ? (
                <div className="space-y-6">{workingDraft.containers!.map(renderCanvasElement)}</div>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/45 p-8">
                  <button type="button" onClick={(event) => { event.stopPropagation(); addRootContainer(); }} className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:scale-105" title="Add container">
                    <PlusIcon />
                  </button>
                </div>
              )}
              {(workingDraft.containers ?? []).length ? (
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={(event) => { event.stopPropagation(); addRootContainer(); }} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl" title="Add container">
                    <PlusIcon />
                  </button>
                </div>
              ) : null}
            </div>
            {showPreviewFooter ? <div className="mt-6"><SiteFooter interactive={false} previewViewport={canvasViewport === "auto" ? "desktop" : canvasViewport} /></div> : null}
          </div>
        </section>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-rose-600">Confirm delete</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Delete this element?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">This will remove the selected item and anything inside it. You can still use Undo after deleting.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => removeSelected(deleteTarget)} className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {publishConfirmOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="ui-scrollbar max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-teal-700">Publish confirmation</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Review draft before going live</h3>
              </div>
              <button type="button" onClick={() => setPublishConfirmOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div>
                <h4 className="mb-3 text-lg font-semibold text-slate-950">Current live homepage</h4>
                <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-4">
                  {showPreviewHeader ? <PublicHomepageHeader previewViewport="desktop" interactive={false} /> : null}
                  <div className="mt-6">{homepageQuery.data?.hasPublishedContent ? <HomepageRenderer content={publishedPreview} viewport="desktop" mode="builder" /> : <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">Nothing is published yet.</div>}</div>
                  {showPreviewFooter ? <div className="mt-6"><SiteFooter interactive={false} previewViewport="desktop" /></div> : null}
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-lg font-semibold text-slate-950">Draft that will go live</h4>
                <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-4">
                  {showPreviewHeader ? <PublicHomepageHeader previewViewport="desktop" interactive={false} /> : null}
                  <div className="mt-6"><HomepageRenderer content={workingDraft} viewport="desktop" mode="builder" /></div>
                  {showPreviewFooter ? <div className="mt-6"><SiteFooter interactive={false} previewViewport="desktop" /></div> : null}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPublishConfirmOpen(false)} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => publishDraftMutation.mutate()} disabled={publishDraftMutation.isPending} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {publishDraftMutation.isPending ? "Publishing..." : "Confirm publish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetConfirmOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 px-4">
          <div className="w-full max-w-xl rounded-[30px] bg-white p-6 shadow-2xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-600">Reset draft</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Reset draft to the live homepage?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">This will discard the current draft changes and replace them with the currently published homepage content.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setResetConfirmOpen(false)} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => { const nextDraft = cloneContent(publishedPreview); setDraft(nextDraft); setSavedDraft(cloneContent(nextDraft)); setHasPendingDraftChanges(true); setResetConfirmOpen(false); }} className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white">Reset</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
