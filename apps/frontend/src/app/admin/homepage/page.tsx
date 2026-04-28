"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ContentCard } from "../../../components/content-card";
import { EmptyState } from "../../../components/empty-state";
import {
  HomepageRenderer,
  type HomepageRendererViewport
} from "../../../components/homepage/homepage-renderer";
import { PublicHomepageHeader } from "../../../components/public-homepage-header";
import { SiteFooter } from "../../../components/site-footer";
import { StatusBanner } from "../../../components/status-banner";
import { useRequireAuth } from "../../../hooks/use-require-auth";
import { apiFetch } from "../../../lib/api/client";
import { AdminSiteMenu } from "../_components/admin-site-menu";
import type {
  HomepageAlign,
  HomepageBorderPreset,
  HomepageButtonVariant,
  HomepageCard,
  HomepageCardBackgroundStyle,
  HomepageColumnAlign,
  HomepageCardType,
  HomepageCatalogInstructor,
  HomepageColumn,
  HomepageContent,
  HomepageGapPreset,
  HomepageImageFit,
  HomepageImageHeightPreset,
  HomepageImagePosition,
  HomepageInstructorEntry,
  HomepagePaddingPreset,
  HomepageRadiusPreset,
  HomepageResponsiveVisibility,
  HomepageRow,
  HomepageRowBackgroundStyle,
  HomepageRowOrder,
  HomepageSizePreset,
  HomepageSpacingPreset,
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
type LibraryTab = "ELEMENTS" | "SECTIONS" | "NAVIGATOR";
type SidebarSelection =
  | { kind: "library"; rowId?: string; columnId?: string; insertIndex?: number }
  | { kind: "row"; rowId: string }
  | { kind: "column"; rowId: string; columnId: string }
  | { kind: "widget"; rowId: string; columnId: string; widgetId: string };
type SectionInsertTarget = { index: number } | null;
type DeleteTarget =
  | { kind: "row"; rowId: string }
  | { kind: "widget"; rowId: string; columnId: string; widgetId: string }
  | null;

type WidgetCatalogItem = {
  type: HomepageCardType;
  title: string;
  subtitle: string;
  body: string;
  group: "Sections" | "Elements" | "Dynamic";
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 14 5-5-5-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 9H10a6 6 0 0 0 0 12h3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8M12 16v4" />
    </svg>
  );
}

function TabletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path strokeLinecap="round" d="M11 18h2" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path strokeLinecap="round" d="M11 18.5h2" />
    </svg>
  );
}

function OneColumnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function TwoColumnsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="4" y="5" width="7" height="14" rx="2" />
      <rect x="13" y="5" width="7" height="14" rx="2" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 4.5L12 12 3 7.5 12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12 9 4.5 9-4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 16.5 9 4.5 9-4.5" />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3 21 21" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2 2 0 0 0 10 12a2 2 0 0 0 3.42 1.42" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.71 6.72C4.31 8.22 3 10.5 3 12c0 0 3.5 6 10 6 1.8 0 3.38-.47 4.75-1.19" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.08A11.5 11.5 0 0 1 12 5c6.5 0 10 6 10 6a16.4 16.4 0 0 1-1.92 2.67" />
    </svg>
  );
}

function HeadingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 6v12M19 6v12M5 12h14" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" d="M5 7h14M5 12h14M5 17h10" />
    </svg>
  );
}

function ButtonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="4" y="7" width="16" height="10" rx="5" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m20 15-4.5-4.5L8 18" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m17 10 4-2v8l-4-2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.8 5.67 6.26.91-4.53 4.42 1.07 6.25L12 17.27l-5.6 2.95 1.07-6.25L2.94 9.58l6.26-.91L12 3Z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4.13A4 4 0 0 1 17 8" />
    </svg>
  );
}

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

function VisibilityToggle({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white text-slate-500"
      }`}
    >
      {icon}
    </button>
  );
}

function IconActionButton({
  label,
  title,
  tone = "default",
  size = "default",
  onClick,
  children
}: {
  label: string;
  title?: string;
  tone?: "default" | "danger" | "warning" | "success";
  size?: "default" | "small";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50";

  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border transition ${size === "small" ? "h-8 w-8" : "h-10 w-10"} ${toneClass}`}
    >
      {children}
    </button>
  );
}

const textTagOptions: HomepageTextTag[] = ["H1", "H2", "H3", "H4", "H5", "H6", "P"];
const rowBackgroundOptions: HomepageRowBackgroundStyle[] = ["plain", "soft", "highlight"];
const rowPaddingOptions: HomepagePaddingPreset[] = ["compact", "comfortable", "spacious"];
const rowGapOptions: HomepageGapPreset[] = ["tight", "normal", "loose"];
const cardBackgroundOptions: HomepageCardBackgroundStyle[] = ["surface", "muted", "highlight"];
const cardRadiusOptions: HomepageRadiusPreset[] = ["soft", "rounded", "pill"];
const cardSpacingOptions: HomepageSpacingPreset[] = ["compact", "comfortable", "spacious"];
const cardImageHeightOptions: HomepageImageHeightPreset[] = ["compact", "medium", "tall"];
const buttonVariants: HomepageButtonVariant[] = ["primary", "secondary", "ghost"];
const textAlignOptions: HomepageAlign[] = ["left", "center"];
const videoRatioOptions: HomepageVideoAspectRatio[] = ["16:9", "4:3", "1:1"];
const sizeOptions: HomepageSizePreset[] = ["none", "small", "medium", "large"];
const borderOptions: HomepageBorderPreset[] = ["none", "soft", "strong"];
const widthOptions = ["auto", "full", "narrow"] as const;
const columnAlignOptions: HomepageColumnAlign[] = ["start", "center", "end"];
const imageFitOptions: HomepageImageFit[] = ["cover", "contain"];
const imagePositionOptions: HomepageImagePosition[] = ["center", "top", "bottom"];

const widgetCatalog: WidgetCatalogItem[] = [
  {
    type: "ABOUT_US",
    title: "Us",
    subtitle: "Preset section",
    body: "A ready-made section for who you are, your mission, and your team.",
    group: "Sections"
  },
  {
    type: "WHY_US",
    title: "Why Us",
    subtitle: "Preset section",
    body: "A section for reasons, advantages, and trust-building highlights.",
    group: "Sections"
  },
  {
    type: "ABOUT_SITE",
    title: "About This Site",
    subtitle: "Preset section",
    body: "A section for what the platform offers and how the experience works.",
    group: "Sections"
  },
  {
    type: "TEXT_MEDIA",
    title: "Custom Section",
    subtitle: "Preset section",
    body: "A flexible homepage section with editable title, subtitle, body, and bullets.",
    group: "Sections"
  },
  {
    type: "HEADING",
    title: "Heading",
    subtitle: "Basic element",
    body: "Add H1, H2, H3, H4, H5, or H6 headings like Elementor.",
    group: "Elements"
  },
  {
    type: "TEXT",
    title: "Text",
    subtitle: "Basic element",
    body: "Add paragraph text blocks with clean spacing and alignment controls.",
    group: "Elements"
  },
  {
    type: "BUTTON",
    title: "Button",
    subtitle: "Basic element",
    body: "Add call-to-action buttons with label, link, and style options.",
    group: "Elements"
  },
  {
    type: "IMAGE_BLOCK",
    title: "Image",
    subtitle: "Media element",
    body: "Upload an image directly and place it inside any column.",
    group: "Elements"
  },
  {
    type: "VIDEO",
    title: "Video",
    subtitle: "Media element",
    body: "Embed YouTube or other supported video URLs with caption support.",
    group: "Elements"
  },
  {
    type: "ICON",
    title: "Icon",
    subtitle: "Basic element",
    body: "Use a symbol or emoji with supporting text, like a simple Elementor icon box.",
    group: "Elements"
  },
  {
    type: "SPACER",
    title: "Spacer",
    subtitle: "Layout element",
    body: "Add vertical breathing room between widgets.",
    group: "Elements"
  },
  {
    type: "DIVIDER",
    title: "Divider",
    subtitle: "Layout element",
    body: "Separate content with a clean horizontal rule.",
    group: "Elements"
  },
  {
    type: "LIST",
    title: "List",
    subtitle: "Basic element",
    body: "Create a simple bullet list with editable items.",
    group: "Elements"
  },
  {
    type: "CARD",
    title: "Card",
    subtitle: "Basic element",
    body: "Create a compact content card with an optional button.",
    group: "Elements"
  },
  {
    type: "FEATURED_INSTRUCTORS",
    title: "Featured Instructors",
    subtitle: "Dynamic widget",
    body: "Select instructors and courses to surface dynamically on the homepage.",
    group: "Dynamic"
  },
  {
    type: "COURSE_LIST",
    title: "Course List",
    subtitle: "Dynamic widget",
    body: "Show a manually selected set of courses.",
    group: "Dynamic"
  },
  {
    type: "INSTRUCTOR_LIST",
    title: "Instructor List",
    subtitle: "Dynamic widget",
    body: "Show a manually selected set of instructors.",
    group: "Dynamic"
  }
];

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createVisibility(): HomepageResponsiveVisibility {
  return { desktop: true, tablet: true, mobile: true };
}

function createColumn(): HomepageColumn {
  return {
    id: createId("column"),
    widgets: []
  };
}

function createRow(columns: 1 | 2): HomepageRow {
  return {
    id: createId("row"),
    columns,
    mobileOrder: "FIRST_SLOT_FIRST",
    tabletOrder: "FIRST_SLOT_FIRST",
    backgroundStyle: "plain",
    paddingPreset: "comfortable",
    gapPreset: "normal",
    visibility: createVisibility(),
    columnsData: Array.from({ length: columns }, () => createColumn())
  };
}

function createWidget(type: HomepageCardType): HomepageCard {
  if (type === "HEADING") {
    return {
      id: createId("widget"),
      type,
      title: "Heading",
      content: "Write your heading here.",
      textTag: "H2",
      textAlign: "left",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "TEXT") {
    return {
      id: createId("widget"),
      type,
      title: "Text",
      content: "Write your paragraph text here.",
      textAlign: "left",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "BUTTON") {
    return {
      id: createId("widget"),
      type,
      title: "Button",
      label: "Explore courses",
      href: "/courses",
      variant: "primary",
      textAlign: "left",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "compact",
      visibility: createVisibility()
    };
  }

  if (type === "IMAGE_BLOCK") {
    return {
      id: createId("widget"),
      type,
      title: "Image",
      imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80",
      altText: "Homepage image",
      caption: "",
      imageHeightPreset: "medium",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "compact",
      visibility: createVisibility()
    };
  }

  if (type === "VIDEO") {
    return {
      id: createId("widget"),
      type,
      title: "Video",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      caption: "",
      aspectRatio: "16:9",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "compact",
      visibility: createVisibility()
    };
  }

  if (type === "ICON") {
    return {
      id: createId("widget"),
      type,
      title: "Icon",
      iconSymbol: "★",
      content: "Add a short supporting statement for this icon item.",
      textAlign: "left",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "FEATURED_INSTRUCTORS") {
    return {
      id: createId("widget"),
      type,
      title: "Featured Instructors",
      subtitle: "Suggested educators",
      body: "Choose instructors and the courses you want to spotlight on the public homepage.",
      instructors: [],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "SPACER") {
    return {
      id: createId("widget"),
      type,
      title: "Spacer",
      heightPreset: "medium",
      backgroundStyle: "surface",
      radiusPreset: "soft",
      spacingPreset: "compact",
      visibility: createVisibility()
    };
  }

  if (type === "DIVIDER") {
    return {
      id: createId("widget"),
      type,
      title: "Divider",
      dividerStyle: "solid",
      marginPreset: "medium",
      backgroundStyle: "surface",
      radiusPreset: "soft",
      spacingPreset: "compact",
      visibility: createVisibility()
    };
  }

  if (type === "LIST") {
    return {
      id: createId("widget"),
      type,
      title: "List",
      items: ["First item", "Second item", "Third item"],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "CARD") {
    return {
      id: createId("widget"),
      type,
      title: "Card title",
      subtitle: "Card subtitle",
      body: "Write a short card description.",
      buttonLabel: "",
      buttonHref: "",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "COURSE_LIST") {
    return {
      id: createId("widget"),
      type,
      title: "Course List",
      items: [],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "INSTRUCTOR_LIST") {
    return {
      id: createId("widget"),
      type,
      title: "Instructor List",
      instructors: [],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "ABOUT_US") {
    return {
      id: createId("widget"),
      type,
      title: "About Us",
      subtitle: "Who we are",
      body: "Introduce the people, mission, and story behind the platform in a warm and trustworthy way.",
      bullets: ["Mission-driven team", "Calm product experience", "Built for real education workflows"],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "WHY_US") {
    return {
      id: createId("widget"),
      type,
      title: "Why Us",
      subtitle: "What makes us different",
      body: "Highlight the value learners and instructors get from choosing your platform.",
      bullets: [
        "Clear learning paths for students.",
        "Organized tools for instructors.",
        "One platform for courses, messaging, and support."
      ],
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  if (type === "ABOUT_SITE") {
    return {
      id: createId("widget"),
      type,
      title: "About This Site",
      subtitle: "Platform overview",
      body: "Explain what visitors can do here, how the learning experience works, and what the site offers.",
      backgroundStyle: "surface",
      radiusPreset: "rounded",
      spacingPreset: "comfortable",
      visibility: createVisibility()
    };
  }

  return {
    id: createId("widget"),
    type,
    title: "Custom Section",
    subtitle: "Flexible content",
    body: "Use this block for any text-first section such as testimonials, a mission statement, or a featured message.",
    bullets: [],
    backgroundStyle: "surface",
    radiusPreset: "rounded",
    spacingPreset: "comfortable",
    visibility: createVisibility()
  };
}

function cloneWidget(widget: HomepageCard): HomepageCard {
  if (widget.type === "FEATURED_INSTRUCTORS") {
    return {
      ...widget,
      visibility: widget.visibility ? { ...widget.visibility } : undefined,
      instructors: widget.instructors.map((instructor) => ({
        ...instructor,
        courses: instructor.courses.map((course) => ({ ...course }))
      }))
    };
  }

  if ("bullets" in widget && widget.bullets) {
    return {
      ...widget,
      visibility: widget.visibility ? { ...widget.visibility } : undefined,
      bullets: [...widget.bullets]
    };
  }

  return {
    ...widget,
    visibility: widget.visibility ? { ...widget.visibility } : undefined
  };
}

function normalizeRow(row: HomepageRow): HomepageRow {
  if (row.columnsData?.length) {
    return {
      ...row,
      columnsData: row.columnsData.map((column, index) => ({
        ...column,
        id: column.id || `${row.id}-column-${index + 1}`,
        widgets: (column.widgets ?? []).map(cloneWidget)
      })),
      slots: undefined
    };
  }

  const slotSource = row.slots ?? Array.from({ length: row.columns }, () => null);
  return {
    ...row,
    columnsData: Array.from({ length: row.columns }, (_, index) => ({
      id: createId("column"),
      widgets: slotSource[index] ? [cloneWidget(slotSource[index] as HomepageCard)] : []
    })),
    slots: undefined
  };
}

function cloneContent(content: HomepageContent): HomepageContent {
  return {
    ...content,
    rows: content.rows.map(normalizeRow)
  };
}

function findRow(rows: HomepageRow[], rowId: string) {
  return rows.find((row) => row.id === rowId) ?? null;
}

function findColumn(row: HomepageRow | null, columnId: string) {
  return row?.columnsData?.find((column) => column.id === columnId) ?? null;
}

function findWidget(row: HomepageRow | null, columnId: string, widgetId: string) {
  return findColumn(row, columnId)?.widgets.find((widget) => widget.id === widgetId) ?? null;
}

function formatPresetLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getRowLabel(row: HomepageRow, rowIndex: number) {
  return row.builderLabel?.trim() || `Section ${rowIndex + 1}`;
}

function getColumnLabel(column: HomepageColumn, columnIndex: number) {
  return column.builderLabel?.trim() || `Column ${columnIndex + 1}`;
}

function getWidgetLabel(widget: HomepageCard) {
  return widget.builderLabel?.trim() || widget.title || widget.type.replaceAll("_", " ");
}

function getCanvasRowClasses(selected: boolean) {
  return `group/section relative rounded-[18px] transition ${selected ? "ring-2 ring-slate-950 ring-offset-2 ring-offset-slate-50" : "hover:ring-1 hover:ring-slate-400"}`;
}

function getCanvasColumnClasses(selected: boolean) {
  return `group/column relative min-h-[220px] rounded-[14px] border border-dashed bg-white/35 p-4 transition ${
    selected ? "border-teal-500 ring-2 ring-teal-300 ring-offset-2 ring-offset-white" : "border-slate-200 hover:border-teal-300"
  }`;
}

function getCanvasWidgetClasses(selected: boolean) {
  return `group/widget relative cursor-pointer rounded-[16px] transition ${selected ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-white" : "hover:ring-1 hover:ring-sky-300 hover:shadow-lg"}`;
}

function getOrderedColumns(row: HomepageRow, viewport: HomepageRendererViewport) {
  const columns = row.columnsData ?? [];
  if (columns.length !== 2) {
    return columns.map((column) => ({ column, originalIndex: 0 }));
  }

  const order =
    viewport === "tablet"
      ? row.tabletOrder ?? "FIRST_SLOT_FIRST"
      : viewport === "mobile"
        ? row.mobileOrder ?? "FIRST_SLOT_FIRST"
        : "FIRST_SLOT_FIRST";

  const mapped = columns.map((column, index) => ({ column, originalIndex: index }));
  return order === "SECOND_SLOT_FIRST" && viewport !== "desktop" ? [...mapped].reverse() : mapped;
}

export default function AdminHomepagePage() {
  const { accessToken, hasHydrated, isAuthorized, user } = useRequireAuth({ roles: ["ADMIN"] });
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [savedDraft, setSavedDraft] = useState<HomepageContent | null>(null);
  const [undoStack, setUndoStack] = useState<HomepageContent[]>([]);
  const [redoStack, setRedoStack] = useState<HomepageContent[]>([]);
  const [hasPendingDraftChanges, setHasPendingDraftChanges] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sidebarSelection, setSidebarSelection] = useState<SidebarSelection>({ kind: "library" });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("CONTENT");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("ELEMENTS");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [homepageImageFile, setHomepageImageFile] = useState<File | null>(null);
  const [featuredSelection, setFeaturedSelection] = useState<Record<string, string[]>>({});
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [sectionInsertTarget, setSectionInsertTarget] = useState<SectionInsertTarget>(null);
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<{ rowId: string; columnId: string; widgetId: string } | null>(null);
  const [isMobileEditor, setIsMobileEditor] = useState(false);
  const [canvasViewport, setCanvasViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const canManageHomepage =
    Boolean(user?.isSuperAdmin) || Boolean(user?.adminPermissions?.includes("MANAGE_HOMEPAGE"));

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
    if (!homepageQuery.data?.draftContent) {
      return;
    }

    const nextDraft = cloneContent(homepageQuery.data.draftContent);
    setDraft((current) => current ?? cloneContent(nextDraft));
    setSavedDraft((current) => current ?? cloneContent(nextDraft));
    setHasPendingDraftChanges(false);
  }, [homepageQuery.data?.draftContent]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileEditor(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  const workingDraft = draft ?? savedDraft ?? cloneContent(homepageQuery.data?.draftContent ?? { rows: [] });
  const publishedPreview = cloneContent(homepageQuery.data?.publishedContent ?? { rows: [] });

  const selectedRow = useMemo(() => {
    if (sidebarSelection.kind === "row" || sidebarSelection.kind === "column" || sidebarSelection.kind === "widget") {
      return findRow(workingDraft.rows, sidebarSelection.rowId);
    }
    return null;
  }, [sidebarSelection, workingDraft.rows]);

  const selectedColumn = useMemo(() => {
    if (sidebarSelection.kind === "column" || sidebarSelection.kind === "widget") {
      return findColumn(selectedRow, sidebarSelection.columnId);
    }
    return null;
  }, [selectedRow, sidebarSelection]);

  const selectedWidget = useMemo(() => {
    if (sidebarSelection.kind === "widget") {
      return findWidget(selectedRow, sidebarSelection.columnId, sidebarSelection.widgetId);
    }
    return null;
  }, [selectedRow, sidebarSelection]);

  const homepageImagePreviewUrl = useMemo(() => {
    if (homepageImageFile) {
      return URL.createObjectURL(homepageImageFile);
    }
    return selectedWidget?.type === "IMAGE_BLOCK" ? selectedWidget.imageUrl : null;
  }, [homepageImageFile, selectedWidget]);

  useEffect(() => {
    return () => {
      if (homepageImageFile && homepageImagePreviewUrl) {
        URL.revokeObjectURL(homepageImagePreviewUrl);
      }
    };
  }, [homepageImageFile, homepageImagePreviewUrl]);

  useEffect(() => {
    if (selectedWidget?.type === "FEATURED_INSTRUCTORS") {
      setFeaturedSelection(
        Object.fromEntries(
          selectedWidget.instructors.map((instructor) => [
            instructor.id,
            instructor.courses.map((course) => course.id)
          ])
        )
      );
      return;
    }
    setFeaturedSelection({});
  }, [selectedWidget]);

  const featuredSummary = useMemo(() => {
    return Object.entries(featuredSelection)
      .map(([instructorId, courseIds]) => {
        const instructor = (catalogQuery.data ?? []).find((entry) => entry.id === instructorId);
        if (!instructor || !courseIds.length) {
          return null;
        }

        return {
          id: instructor.id,
          fullName: instructor.fullName,
          bio: instructor.bio,
          profileImage: instructor.profileImage,
          courses: instructor.instructorCourses.filter((course) => courseIds.includes(course.id))
        } satisfies HomepageInstructorEntry;
      })
      .filter(Boolean) as HomepageInstructorEntry[];
  }, [catalogQuery.data, featuredSelection]);

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
    onError: (error) => {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save homepage draft." });
    }
  });

  const publishDraftMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ publishedContent: HomepageContent }>("/admin/homepage/publish", {
        method: "POST",
        token: accessToken ?? undefined
      }),
    onSuccess: (response) => {
      const published = cloneContent(response.publishedContent);
      setDraft(published);
      setSavedDraft(cloneContent(published));
      setHasPendingDraftChanges(false);
      setPublishConfirmOpen(false);
      setMessage({ type: "success", text: "Homepage draft published successfully." });
    },
    onError: (error) => {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to publish homepage." });
    }
  });

  const uploadHomepageImageMutation = useMutation({
    mutationFn: async () => {
      if (!homepageImageFile) {
        throw new Error("Please choose an image first.");
      }

      const formData = new FormData();
      formData.append("file", homepageImageFile);
      return apiFetch<{ imageUrl: string }>("/admin/homepage/upload-image", {
        method: "POST",
        token: accessToken ?? undefined,
        body: formData
      });
    },
    onSuccess: (response) => {
      if (selectedWidget?.type === "IMAGE_BLOCK" && sidebarSelection.kind === "widget") {
        updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, {
          imageUrl: response.imageUrl
        });
      }
      setHomepageImageFile(null);
    },
    onError: (error) => {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to upload homepage image." });
    }
  });

  function setWorkingDraft(nextDraft: HomepageContent) {
    setUndoStack((current) => [...current.slice(-24), cloneContent(workingDraft)]);
    setRedoStack([]);
    setDraft(cloneContent(nextDraft));
    setHasPendingDraftChanges(true);
  }

  function undoLastChange() {
    setUndoStack((current) => {
      const previous = current[current.length - 1];
      if (!previous) {
        return current;
      }
      setRedoStack((redo) => [...redo.slice(-24), cloneContent(workingDraft)]);
      setDraft(cloneContent(previous));
      setHasPendingDraftChanges(true);
      return current.slice(0, -1);
    });
  }

  function redoLastChange() {
    setRedoStack((current) => {
      const next = current[current.length - 1];
      if (!next) {
        return current;
      }
      setUndoStack((undo) => [...undo.slice(-24), cloneContent(workingDraft)]);
      setDraft(cloneContent(next));
      setHasPendingDraftChanges(true);
      return current.slice(0, -1);
    });
  }

  function updateRows(nextRows: HomepageRow[]) {
    setWorkingDraft({
      ...workingDraft,
      updatedAt: new Date().toISOString(),
      rows: nextRows.map(normalizeRow)
    });
  }

  function updateRow(rowId: string, updater: (row: HomepageRow) => HomepageRow) {
    updateRows(workingDraft.rows.map((row) => (row.id === rowId ? normalizeRow(updater(normalizeRow(row))) : normalizeRow(row))));
  }

  function updateColumn(rowId: string, columnId: string, updater: (column: HomepageColumn) => HomepageColumn) {
    updateRow(rowId, (row) => ({
      ...row,
      columnsData: (row.columnsData ?? []).map((column) => (column.id === columnId ? updater(column) : column))
    }));
  }

  function updateWidget(rowId: string, columnId: string, widgetId: string, patch: Partial<HomepageCard>) {
    updateColumn(rowId, columnId, (column) => ({
      ...column,
      widgets: column.widgets.map((widget) => (widget.id === widgetId ? ({ ...widget, ...patch } as HomepageCard) : widget))
    }));
  }

  function addRow(columns: 1 | 2) {
    setMessage(null);
    addRowAt(columns, workingDraft.rows.length);
  }

  function addRowAt(columns: 1 | 2, index: number) {
    setMessage(null);
    const nextRow = createRow(columns);
    const nextRows = [...workingDraft.rows];
    nextRows.splice(index, 0, nextRow);
    updateRows(nextRows);
    const firstColumn = nextRow.columnsData?.[0];
    setSidebarSelection({ kind: "library", rowId: nextRow.id, columnId: firstColumn?.id });
    setLibraryTab("ELEMENTS");
    setSectionInsertTarget(null);
  }

  function removeRow(rowId: string) {
    updateRows(workingDraft.rows.filter((row) => row.id !== rowId));
    setSidebarSelection({ kind: "library" });
    setDeleteTarget(null);
  }

  function duplicateRow(rowId: string) {
    const rowIndex = workingDraft.rows.findIndex((row) => row.id === rowId);
    if (rowIndex === -1) {
      return;
    }
    const source = workingDraft.rows[rowIndex];
    const duplicated = normalizeRow({
      ...source,
      id: createId("row"),
      columnsData: (source.columnsData ?? []).map((column) => ({
        ...column,
        id: createId("column"),
        widgets: column.widgets.map((widget) => ({ ...cloneWidget(widget), id: createId("widget"), hidden: false }))
      }))
    });
    const nextRows = [...workingDraft.rows];
    nextRows.splice(rowIndex + 1, 0, duplicated);
    updateRows(nextRows);
  }

  function reorderRows(sourceRowId: string, targetRowId: string) {
    if (sourceRowId === targetRowId) {
      return;
    }
    const sourceIndex = workingDraft.rows.findIndex((row) => row.id === sourceRowId);
    const targetIndex = workingDraft.rows.findIndex((row) => row.id === targetRowId);
    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }
    const nextRows = [...workingDraft.rows];
    const [moved] = nextRows.splice(sourceIndex, 1);
    nextRows.splice(targetIndex, 0, moved);
    updateRows(nextRows);
  }

  function updateRowColumns(rowId: string, columns: 1 | 2) {
    updateRow(rowId, (row) => {
      const currentColumns = row.columnsData ?? [];
      if (columns === row.columns) {
        return row;
      }
      if (columns === 2) {
        return {
          ...row,
          columns: 2,
          columnsData: [currentColumns[0] ?? createColumn(), currentColumns[1] ?? createColumn()]
        };
      }
      const first = currentColumns[0] ?? createColumn();
      const second = currentColumns[1];
      return {
        ...row,
        columns: 1,
        columnsData: [
          {
            ...first,
            widgets: [...first.widgets, ...(second?.widgets ?? [])]
          }
        ]
      };
    });
  }

  function updateRowOrder(rowId: string, field: "tabletOrder" | "mobileOrder", value: HomepageRowOrder) {
    updateRow(rowId, (row) => ({ ...row, [field]: value }));
  }

  function updateRowStyleField(
    rowId: string,
    field: "backgroundStyle" | "paddingPreset" | "gapPreset" | "backgroundColor" | "backgroundImage" | "marginPreset" | "minHeightPreset" | "borderPreset" | "radiusPreset",
    value: HomepageRowBackgroundStyle | HomepagePaddingPreset | HomepageGapPreset | HomepageSizePreset | HomepageBorderPreset | HomepageRadiusPreset | string
  ) {
    updateRow(rowId, (row) => ({ ...row, [field]: value }));
  }

  function updateColumnStyleField(
    rowId: string,
    columnId: string,
    field: "builderLabel" | "backgroundColor" | "paddingPreset" | "gapPreset" | "verticalAlign" | "horizontalAlign",
    value: string
  ) {
    updateColumn(rowId, columnId, (column) => ({ ...column, [field]: value }));
  }

  function updateRowVisibility(rowId: string, key: keyof HomepageResponsiveVisibility, value: boolean) {
    updateRow(rowId, (row) => ({
      ...row,
      visibility: {
        ...createVisibility(),
        ...row.visibility,
        [key]: value
      }
    }));
  }

  function toggleRowHidden(rowId: string) {
    updateRow(rowId, (row) => ({ ...row, hidden: !row.hidden }));
  }

  function openLibraryTarget(rowId?: string, columnId?: string, insertIndex?: number) {
    setSidebarSelection({ kind: "library", rowId, columnId, insertIndex });
    setLibraryTab("ELEMENTS");
    setSidebarTab("CONTENT");
  }

  function selectRow(rowId: string) {
    setSidebarSelection({ kind: "row", rowId });
    setSidebarTab("CONTENT");
  }

  function selectColumn(rowId: string, columnId: string) {
    setSidebarSelection({ kind: "column", rowId, columnId });
    setSidebarTab("CONTENT");
  }

  function selectWidget(rowId: string, columnId: string, widgetId: string) {
    setSidebarSelection({ kind: "widget", rowId, columnId, widgetId });
    setSidebarTab("CONTENT");
  }

  function addWidgetToTarget(type: HomepageCardType) {
    if (sidebarSelection.kind !== "library" || !sidebarSelection.rowId || !sidebarSelection.columnId) {
      return;
    }
    const nextWidget = createWidget(type);
    updateColumn(sidebarSelection.rowId, sidebarSelection.columnId, (column) => {
      const widgets = [...column.widgets];
      widgets.splice(sidebarSelection.insertIndex ?? widgets.length, 0, nextWidget);
      return { ...column, widgets };
    });

    setSidebarSelection({ kind: "widget", rowId: sidebarSelection.rowId, columnId: sidebarSelection.columnId, widgetId: nextWidget.id });
  }

  function duplicateWidget(rowId: string, columnId: string, widgetId: string) {
    updateColumn(rowId, columnId, (column) => {
      const widgetIndex = column.widgets.findIndex((widget) => widget.id === widgetId);
      if (widgetIndex === -1) {
        return column;
      }
      const duplicated = { ...cloneWidget(column.widgets[widgetIndex]), id: createId("widget"), hidden: false };
      const widgets = [...column.widgets];
      widgets.splice(widgetIndex + 1, 0, duplicated);
      return { ...column, widgets };
    });
  }

  function removeWidget(rowId: string, columnId: string, widgetId: string) {
    updateColumn(rowId, columnId, (column) => ({
      ...column,
      widgets: column.widgets.filter((widget) => widget.id !== widgetId)
    }));
    setSidebarSelection({ kind: "column", rowId, columnId });
    setDeleteTarget(null);
  }

  function toggleWidgetHidden(rowId: string, columnId: string, widgetId: string) {
    const widget = findWidget(findRow(workingDraft.rows, rowId), columnId, widgetId);
    if (!widget) {
      return;
    }
    updateWidget(rowId, columnId, widgetId, { hidden: !widget.hidden });
  }

  function moveWidget(
    source: { rowId: string; columnId: string; widgetId: string },
    target: { rowId: string; columnId: string; widgetId?: string }
  ) {
    const sourceRow = findRow(workingDraft.rows, source.rowId);
    const sourceColumn = findColumn(sourceRow, source.columnId);
    const sourceIndex = sourceColumn?.widgets.findIndex((widget) => widget.id === source.widgetId) ?? -1;
    if (!sourceRow || !sourceColumn || sourceIndex === -1) {
      return;
    }
    const movedWidget = sourceColumn.widgets[sourceIndex];
    const nextRows = cloneContent(workingDraft).rows;
    const nextSourceRow = findRow(nextRows, source.rowId)!;
    const nextSourceColumn = findColumn(nextSourceRow, source.columnId)!;
    nextSourceColumn.widgets.splice(sourceIndex, 1);

    const nextTargetRow = findRow(nextRows, target.rowId)!;
    const nextTargetColumn = findColumn(nextTargetRow, target.columnId)!;
    const targetIndex = target.widgetId
      ? nextTargetColumn.widgets.findIndex((widget) => widget.id === target.widgetId)
      : nextTargetColumn.widgets.length;
    nextTargetColumn.widgets.splice(targetIndex === -1 ? nextTargetColumn.widgets.length : targetIndex, 0, movedWidget);
    updateRows(nextRows);
  }

  function updateFeatureSelection(instructorId: string, courseId: string) {
    setFeaturedSelection((current) => {
      const existing = current[instructorId] ?? [];
      const next = existing.includes(courseId) ? existing.filter((entry) => entry !== courseId) : [...existing, courseId];
      return { ...current, [instructorId]: next };
    });
  }

  function applyFeaturedInstructors() {
    if (sidebarSelection.kind !== "widget" || selectedWidget?.type !== "FEATURED_INSTRUCTORS") {
      return;
    }
    updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { instructors: featuredSummary });
  }

  function updatePresetSectionField(field: "title" | "subtitle" | "body", value: string) {
    if (!selectedWidget || sidebarSelection.kind !== "widget") {
      return;
    }
    if (!["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA"].includes(selectedWidget.type)) {
      return;
    }
    updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { [field]: value } as Partial<HomepageCard>);
  }

  function updatePresetBullets(value: string) {
    if (!selectedWidget || sidebarSelection.kind !== "widget") {
      return;
    }
    if (!["ABOUT_US", "WHY_US", "TEXT_MEDIA"].includes(selectedWidget.type)) {
      return;
    }
    const bullets = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { bullets } as Partial<HomepageCard>);
  }

  function updateWidgetStyleField(
    field: "backgroundStyle" | "radiusPreset" | "spacingPreset" | "backgroundColor" | "textColor" | "marginPreset" | "widthPreset" | "borderPreset",
    value: HomepageCardBackgroundStyle | HomepageRadiusPreset | HomepageSpacingPreset | HomepageSizePreset | HomepageBorderPreset | string
  ) {
    if (sidebarSelection.kind !== "widget" || !selectedWidget) {
      return;
    }
    updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { [field]: value } as Partial<HomepageCard>);
  }

  function updateWidgetVisibility(key: keyof HomepageResponsiveVisibility, value: boolean) {
    if (sidebarSelection.kind !== "widget" || !selectedWidget) {
      return;
    }
    updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, {
      visibility: {
        ...createVisibility(),
        ...selectedWidget.visibility,
        [key]: value
      }
    });
  }

  if (!hasHydrated) {
    return <main className="p-8">Loading admin session...</main>;
  }

  if (!isAuthorized) {
    return <main className="p-8">Redirecting...</main>;
  }

  if (!canManageHomepage) {
    return (
      <main className="p-8">
        <ContentCard className="p-6">
          <EmptyState
            title="Homepage access is restricted"
            description="This admin account does not have permission to edit and publish the public homepage."
            actionHref="/admin/overview"
            actionLabel="Return to overview"
          />
        </ContentCard>
      </main>
    );
  }

  if (isMobileEditor) {
    return <DesktopOnlyMessage />;
  }

  const libraryReady = sidebarSelection.kind === "library" && sidebarSelection.rowId && sidebarSelection.columnId;
  const sectionWidgets = widgetCatalog.filter((item) => item.group === "Sections");
  const widgetSearchTerm = widgetSearch.trim().toLowerCase();
  const matchesSearch = (item: WidgetCatalogItem) =>
    !widgetSearchTerm ||
    item.title.toLowerCase().includes(widgetSearchTerm) ||
    item.subtitle.toLowerCase().includes(widgetSearchTerm);
  const baseWidgets = widgetCatalog.filter((item) => item.group === "Elements" && matchesSearch(item));
  const dynamicWidgets = widgetCatalog.filter((item) => item.group === "Dynamic" && matchesSearch(item));
  const activeRowId = sidebarSelection.kind === "library" ? sidebarSelection.rowId : sidebarSelection.rowId;
  const activeColumnId =
    sidebarSelection.kind === "column" || sidebarSelection.kind === "widget" || sidebarSelection.kind === "library"
      ? sidebarSelection.columnId
      : undefined;
  const activeWidgetId = sidebarSelection.kind === "widget" ? sidebarSelection.widgetId : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.1),transparent_22%),radial-gradient(circle_at_92%_12%,rgba(16,185,129,0.1),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_44%,#e2e8f0_100%)] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex min-h-[4.75rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/admin/overview"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <BackIcon />
            </a>
            <div className="min-w-0">
              <p className="section-kicker">Admin builder</p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-950">Homepage Builder</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1.5">
              <button
                type="button"
                aria-label="Undo"
                title="Undo"
                onClick={undoLastChange}
                disabled={!undoStack.length}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 transition disabled:opacity-40"
              >
                <UndoIcon />
              </button>
              <button
                type="button"
                aria-label="Redo"
                title="Redo"
                onClick={redoLastChange}
                disabled={!redoStack.length}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 transition disabled:opacity-40"
              >
                <RedoIcon />
              </button>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1.5">
              <button
                type="button"
                aria-label="Desktop mode"
                onClick={() => setCanvasViewport("desktop")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                  canvasViewport === "desktop" ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-700"
                }`}
              >
                <MonitorIcon />
              </button>
              <button
                type="button"
                aria-label="Tablet mode"
                onClick={() => setCanvasViewport("tablet")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                  canvasViewport === "tablet" ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-700"
                }`}
              >
                <TabletIcon />
              </button>
              <button
                type="button"
                aria-label="Mobile mode"
                onClick={() => setCanvasViewport("mobile")}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                  canvasViewport === "mobile" ? "bg-slate-950 text-white shadow-sm" : "bg-white text-slate-700"
                }`}
              >
                <PhoneIcon />
              </button>
            </div>

            {hasPendingDraftChanges ? (
              <button
                type="button"
                onClick={() => saveDraftMutation.mutate(workingDraft)}
                disabled={saveDraftMutation.isPending || homepageQuery.isLoading}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {saveDraftMutation.isPending ? "Saving..." : "Draft"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              disabled={!homepageQuery.data?.hasPublishedContent || saveDraftMutation.isPending}
              className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50"
            >
              Reset
            </button>

            {!hasPendingDraftChanges ? (
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(true)}
                disabled={publishDraftMutation.isPending || homepageQuery.isLoading}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Publish
              </button>
            ) : null}

            <AdminSiteMenu
              accessToken={accessToken}
              canHandleSupport={Boolean(user?.isSuperAdmin || user?.adminPermissions?.includes("HANDLE_SUPPORT"))}
            />
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4.75rem)] xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="border-r border-slate-200 bg-white/94 backdrop-blur">
          <div className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto px-4 py-5 sm:px-5">
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                {sidebarSelection.kind === "library" ? (
                  <div>
                    <p className="section-kicker">Elements</p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">Widget library</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {libraryReady ? "Choose an element to add into the selected column." : "Select a column on the canvas to start adding widgets."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="section-kicker">
                      {sidebarSelection.kind === "row" ? "Section" : sidebarSelection.kind === "column" ? "Column" : "Widget"}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-slate-950">
                      {sidebarSelection.kind === "row"
                        ? "Edit section"
                        : sidebarSelection.kind === "column"
                          ? "Edit column"
                          : selectedWidget?.title || "Edit widget"}
                    </h2>
                  </div>
                )}

                {sidebarSelection.kind !== "library" ? (
                  <button
                    type="button"
                    onClick={() => openLibraryTarget(
                      sidebarSelection.kind === "row" ? sidebarSelection.rowId : sidebarSelection.rowId,
                      sidebarSelection.kind === "row" ? selectedRow?.columnsData?.[0]?.id : sidebarSelection.columnId
                    )}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <BackIcon />
                  </button>
                ) : null}
              </div>

              {sidebarSelection.kind !== "library" ? (
                <div className="mt-4 flex gap-2">
                  {(["CONTENT", "STYLE", "ADVANCED"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSidebarTab(tab)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        sidebarTab === tab ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {tab.toLowerCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {message ? (
              <div className="mt-4">
                <StatusBanner variant={message.type === "success" ? "success" : "error"}>{message.text}</StatusBanner>
              </div>
            ) : null}
            {homepageQuery.error instanceof Error ? (
              <div className="mt-4">
                <StatusBanner variant="error">{homepageQuery.error.message}</StatusBanner>
              </div>
            ) : null}

            {sidebarSelection.kind === "library" ? (
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-slate-200 bg-slate-50 p-1.5">
                  {(["ELEMENTS", "SECTIONS", "NAVIGATOR"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setLibraryTab(tab)}
                      className={`rounded-[16px] px-2 py-2 text-xs font-semibold transition ${
                        libraryTab === tab ? "bg-slate-950 text-white" : "bg-white text-slate-700"
                      }`}
                    >
                      {tab.toLowerCase()}
                    </button>
                  ))}
                </div>

                {libraryTab === "SECTIONS" ? (
                  <ContentCard className="p-4">
                    <p className="section-kicker">Sections</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => addRow(1)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <OneColumnIcon />
                        <span>1 column</span>
                      </button>
                      <button type="button" onClick={() => addRow(2)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                        <TwoColumnsIcon />
                        <span>2 columns</span>
                      </button>
                    </div>
                  </ContentCard>
                ) : null}

                {libraryTab === "ELEMENTS" ? (
                  <>
                    <input
                      value={widgetSearch}
                      onChange={(event) => setWidgetSearch(event.target.value)}
                      placeholder="Search elements"
                      className="w-full rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                    {[
                      { title: "Preset", items: sectionWidgets.filter(matchesSearch) },
                      { title: "Basic", items: baseWidgets },
                      { title: "Dynamic", items: dynamicWidgets }
                    ].map((group) => (
                      <ContentCard key={group.title} className="p-4">
                        <p className="section-kicker">{group.title}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {group.items.map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              disabled={!libraryReady}
                              onClick={() => addWidgetToTarget(item.type)}
                              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white p-3 text-center text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                              title={item.body}
                            >
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                                {item.type === "HEADING" ? <HeadingIcon /> : null}
                                {item.type === "TEXT" || item.type === "LIST" ? <TextIcon /> : null}
                                {item.type === "BUTTON" ? <ButtonIcon /> : null}
                                {item.type === "IMAGE_BLOCK" ? <ImageIcon /> : null}
                                {item.type === "VIDEO" ? <VideoIcon /> : null}
                                {item.type === "ICON" || item.type === "SPACER" || item.type === "DIVIDER" ? <StarIcon /> : null}
                                {item.type === "FEATURED_INSTRUCTORS" || item.type === "INSTRUCTOR_LIST" ? <UsersIcon /> : null}
                                {item.type === "COURSE_LIST" || item.type === "CARD" || ["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA"].includes(item.type) ? <LayersIcon /> : null}
                              </span>
                              <span>{item.title}</span>
                            </button>
                          ))}
                        </div>
                      </ContentCard>
                    ))}
                  </>
                ) : null}

                {libraryTab === "NAVIGATOR" ? (
                  <ContentCard className="p-4">
                    <p className="section-kicker">Navigator</p>
                    <div className="mt-4 space-y-3">
                      {workingDraft.rows.map((row, rowIndex) => (
                        <div key={row.id} className="rounded-[14px] border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => selectRow(row.id)}
                              className={`min-w-0 flex-1 rounded-[10px] px-3 py-2 text-left text-sm font-semibold transition ${
                                activeRowId === row.id && !activeColumnId
                                  ? "bg-slate-950 text-white"
                                  : "text-slate-800 hover:bg-slate-50"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <LayersIcon />
                                <span className="truncate">{getRowLabel(row, rowIndex)}</span>
                              </span>
                            </button>
                            <IconActionButton label="Duplicate section" size="small" onClick={() => duplicateRow(row.id)}>
                              <DuplicateIcon />
                            </IconActionButton>
                            <IconActionButton label={row.hidden ? "Show section" : "Hide section"} size="small" tone={row.hidden ? "success" : "warning"} onClick={() => toggleRowHidden(row.id)}>
                              {row.hidden ? <EyeIcon /> : <EyeOffIcon />}
                            </IconActionButton>
                            <IconActionButton label="Delete section" size="small" tone="danger" onClick={() => setDeleteTarget({ kind: "row", rowId: row.id })}>
                              <TrashIcon />
                            </IconActionButton>
                          </div>
                          <div className="mt-2 space-y-2 pl-3">
                            {(row.columnsData ?? []).map((column, columnIndex) => (
                              <div key={column.id}>
                                <button
                                  type="button"
                                  onClick={() => selectColumn(row.id, column.id)}
                                  className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-left text-xs font-semibold transition ${
                                    activeRowId === row.id &&
                                    activeColumnId === column.id &&
                                    !activeWidgetId
                                      ? "bg-teal-50 text-teal-700"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{getColumnLabel(column, columnIndex)}</span>
                                  <OneColumnIcon />
                                </button>
                                <div className="mt-1 space-y-1 pl-4">
                                  {column.widgets.map((widget) => (
                                    <div key={widget.id} className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => selectWidget(row.id, column.id, widget.id)}
                                        className={`min-w-0 flex-1 rounded-[10px] px-3 py-2 text-left text-xs font-medium transition ${
                                          activeRowId === row.id &&
                                          activeColumnId === column.id &&
                                          activeWidgetId === widget.id
                                            ? "bg-sky-50 text-sky-700"
                                            : "text-slate-600 hover:bg-slate-50"
                                        }`}
                                      >
                                        {getWidgetLabel(widget)}
                                      </button>
                                      <IconActionButton label="Duplicate widget" size="small" onClick={() => duplicateWidget(row.id, column.id, widget.id)}>
                                        <DuplicateIcon />
                                      </IconActionButton>
                                      <IconActionButton label="Hide widget" size="small" tone={widget.hidden ? "success" : "warning"} onClick={() => toggleWidgetHidden(row.id, column.id, widget.id)}>
                                        {widget.hidden ? <EyeIcon /> : <EyeOffIcon />}
                                      </IconActionButton>
                                      <IconActionButton label="Remove widget" size="small" tone="danger" onClick={() => setDeleteTarget({ kind: "widget", rowId: row.id, columnId: column.id, widgetId: widget.id })}>
                                        <TrashIcon />
                                      </IconActionButton>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ContentCard>
                ) : null}
              </div>
            ) : sidebarSelection.kind === "row" && selectedRow ? (
              <div className="mt-5 space-y-5">
                {sidebarTab === "CONTENT" ? (
                  <ContentCard className="space-y-5 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Navigator label</span>
                      <input
                        value={selectedRow.builderLabel ?? ""}
                        onChange={(event) => updateRow(selectedRow.id, (row) => ({ ...row, builderLabel: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        placeholder="Section label"
                      />
                    </label>
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-800">Section structure</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateRowColumns(selectedRow.id, 1)}
                          className={`flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-semibold ${
                            selectedRow.columns === 1 ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          <OneColumnIcon />
                          <span>1 column</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRowColumns(selectedRow.id, 2)}
                          className={`flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-semibold ${
                            selectedRow.columns === 2 ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          <TwoColumnsIcon />
                          <span>2 columns</span>
                        </button>
                      </div>
                    </div>

                    {selectedRow.columns === 2 ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Tablet stacking order</span>
                          <select
                            value={selectedRow.tabletOrder ?? "FIRST_SLOT_FIRST"}
                            onChange={(event) => updateRowOrder(selectedRow.id, "tabletOrder", event.target.value as HomepageRowOrder)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            <option value="FIRST_SLOT_FIRST">Column 1 then Column 2</option>
                            <option value="SECOND_SLOT_FIRST">Column 2 then Column 1</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Mobile stacking order</span>
                          <select
                            value={selectedRow.mobileOrder ?? "FIRST_SLOT_FIRST"}
                            onChange={(event) => updateRowOrder(selectedRow.id, "mobileOrder", event.target.value as HomepageRowOrder)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            <option value="FIRST_SLOT_FIRST">Column 1 then Column 2</option>
                            <option value="SECOND_SLOT_FIRST">Column 2 then Column 1</option>
                          </select>
                        </label>
                      </>
                    ) : null}
                  </ContentCard>
                ) : null}

                {sidebarTab === "STYLE" ? (
                  <ContentCard className="space-y-4 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background color</span>
                      <input
                        value={selectedRow.backgroundColor ?? ""}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "backgroundColor", event.target.value)}
                        placeholder="#ffffff"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background image URL</span>
                      <input
                        value={selectedRow.backgroundImage ?? ""}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "backgroundImage", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background style</span>
                      <select
                        value={selectedRow.backgroundStyle ?? "plain"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "backgroundStyle", event.target.value as HomepageRowBackgroundStyle)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {rowBackgroundOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Padding</span>
                      <select
                        value={selectedRow.paddingPreset ?? "comfortable"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "paddingPreset", event.target.value as HomepagePaddingPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {rowPaddingOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Column gap</span>
                      <select
                        value={selectedRow.gapPreset ?? "normal"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "gapPreset", event.target.value as HomepageGapPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {rowGapOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Margin</span>
                      <select
                        value={selectedRow.marginPreset ?? "none"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "marginPreset", event.target.value as HomepageSizePreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {sizeOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Min height</span>
                      <select
                        value={selectedRow.minHeightPreset ?? "none"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "minHeightPreset", event.target.value as HomepageSizePreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {sizeOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Border</span>
                      <select
                        value={selectedRow.borderPreset ?? "soft"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "borderPreset", event.target.value as HomepageBorderPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {borderOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Radius</span>
                      <select
                        value={selectedRow.radiusPreset ?? "rounded"}
                        onChange={(event) => updateRowStyleField(selectedRow.id, "radiusPreset", event.target.value as HomepageRadiusPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {cardRadiusOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                  </ContentCard>
                ) : null}

                {sidebarTab === "ADVANCED" ? (
                  <ContentCard className="space-y-5 p-4">
                    <div className="flex items-center gap-3">
                      <IconActionButton label="Hide section" title={selectedRow.hidden ? "Show section" : "Hide section"} tone={selectedRow.hidden ? "success" : "warning"} onClick={() => toggleRowHidden(selectedRow.id)}>
                        {selectedRow.hidden ? <EyeIcon /> : <EyeOffIcon />}
                      </IconActionButton>
                      <IconActionButton label="Duplicate section" onClick={() => duplicateRow(selectedRow.id)}>
                        <DuplicateIcon />
                      </IconActionButton>
                      <IconActionButton label="Delete section" tone="danger" onClick={() => setDeleteTarget({ kind: "row", rowId: selectedRow.id })}>
                        <TrashIcon />
                      </IconActionButton>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-slate-800">Device visibility</p>
                      <div className="flex items-center gap-2">
                        <VisibilityToggle active={selectedRow.visibility?.desktop ?? true} icon={<MonitorIcon />} label="Desktop visibility" onClick={() => updateRowVisibility(selectedRow.id, "desktop", !(selectedRow.visibility?.desktop ?? true))} />
                        <VisibilityToggle active={selectedRow.visibility?.tablet ?? true} icon={<TabletIcon />} label="Tablet visibility" onClick={() => updateRowVisibility(selectedRow.id, "tablet", !(selectedRow.visibility?.tablet ?? true))} />
                        <VisibilityToggle active={selectedRow.visibility?.mobile ?? true} icon={<PhoneIcon />} label="Mobile visibility" onClick={() => updateRowVisibility(selectedRow.id, "mobile", !(selectedRow.visibility?.mobile ?? true))} />
                      </div>
                    </div>
                  </ContentCard>
                ) : null}
              </div>
            ) : sidebarSelection.kind === "column" && selectedColumn ? (
              <div className="mt-5 space-y-5">
                {sidebarTab === "CONTENT" ? (
                  <ContentCard className="space-y-5 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Navigator label</span>
                      <input
                        value={selectedColumn.builderLabel ?? ""}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "builderLabel", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        placeholder="Column label"
                      />
                    </label>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Column content</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        This column currently contains {selectedColumn.widgets.length} widget{selectedColumn.widgets.length === 1 ? "" : "s"}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openLibraryTarget(selectedRow!.id, selectedColumn.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
                    >
                      <LayersIcon />
                      <span>Add element to this column</span>
                    </button>
                  </ContentCard>
                ) : null}

                {sidebarTab === "STYLE" ? (
                  <ContentCard className="space-y-4 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background color</span>
                      <input
                        value={selectedColumn.backgroundColor ?? ""}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "backgroundColor", event.target.value)}
                        placeholder="#ffffff"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Padding</span>
                      <select
                        value={selectedColumn.paddingPreset ?? "comfortable"}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "paddingPreset", event.target.value as HomepagePaddingPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {rowPaddingOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Widget gap</span>
                      <select
                        value={selectedColumn.gapPreset ?? "normal"}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "gapPreset", event.target.value as HomepageGapPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {rowGapOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Vertical alignment</span>
                      <select
                        value={selectedColumn.verticalAlign ?? "start"}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "verticalAlign", event.target.value as HomepageColumnAlign)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {columnAlignOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Horizontal alignment</span>
                      <select
                        value={selectedColumn.horizontalAlign ?? "start"}
                        onChange={(event) => updateColumnStyleField(selectedRow!.id, selectedColumn.id, "horizontalAlign", event.target.value as HomepageColumnAlign)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {columnAlignOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                  </ContentCard>
                ) : null}

                {sidebarTab === "ADVANCED" ? (
                  <ContentCard className="p-4">
                    <p className="text-sm leading-6 text-slate-600">Select a widget inside this column if you want to control visibility, duplication, or removal.</p>
                  </ContentCard>
                ) : null}
              </div>
            ) : sidebarSelection.kind === "widget" && selectedWidget ? (
              <div className="mt-5 space-y-5">
                {sidebarTab === "CONTENT" ? (
                  <ContentCard className="space-y-4 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Navigator label</span>
                      <input
                        value={selectedWidget.builderLabel ?? ""}
                        onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { builderLabel: event.target.value })}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        placeholder={selectedWidget.title}
                      />
                    </label>
                    {selectedWidget.type === "HEADING" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">HTML tag</span>
                          <select
                            value={selectedWidget.textTag}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { textTag: event.target.value as Exclude<HomepageTextTag, "P"> })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {textTagOptions.filter((option) => option !== "P").map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Alignment</span>
                          <select
                            value={selectedWidget.textAlign ?? "left"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { textAlign: event.target.value as HomepageAlign })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {textAlignOptions.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Text</span>
                          <textarea
                            value={selectedWidget.content}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { content: event.target.value })}
                            rows={6}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "TEXT" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Alignment</span>
                          <select
                            value={selectedWidget.textAlign ?? "left"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { textAlign: event.target.value as HomepageAlign })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {textAlignOptions.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Text</span>
                          <textarea
                            value={selectedWidget.content}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { content: event.target.value })}
                            rows={10}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "BUTTON" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Label</span>
                          <input
                            value={selectedWidget.label}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { label: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Link</span>
                          <input
                            value={selectedWidget.href}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { href: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Variant</span>
                          <select
                            value={selectedWidget.variant ?? "primary"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { variant: event.target.value as HomepageButtonVariant })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {buttonVariants.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Alignment</span>
                          <select
                            value={selectedWidget.textAlign ?? "left"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { textAlign: event.target.value as HomepageAlign })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {textAlignOptions.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : selectedWidget.type === "IMAGE_BLOCK" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Image file</span>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              onChange={(event) => setHomepageImageFile(event.target.files?.[0] ?? null)}
                              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                            />
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!homepageImageFile || uploadHomepageImageMutation.isPending}
                                onClick={() => void uploadHomepageImageMutation.mutateAsync()}
                                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
                              >
                                {uploadHomepageImageMutation.isPending ? "Uploading..." : "Upload image"}
                              </button>
                              {homepageImageFile ? (
                                <button
                                  type="button"
                                  onClick={() => setHomepageImageFile(null)}
                                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                                >
                                  Clear
                                </button>
                              ) : null}
                            </div>
                            {homepageImagePreviewUrl ? (
                              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                                <img src={homepageImagePreviewUrl} alt="Homepage preview" className="h-48 w-full object-cover" />
                              </div>
                            ) : null}
                          </div>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Alt text</span>
                          <input
                            value={selectedWidget.altText ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { altText: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Caption</span>
                          <textarea
                            value={selectedWidget.caption ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { caption: event.target.value })}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "VIDEO" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Video URL</span>
                          <input
                            value={selectedWidget.videoUrl}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { videoUrl: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Aspect ratio</span>
                          <select
                            value={selectedWidget.aspectRatio ?? "16:9"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { aspectRatio: event.target.value as HomepageVideoAspectRatio })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {videoRatioOptions.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Caption</span>
                          <textarea
                            value={selectedWidget.caption ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { caption: event.target.value })}
                            rows={4}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "ICON" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Symbol</span>
                          <input
                            value={selectedWidget.iconSymbol}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { iconSymbol: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Text</span>
                          <textarea
                            value={selectedWidget.content}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { content: event.target.value })}
                            rows={6}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Alignment</span>
                          <select
                            value={selectedWidget.textAlign ?? "left"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { textAlign: event.target.value as HomepageAlign })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {textAlignOptions.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : selectedWidget.type === "SPACER" ? (
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-800">Height</span>
                        <select
                          value={selectedWidget.heightPreset ?? "medium"}
                          onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { heightPreset: event.target.value as HomepageSizePreset })}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        >
                          {sizeOptions.filter((option) => option !== "none").map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                        </select>
                      </label>
                    ) : selectedWidget.type === "DIVIDER" ? (
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-800">Line style</span>
                        <select
                          value={selectedWidget.dividerStyle ?? "solid"}
                          onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { dividerStyle: event.target.value as "solid" | "dashed" })}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                        </select>
                      </label>
                    ) : selectedWidget.type === "LIST" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                          <input
                            value={selectedWidget.title}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { title: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Items</span>
                          <textarea
                            value={selectedWidget.items.join("\n")}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, {
                              items: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean)
                            })}
                            rows={7}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "CARD" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                          <input
                            value={selectedWidget.title}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { title: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Body</span>
                          <textarea
                            value={selectedWidget.body ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { body: event.target.value })}
                            rows={5}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Button label</span>
                          <input
                            value={selectedWidget.buttonLabel ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { buttonLabel: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Button link</span>
                          <input
                            value={selectedWidget.buttonHref ?? ""}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { buttonHref: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                      </>
                    ) : selectedWidget.type === "COURSE_LIST" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                          <input
                            value={selectedWidget.title}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { title: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <div className="space-y-3">
                          {(catalogQuery.data ?? []).flatMap((instructor) => instructor.instructorCourses).map((course) => {
                            const checked = selectedWidget.items.some((item) => item.id === course.id);
                            return (
                              <label key={course.id} className={`flex items-start gap-3 rounded-[16px] border p-3 ${checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, {
                                    items: event.target.checked
                                      ? [...selectedWidget.items, course]
                                      : selectedWidget.items.filter((item) => item.id !== course.id)
                                  })}
                                  className="mt-1"
                                />
                                <span className="text-sm font-medium text-slate-800">{course.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : selectedWidget.type === "INSTRUCTOR_LIST" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                          <input
                            value={selectedWidget.title}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { title: event.target.value })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <div className="space-y-3">
                          {(catalogQuery.data ?? []).map((instructor) => {
                            const checked = selectedWidget.instructors.some((item) => item.id === instructor.id);
                            const entry: HomepageInstructorEntry = {
                              id: instructor.id,
                              fullName: instructor.fullName,
                              bio: instructor.bio,
                              profileImage: instructor.profileImage,
                              courses: instructor.instructorCourses
                            };
                            return (
                              <label key={instructor.id} className={`flex items-start gap-3 rounded-[16px] border p-3 ${checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, {
                                    instructors: event.target.checked
                                      ? [...selectedWidget.instructors, entry]
                                      : selectedWidget.instructors.filter((item) => item.id !== instructor.id)
                                  })}
                                  className="mt-1"
                                />
                                <span className="text-sm font-medium text-slate-800">{instructor.fullName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    ) : selectedWidget.type === "FEATURED_INSTRUCTORS" ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm leading-6 text-slate-600">Choose instructors and courses to spotlight on the homepage.</p>
                          <button
                            type="button"
                            onClick={applyFeaturedInstructors}
                            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Apply
                          </button>
                        </div>
                        <div className="space-y-4">
                          {(catalogQuery.data ?? []).map((instructor) => (
                            <div key={instructor.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                              <p className="text-base font-semibold text-slate-950">{instructor.fullName}</p>
                              <div className="mt-4 grid gap-3">
                                {instructor.instructorCourses.map((course) => {
                                  const checked = featuredSelection[instructor.id]?.includes(course.id) ?? false;
                                  return (
                                    <label
                                      key={course.id}
                                      className={`flex items-start gap-3 rounded-[18px] border p-3 ${
                                        checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-slate-50"
                                      }`}
                                    >
                                      <input type="checkbox" checked={checked} onChange={() => updateFeatureSelection(instructor.id, course.id)} className="mt-1" />
                                      <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-900">{course.title}</span>
                                        {course.description ? <span className="mt-1 block text-sm leading-6 text-slate-600">{course.description}</span> : null}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Title</span>
                          <input
                            value={selectedWidget.title}
                            onChange={(event) => updatePresetSectionField("title", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Subtitle</span>
                          <input
                            value={selectedWidget.subtitle ?? ""}
                            onChange={(event) => updatePresetSectionField("subtitle", event.target.value)}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Body</span>
                          <textarea
                            value={selectedWidget.body ?? ""}
                            onChange={(event) => updatePresetSectionField("body", event.target.value)}
                            rows={6}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          />
                        </label>
                        {"bullets" in selectedWidget ? (
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-800">Bullets</span>
                            <textarea
                              value={selectedWidget.bullets?.join("\n") ?? ""}
                              onChange={(event) => updatePresetBullets(event.target.value)}
                              rows={5}
                              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                              placeholder="One bullet per line"
                            />
                          </label>
                        ) : null}
                      </>
                    )}
                  </ContentCard>
                ) : null}

                {sidebarTab === "STYLE" ? (
                  <ContentCard className="space-y-4 p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background color</span>
                      <input
                        value={selectedWidget.backgroundColor ?? ""}
                        onChange={(event) => updateWidgetStyleField("backgroundColor", event.target.value)}
                        placeholder="#ffffff"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Text color</span>
                      <input
                        value={selectedWidget.textColor ?? ""}
                        onChange={(event) => updateWidgetStyleField("textColor", event.target.value)}
                        placeholder="#0f172a"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Background</span>
                      <select
                        value={selectedWidget.backgroundStyle ?? "surface"}
                        onChange={(event) => updateWidgetStyleField("backgroundStyle", event.target.value as HomepageCardBackgroundStyle)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {cardBackgroundOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Radius</span>
                      <select
                        value={selectedWidget.radiusPreset ?? "rounded"}
                        onChange={(event) => updateWidgetStyleField("radiusPreset", event.target.value as HomepageRadiusPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {cardRadiusOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Spacing</span>
                      <select
                        value={selectedWidget.spacingPreset ?? "comfortable"}
                        onChange={(event) => updateWidgetStyleField("spacingPreset", event.target.value as HomepageSpacingPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {cardSpacingOptions.map((option) => (
                          <option key={option} value={option}>{formatPresetLabel(option)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Margin</span>
                      <select
                        value={selectedWidget.marginPreset ?? "none"}
                        onChange={(event) => updateWidgetStyleField("marginPreset", event.target.value as HomepageSizePreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {sizeOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Width</span>
                      <select
                        value={selectedWidget.widthPreset ?? "auto"}
                        onChange={(event) => updateWidgetStyleField("widthPreset", event.target.value)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {widthOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-800">Border</span>
                      <select
                        value={selectedWidget.borderPreset ?? "soft"}
                        onChange={(event) => updateWidgetStyleField("borderPreset", event.target.value as HomepageBorderPreset)}
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                      >
                        {borderOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                      </select>
                    </label>
                    {selectedWidget.type === "IMAGE_BLOCK" ? (
                      <>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Image height</span>
                          <select
                            value={selectedWidget.imageHeightPreset ?? "medium"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { imageHeightPreset: event.target.value as HomepageImageHeightPreset })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {cardImageHeightOptions.map((option) => (
                              <option key={option} value={option}>{formatPresetLabel(option)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Image fit</span>
                          <select
                            value={selectedWidget.imageFit ?? "cover"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { imageFit: event.target.value as HomepageImageFit })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {imageFitOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-slate-800">Image position</span>
                          <select
                            value={selectedWidget.imagePosition ?? "center"}
                            onChange={(event) => updateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId, { imagePosition: event.target.value as HomepageImagePosition })}
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                          >
                            {imagePositionOptions.map((option) => <option key={option} value={option}>{formatPresetLabel(option)}</option>)}
                          </select>
                        </label>
                      </>
                    ) : null}
                  </ContentCard>
                ) : null}

                {sidebarTab === "ADVANCED" ? (
                  <ContentCard className="space-y-5 p-4">
                    <div className="flex items-center gap-3">
                      <IconActionButton label="Hide widget" title={selectedWidget.hidden ? "Show widget" : "Hide widget"} tone={selectedWidget.hidden ? "success" : "warning"} onClick={() => toggleWidgetHidden(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId)}>
                        {selectedWidget.hidden ? <EyeIcon /> : <EyeOffIcon />}
                      </IconActionButton>
                      <IconActionButton label="Duplicate widget" onClick={() => duplicateWidget(sidebarSelection.rowId, sidebarSelection.columnId, sidebarSelection.widgetId)}>
                        <DuplicateIcon />
                      </IconActionButton>
                      <IconActionButton label="Remove widget" tone="danger" onClick={() => setDeleteTarget({ kind: "widget", rowId: sidebarSelection.rowId, columnId: sidebarSelection.columnId, widgetId: sidebarSelection.widgetId })}>
                        <TrashIcon />
                      </IconActionButton>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-medium text-slate-800">Device visibility</p>
                      <div className="flex items-center gap-2">
                        <VisibilityToggle active={selectedWidget.visibility?.desktop ?? true} icon={<MonitorIcon />} label="Desktop visibility" onClick={() => updateWidgetVisibility("desktop", !(selectedWidget.visibility?.desktop ?? true))} />
                        <VisibilityToggle active={selectedWidget.visibility?.tablet ?? true} icon={<TabletIcon />} label="Tablet visibility" onClick={() => updateWidgetVisibility("tablet", !(selectedWidget.visibility?.tablet ?? true))} />
                        <VisibilityToggle active={selectedWidget.visibility?.mobile ?? true} icon={<PhoneIcon />} label="Mobile visibility" onClick={() => updateWidgetVisibility("mobile", !(selectedWidget.visibility?.mobile ?? true))} />
                      </div>
                    </div>
                  </ContentCard>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[92rem]">
            <div className="rounded-[36px] border border-slate-200 bg-white/60 p-4 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.26)] backdrop-blur sm:p-6">
              <div className={`mx-auto transition-all ${
                canvasViewport === "mobile" ? "max-w-[390px]" : canvasViewport === "tablet" ? "max-w-[820px]" : "max-w-6xl"
              }`}>
                <PublicHomepageHeader previewViewport={canvasViewport} interactive={false} />

                <div className="mt-6 space-y-6">
                  {workingDraft.rows.length ? (
                    workingDraft.rows.map((row) => {
                      const rowSelected = sidebarSelection.kind === "row" && sidebarSelection.rowId === row.id;
                      const columns = getOrderedColumns(row, canvasViewport);
                      return (
                        <div
                          key={row.id}
                          className={`relative ${draggingRowId === row.id ? "opacity-70" : ""}`}
                          draggable
                          onDragStart={() => setDraggingRowId(row.id)}
                          onDragEnd={() => setDraggingRowId(null)}
                          onDragOver={(event) => {
                            if (draggingRowId) {
                              event.preventDefault();
                            }
                          }}
                          onDrop={() => {
                            if (draggingRowId) {
                              reorderRows(draggingRowId, row.id);
                            }
                            setDraggingRowId(null);
                          }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => selectRow(row.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                selectRow(row.id);
                              }
                            }}
                            className={getCanvasRowClasses(rowSelected)}
                          >
                            <button
                              type="button"
                              aria-label="Add section above"
                              title="Add section above"
                              onClick={(event) => {
                                event.stopPropagation();
                                const index = workingDraft.rows.findIndex((entry) => entry.id === row.id);
                                setSectionInsertTarget({ index });
                              }}
                              className="absolute left-1/2 top-0 z-10 hidden h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg group-hover/section:inline-flex"
                            >
                              <PlusIcon />
                            </button>
                            <span className="absolute left-4 top-0 z-10 hidden -translate-y-1/2 items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-white shadow-lg group-hover/section:inline-flex">
                              <DragIcon />
                            </span>
                            <div className="rounded-[18px] bg-white/35 p-3">
                              <div className={`grid ${row.gapPreset === "tight" ? "gap-3" : row.gapPreset === "loose" ? "gap-7" : "gap-5"} ${
                                row.columns === 2 && canvasViewport === "desktop" ? "grid-cols-2" : "grid-cols-1"
                              }`}>
                                {columns.map(({ column }) => {
                                  const columnSelected =
                                    sidebarSelection.kind === "column" &&
                                    sidebarSelection.rowId === row.id &&
                                    sidebarSelection.columnId === column.id;
                                  return (
                                    <div
                                      key={column.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        selectColumn(row.id, column.id);
                                      }}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          selectColumn(row.id, column.id);
                                        }
                                      }}
                                      onDragOver={(event) => {
                                        if (draggingWidget) {
                                          event.preventDefault();
                                        }
                                      }}
                                      onDrop={(event) => {
                                        event.stopPropagation();
                                        if (draggingWidget) {
                                          moveWidget(draggingWidget, { rowId: row.id, columnId: column.id });
                                        }
                                        setDraggingWidget(null);
                                      }}
                                      className={getCanvasColumnClasses(columnSelected)}
                                    >
                                      <span className="absolute left-3 top-0 z-10 hidden -translate-y-1/2 rounded-full bg-teal-600 px-2 py-1 text-white shadow-lg group-hover/column:inline-flex">
                                        <OneColumnIcon />
                                      </span>
                                      <div className="space-y-4">
                                        {column.widgets.length ? (
                                          column.widgets.map((widget, widgetIndex) => {
                                            const widgetSelected =
                                              sidebarSelection.kind === "widget" &&
                                              sidebarSelection.rowId === row.id &&
                                              sidebarSelection.columnId === column.id &&
                                              sidebarSelection.widgetId === widget.id;
                                            return (
                                              <div key={widget.id}>
                                                <button
                                                  type="button"
                                                  aria-label="Insert widget here"
                                                  title="Insert widget here"
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    openLibraryTarget(row.id, column.id, widgetIndex);
                                                  }}
                                                  className="mx-auto mb-2 hidden h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 group-hover/column:flex"
                                                >
                                                  <PlusIcon />
                                                </button>
                                                <div
                                                  role="button"
                                                  tabIndex={0}
                                                  draggable
                                                  onDragStart={() => setDraggingWidget({ rowId: row.id, columnId: column.id, widgetId: widget.id })}
                                                  onDragEnd={() => setDraggingWidget(null)}
                                                  onDragOver={(event) => {
                                                    if (draggingWidget) {
                                                      event.preventDefault();
                                                    }
                                                  }}
                                                  onDrop={(event) => {
                                                    event.stopPropagation();
                                                    if (draggingWidget) {
                                                      moveWidget(draggingWidget, { rowId: row.id, columnId: column.id, widgetId: widget.id });
                                                    }
                                                    setDraggingWidget(null);
                                                  }}
                                                  onClick={(event) => {
                                                    event.stopPropagation();
                                                    selectWidget(row.id, column.id, widget.id);
                                                  }}
                                                  onKeyDown={(event) => {
                                                    if (event.key === "Enter" || event.key === " ") {
                                                      event.preventDefault();
                                                      event.stopPropagation();
                                                      selectWidget(row.id, column.id, widget.id);
                                                    }
                                                  }}
                                                  className={getCanvasWidgetClasses(widgetSelected)}
                                                >
                                                  <span className="absolute left-3 top-0 z-10 hidden -translate-y-1/2 rounded-full bg-sky-600 px-2 py-1 text-white shadow-lg group-hover/widget:inline-flex">
                                                    <DragIcon />
                                                  </span>
                                                  <HomepageRenderer content={{ rows: [{ ...createRow(1), id: row.id, columns: 1, columnsData: [{ id: column.id, widgets: [widget] }] }] }} viewport={canvasViewport} />
                                                </div>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openLibraryTarget(row.id, column.id);
                                            }}
                                            className="flex min-h-[200px] w-full items-center justify-center rounded-[14px] border border-dashed border-slate-200 bg-white/50 text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
                                            aria-label="Add widget"
                                            title="Add widget"
                                          >
                                            <PlusIcon />
                                          </button>
                                        )}
                                        {column.widgets.length ? (
                                          <button
                                            type="button"
                                            aria-label="Insert widget at end"
                                            title="Insert widget at end"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              openLibraryTarget(row.id, column.id, column.widgets.length);
                                            }}
                                            className="mx-auto hidden h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 group-hover/column:flex"
                                          >
                                            <PlusIcon />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <button
                              type="button"
                              aria-label="Add section below"
                              title="Add section below"
                              onClick={(event) => {
                                event.stopPropagation();
                                const index = workingDraft.rows.findIndex((entry) => entry.id === row.id);
                                setSectionInsertTarget({ index: index + 1 });
                              }}
                              className="absolute bottom-0 left-1/2 z-10 hidden h-7 w-7 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg group-hover/section:inline-flex"
                            >
                              <PlusIcon />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/55 p-8">
                      <button
                        type="button"
                        onClick={() => setSectionInsertTarget({ index: 0 })}
                        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl transition hover:scale-105"
                        aria-label="Add first section"
                        title="Add first section"
                      >
                        <PlusIcon />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <SiteFooter interactive={false} previewViewport={canvasViewport} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {sectionInsertTarget ? (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-950/20 px-4" onClick={() => setSectionInsertTarget(null)}>
          <div
            className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="section-kicker">New section</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Choose structure</h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => addRowAt(1, sectionInsertTarget.index)}
                className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
              >
                <OneColumnIcon />
                <span>1 column</span>
              </button>
              <button
                type="button"
                onClick={() => addRowAt(2, sectionInsertTarget.index)}
                className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
              >
                <TwoColumnsIcon />
                <span>2 columns</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="w-full max-w-lg rounded-[30px] bg-white p-6 shadow-2xl">
            <p className="section-kicker">Confirm delete</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              {deleteTarget.kind === "row" ? "Delete this section?" : "Remove this widget?"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {deleteTarget.kind === "row"
                ? "This will remove the section and every column/widget inside it. You can still use Undo after deleting."
                : "This will remove the selected widget from its column. You can still use Undo after deleting."}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTarget.kind === "row") {
                    removeRow(deleteTarget.rowId);
                    return;
                  }
                  removeWidget(deleteTarget.rowId, deleteTarget.columnId, deleteTarget.widgetId);
                }}
                className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {publishConfirmOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="ui-scrollbar max-h-[90vh] w-full max-w-7xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Publish confirmation</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">Review draft before going live</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Publishing will replace the current live homepage with this draft. Review both versions below before confirming.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-950">Current live homepage</h4>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Live</span>
                </div>
                <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(16,185,129,0.12),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_44%,#e2e8f0_100%)] p-4 sm:p-6">
                  <PublicHomepageHeader previewViewport="desktop" interactive={false} />
                  <div className="mt-6">
                    {homepageQuery.data?.hasPublishedContent ? (
                      <HomepageRenderer content={publishedPreview} viewport="desktop" />
                    ) : (
                      <div className="surface-card flex min-h-[220px] items-center justify-center rounded-[28px] p-6 text-center text-sm text-slate-500">
                        Nothing is published yet.
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <SiteFooter interactive={false} previewViewport="desktop" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-950">Draft that will go live</h4>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Draft</span>
                </div>
                <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(16,185,129,0.12),transparent_18%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_44%,#e2e8f0_100%)] p-4 sm:p-6">
                  <PublicHomepageHeader previewViewport="desktop" interactive={false} />
                  <div className="mt-6">
                    <HomepageRenderer content={workingDraft} viewport="desktop" />
                  </div>
                  <div className="mt-6">
                    <SiteFooter interactive={false} previewViewport="desktop" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPublishConfirmOpen(false)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => publishDraftMutation.mutate()}
                disabled={publishDraftMutation.isPending}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {publishDraftMutation.isPending ? "Publishing..." : "Confirm publish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetConfirmOpen ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 px-4 py-8">
          <div className="w-full max-w-xl rounded-[30px] bg-white p-6 shadow-2xl">
            <p className="section-kicker">Reset draft</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Reset draft to the live homepage?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will discard the current draft changes and replace them with the currently published homepage content.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="section-kicker">Draft rows</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{workingDraft.rows.length}</p>
              </div>
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <p className="section-kicker">Live rows</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{publishedPreview.rows.length}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextDraft = cloneContent(publishedPreview);
                  setDraft(nextDraft);
                  setSavedDraft(cloneContent(nextDraft));
                  setHasPendingDraftChanges(true);
                  setResetConfirmOpen(false);
                  setMessage({ type: "success", text: "Draft reset to the current live homepage." });
                }}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Reset draft
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
