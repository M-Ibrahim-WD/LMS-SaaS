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
  HomepageButtonVariant,
  HomepageCard,
  HomepageCardPartStyles,
  HomepageCardType,
  HomepageCatalogInstructor,
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
  HomepagePartStyle,
  HomepageResponsiveVisibility,
  HomepageSizePreset,
  HomepageStyleUnit,
  HomepageTextTag,
  HomepageTypography,
  HomepageVideoAspectRatio
} from "../../../lib/homepage/types";
import {
  AlignmentControl,
  BorderControl,
  BoxSpacingControl,
  ColorControl,
  IconButton,
  IconSegmentedControl,
  LengthControl,
  NumberControl,
  TypographyControl,
} from "./homepage-builder-controls";
import {
  addElementToContainer,
  addElementsToContainer,
  cloneContent,
  cloneElement,
  createBox,
  createButtonStyle,
  createContainer,
  createId,
  createNoBorder,
  createVisibility,
  createWidget,
  findElement,
  formatBuilderTimestamp,
  getEvenContainerWidth,
  getParentContainerId,
  hasHomepageContent,
  insertElementNearSibling,
  isContainer,
  moveElementList,
  normalizeContent,
  removeElementList,
  summarizeContent,
  updateElementList
} from "./homepage-builder-utils";
import {
  AlignBetweenIcon,
  AlignCenterIcon,
  AlignEndIcon,
  AlignStartIcon,
  BackIcon,
  BookIcon,
  BoxIcon,
  ButtonIcon,
  CardIcon,
  ChartIcon,
  CheckIcon,
  ChevronIcon,
  ClipboardIcon,
  ColumnDirectionIcon,
  ContainerIcon,
  CopyIcon,
  DividerIcon,
  DownIcon,
  EyeIcon,
  EyeOffIcon,
  HeadingIcon,
  ImageIcon,
  InfoIcon,
  LayersIcon,
  ListIcon,
  MonitorIcon,
  NoWrapIcon,
  PhoneIcon,
  PlayIcon,
  PlusIcon,
  QuestionIcon,
  QuoteIcon,
  RedoIcon,
  RowDirectionIcon,
  SpacerIcon,
  SparkIcon,
  StarIcon,
  StretchIcon,
  TabletIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
  UpIcon,
  UsersIcon,
  WrapIcon
} from "./homepage-builder-icons";

type DraftResponse = {
  draftContent: HomepageContent;
  publishedContent: HomepageContent;
  publishedAt?: string | null;
  hasPublishedContent: boolean;
};

type SidebarTab = "CONTENT" | "STYLE" | "ADVANCED";
type Selection = { kind: "container"; id: string } | { kind: "widget"; id: string } | null;
type DeleteTarget = Selection;
type CanvasInsertionPoint = { siblingId: string; position: "before" | "after"; parentContainerId: string | null } | null;
type NavigatorDragState = { startX: number; startY: number; originX: number; originY: number } | null;

type WidgetCatalogItem = {
  type: HomepageCardType;
  title: string;
  description: string;
};

function getWidgetIcon(type: HomepageCardType) {
  const icons: Record<HomepageCardType, React.ReactNode> = {
    ABOUT_US: <UsersIcon />,
    WHY_US: <CheckIcon />,
    ABOUT_SITE: <InfoIcon />,
    TEXT_MEDIA: <ContainerIcon />,
    HEADING: <HeadingIcon />,
    TEXT: <TextIcon />,
    BUTTON: <ButtonIcon />,
    IMAGE_BLOCK: <ImageIcon />,
    VIDEO: <PlayIcon />,
    ICON: <SparkIcon />,
    FEATURED_INSTRUCTORS: <StarIcon />,
    SPACER: <SpacerIcon />,
    DIVIDER: <DividerIcon />,
    LIST: <ListIcon />,
    CARD: <CardIcon />,
    COURSE_LIST: <BookIcon />,
    INSTRUCTOR_LIST: <UsersIcon />,
    TESTIMONIAL: <QuoteIcon />,
    STATS: <ChartIcon />,
    FAQ: <QuestionIcon />
  };
  return icons[type];
}

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DeviceVisibilityButton({
  label,
  visible,
  onClick,
  children
}: {
  label: string;
  visible: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${visible ? "visible" : "hidden"}`}
      title={`${label}: ${visible ? "visible" : "hidden"}`}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-2 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
        visible
          ? "border-teal-500 bg-teal-600 text-white shadow-sm ring-2 ring-teal-100"
          : "border-slate-300 bg-slate-100 text-slate-500 opacity-90"
      }`}
    >
      {children}
    </button>
  );
}

function EditorSection({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        {title}
        <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-slate-100 p-3">
        {children}
      </div>
    </details>
  );
}

function ControlGroup({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details name="homepage-builder-control-group" open={defaultOpen} className="rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-slate-600">
        {title}
        <span className="text-slate-400">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 p-3">
        {children}
      </div>
    </details>
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
        <DeviceVisibilityButton label="Desktop" visible={current.desktop ?? true} onClick={() => toggle("desktop")}><MonitorIcon /></DeviceVisibilityButton>
        <DeviceVisibilityButton label="Tablet" visible={current.tablet ?? true} onClick={() => toggle("tablet")}><TabletIcon /></DeviceVisibilityButton>
        <DeviceVisibilityButton label="Mobile" visible={current.mobile ?? true} onClick={() => toggle("mobile")}><PhoneIcon /></DeviceVisibilityButton>
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
  { type: "TESTIMONIAL", title: "Testimonial", description: "Quote and author" },
  { type: "STATS", title: "Stats", description: "Counters and metrics" },
  { type: "FAQ", title: "FAQ", description: "Questions and answers" },
  { type: "FEATURED_INSTRUCTORS", title: "Featured", description: "Featured instructors" }
];

const iconSymbolOptions = ["*", "✓", "★", "→", "↗", "∞", "⚡", "●", "◆", "▲", "1", "A"];
const contentSectionWidgetTypes: HomepageCardType[] = ["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA"];

function getVideoUrlStatus(value: string) {
  const url = value.trim();
  if (!url) return { tone: "error" as const, label: "Add a video URL." };
  if (url.includes("youtube.com/watch?v=") || url.includes("youtu.be/")) return { tone: "success" as const, label: "YouTube video detected." };
  if (url.includes("vimeo.com/")) return { tone: "success" as const, label: "Vimeo video detected." };
  if (/^https?:\/\//i.test(url)) return { tone: "warning" as const, label: "Direct embed URL. Make sure this provider allows iframe embeds." };
  return { tone: "error" as const, label: "Use a full URL that starts with http:// or https://." };
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

export default function AdminHomepagePage() {
  const { accessToken, hasHydrated, isAuthorized, user } = useRequireAuth({ roles: ["ADMIN"] });
  const [draft, setDraft] = useState<HomepageContent | null>(null);
  const [savedDraft, setSavedDraft] = useState<HomepageContent | null>(null);
  const [undoStack, setUndoStack] = useState<HomepageContent[]>([]);
  const [redoStack, setRedoStack] = useState<HomepageContent[]>([]);
  const [hasPendingDraftChanges, setHasPendingDraftChanges] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [insertionTargetContainerId, setInsertionTargetContainerId] = useState<string | null>(null);
  const [canvasInsertionPoint, setCanvasInsertionPoint] = useState<CanvasInsertionPoint>(null);
  const [collapsedNavigatorIds, setCollapsedNavigatorIds] = useState<Set<string>>(new Set());
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("CONTENT");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [navigatorPosition, setNavigatorPosition] = useState({ x: 24, y: 96 });
  const [navigatorSize, setNavigatorSize] = useState({ width: 360, height: 520 });
  const [navigatorDrag, setNavigatorDrag] = useState<NavigatorDragState>(null);
  const [navigatorEditingId, setNavigatorEditingId] = useState<string | null>(null);
  const [navigatorEditingValue, setNavigatorEditingValue] = useState("");
  const [hoveredCanvasElementId, setHoveredCanvasElementId] = useState<string | null>(null);
  const [canvasViewport, setCanvasViewport] = useState<HomepageRendererViewport>("desktop");
  const [widgetSearch, setWidgetSearch] = useState("");
  const [showPreviewHeader, setShowPreviewHeader] = useState(true);
  const [showPreviewFooter, setShowPreviewFooter] = useState(true);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [copiedElement, setCopiedElement] = useState<HomepageElement | null>(null);
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
  const workingDraftSummary = summarizeContent(workingDraft);
  const savedDraftSummary = summarizeContent(savedDraft ?? workingDraft);
  const publishedSummary = summarizeContent(publishedPreview);
  const publishPreviewContent = savedDraft ?? workingDraft;
  const canOpenPublishReview = Boolean(savedDraft && !hasPendingDraftChanges && hasHomepageContent(savedDraft));
  const draftSaveLabel = savedDraft?.updatedAt ? formatBuilderTimestamp(savedDraft.updatedAt) : "Not saved yet";
  const selectedElement = findElement(workingDraft.containers ?? [], selection?.id);
  const selectedContainer = selectedElement && isContainer(selectedElement) ? selectedElement : null;
  const selectedWidget = selectedElement && !isContainer(selectedElement) ? selectedElement : null;
  const selectedTargetContainerId = selection?.kind === "container" ? selection.id : selection?.kind === "widget" ? getParentContainerId(workingDraft.containers ?? [], selection.id) : null;
  const targetContainerId = canvasInsertionPoint ? canvasInsertionPoint.parentContainerId : insertionTargetContainerId ?? selectedTargetContainerId;
  const targetContainer = findElement(workingDraft.containers ?? [], targetContainerId ?? undefined);
  const canInsertIntoTarget = Boolean(targetContainerId && targetContainer && isContainer(targetContainer));
  const targetContainerLabel = canvasInsertionPoint
    ? targetContainer && isContainer(targetContainer) ? targetContainer.builderLabel || "Container" : "Page root"
    : targetContainer && isContainer(targetContainer) ? targetContainer.builderLabel || "Container" : "Container";
  const hoveredParentContainerId = hoveredCanvasElementId ? getParentContainerId(workingDraft.containers ?? [], hoveredCanvasElementId) : null;
  const isDeviceHiddenInCanvas = (element: HomepageElement) => (
    canvasViewport !== "auto" && element.visibility?.[canvasViewport] === false
  );
  const shouldShowCanvasChrome = (elementId: string) => (
    selection?.id === elementId || hoveredCanvasElementId === elementId || hoveredParentContainerId === elementId
  );

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

  const catalogCourses = useMemo(
    () =>
      (catalogQuery.data ?? []).flatMap((instructor) =>
        instructor.instructorCourses.map((course) => ({
          ...course,
          instructorName: instructor.fullName
        }))
      ),
    [catalogQuery.data]
  );

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

  function selectElement(nextSelection: Exclude<Selection, null>, nextTab?: SidebarTab) {
    if (selection?.kind === nextSelection.kind && selection.id === nextSelection.id) {
      setSidebarOpen(true);
      return;
    }
    setSelection(nextSelection);
    setSidebarOpen(true);
    if (nextTab) setSidebarTab(nextTab);
  }

  function addElement(element: HomepageElement) {
    if (!isContainer(element) && !targetContainerId) {
      setMessage({ type: "error", text: "Select a container first, then add the widget inside it." });
      return;
    }

    const next = canvasInsertionPoint
      ? insertElementNearSibling(workingDraft.containers ?? [], canvasInsertionPoint.siblingId, canvasInsertionPoint.position, element) as HomepageContainer[]
      : addElementToContainer(workingDraft.containers ?? [], targetContainerId, element) as HomepageContainer[];
    updateContainers(next);
    setSelection({ kind: isContainer(element) ? "container" : "widget", id: element.id });
    setInsertionTargetContainerId(null);
    setCanvasInsertionPoint(null);
    setSidebarTab("CONTENT");
  }

  function addChildContainerSet(containerId: string, count: number) {
    const width = getEvenContainerWidth(count);
    const children = Array.from({ length: count }, (_, index) =>
      createContainer([], {
        builderLabel: count === 1 ? "Container" : `Container ${index + 1}`,
        width: count === 1 ? { value: 100, unit: "%" } : width
      })
    );
    const nextContainers = addElementsToContainer(workingDraft.containers ?? [], containerId, children) as HomepageContainer[];
    updateContainers(updateElementList(nextContainers, containerId, (element) =>
      isContainer(element)
        ? {
            ...element,
            direction: count === 1 ? element.direction ?? "column" : "row",
            wrap: count === 1 ? element.wrap ?? "wrap" : "wrap",
            align: element.align ?? "stretch",
            gap: element.gap ?? 10
          }
        : element
    ) as HomepageContainer[]);
    setSelection({ kind: "container", id: children[0].id });
    setInsertionTargetContainerId(null);
    setSidebarTab("ADVANCED");
  }

  function addRootContainer() {
    const container = createContainer();
    updateContainers([...(workingDraft.containers ?? []), container]);
    setSelection({ kind: "container", id: container.id });
    setInsertionTargetContainerId(null);
    setCanvasInsertionPoint(null);
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

  function copySelected(target: Selection) {
    if (!target) return;
    const element = findElement(workingDraft.containers ?? [], target.id);
    if (!element) return;
    setCopiedElement(JSON.parse(JSON.stringify(element)) as HomepageElement);
    setMessage({ type: "success", text: `${isContainer(element) ? "Container" : "Widget"} copied. Select where to paste it, then use Paste.` });
  }

  function pasteCopiedElement() {
    if (!copiedElement) {
      setMessage({ type: "error", text: "Copy a container or widget first." });
      return;
    }
    const cloned = cloneElement(copiedElement);
    const pasteTargetContainerId = selectedContainer
      ? selectedContainer.id
      : selectedWidget
        ? getParentContainerId(workingDraft.containers ?? [], selectedWidget.id)
        : insertionTargetContainerId ?? null;

    if (!isContainer(cloned) && !pasteTargetContainerId) {
      setMessage({ type: "error", text: "Select a container before pasting a widget." });
      return;
    }

    updateContainers(addElementToContainer(workingDraft.containers ?? [], pasteTargetContainerId, cloned) as HomepageContainer[]);
    setSelection({ kind: isContainer(cloned) ? "container" : "widget", id: cloned.id });
    setInsertionTargetContainerId(null);
    setCanvasInsertionPoint(null);
    setSidebarOpen(true);
    setSidebarTab("CONTENT");
  }

  function selectParentElement() {
    if (!selection) return;
    const parentId = getParentContainerId(workingDraft.containers ?? [], selection.id);
    if (!parentId) {
      setSelection(null);
      return;
    }
    setSelection({ kind: "container", id: parentId });
    setSidebarTab("ADVANCED");
  }

  function openPublishReview() {
    if (hasPendingDraftChanges) {
      setMessage({ type: "error", text: "Save the draft before publishing. The public homepage only publishes the saved draft." });
      return;
    }
    if (!savedDraft) {
      setMessage({ type: "error", text: "Create and save a draft before publishing." });
      return;
    }
    if (!hasHomepageContent(savedDraft)) {
      setMessage({ type: "error", text: "Add at least one container or widget before publishing." });
      return;
    }
    setPublishConfirmOpen(true);
  }

  function removeSelected(target: Selection) {
    if (!target) return;
    updateContainers(removeElementList(workingDraft.containers ?? [], target.id) as HomepageContainer[]);
    setSelection(null);
    setInsertionTargetContainerId(null);
    setCanvasInsertionPoint(null);
    setDeleteTarget(null);
  }

  function moveElement(id: string, direction: -1 | 1) {
    updateContainers(moveElementList(workingDraft.containers ?? [], id, direction) as HomepageContainer[]);
  }

  function toggleNavigatorCollapse(id: string) {
    setCollapsedNavigatorIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startNavigatorRename(element: HomepageElement) {
    setNavigatorEditingId(element.id);
    setNavigatorEditingValue(element.builderLabel || (isContainer(element) ? "Container" : element.title) || "Element");
  }

  function commitNavigatorRename(element: HomepageElement) {
    const nextLabel = navigatorEditingValue.trim();
    if (isContainer(element)) updateContainer(element.id, { builderLabel: nextLabel || "Container" });
    else updateWidget(element.id, { builderLabel: nextLabel || element.title });
    setNavigatorEditingId(null);
    setNavigatorEditingValue("");
  }

  function openElementsForContainer(containerId: string) {
    setInsertionTargetContainerId(containerId);
    setCanvasInsertionPoint(null);
    setSelection(null);
    setSidebarOpen(true);
    setMessage(null);
  }

  function openElementsAtCanvasPoint(siblingId: string, position: "before" | "after") {
    setCanvasInsertionPoint({
      siblingId,
      position,
      parentContainerId: getParentContainerId(workingDraft.containers ?? [], siblingId)
    });
    setInsertionTargetContainerId(null);
    setSelection(null);
    setSidebarOpen(true);
    setMessage(null);
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

  function buildFeaturedInstructors(selectionMap: Record<string, string[]>) {
    return (catalogQuery.data ?? [])
      .map((instructor) => {
        const courseIds = selectionMap[instructor.id] ?? [];
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
  }

  function updateFeaturedSelection(nextSelection: Record<string, string[]>) {
    setFeaturedSelection(nextSelection);
    if (selectedWidget?.type === "FEATURED_INSTRUCTORS") {
      updateWidget(selectedWidget.id, { instructors: buildFeaturedInstructors(nextSelection) });
    }
  }

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected(selection);
        return;
      }

      if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteCopiedElement();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selection) {
          event.preventDefault();
          setDeleteTarget(selection);
        }
        return;
      }

      if (event.key === "Escape") {
        setSelection(null);
        setInsertionTargetContainerId(null);
        setCanvasInsertionPoint(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selection, copiedElement, workingDraft, selectedContainer, selectedWidget, insertionTargetContainerId, undoStack, redoStack]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingDraftChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasPendingDraftChanges]);

  useEffect(() => {
    if (!navigatorDrag) return;

    const handleMouseMove = (event: MouseEvent) => {
      setNavigatorPosition({
        x: Math.max(8, navigatorDrag.originX + event.clientX - navigatorDrag.startX),
        y: Math.max(84, navigatorDrag.originY + event.clientY - navigatorDrag.startY)
      });
    };
    const handleMouseUp = () => setNavigatorDrag(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [navigatorDrag]);

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
        const elementSelection: Exclude<Selection, null> = { kind: isContainer(element) ? "container" : "widget", id: element.id };
        const elementLabel = element.builderLabel || (isContainer(element) ? "Container" : element.title) || "Element";
        const hasChildren = isContainer(element) && element.children.length > 0;
        const collapsed = collapsedNavigatorIds.has(element.id);
        const editing = navigatorEditingId === element.id;
        return (
          <div key={element.id}>
            <div
              className={`group/navitem flex items-center gap-1 rounded-xl py-1 pr-1 transition ${
                active ? "bg-slate-950 text-white" : element.hidden ? "text-slate-400 opacity-75 hover:bg-slate-100" : "text-slate-700 hover:bg-slate-100"
              }`}
              style={{ paddingLeft: `${12 + depth * 14}px` }}
            >
              {isContainer(element) ? (
                <button
                  type="button"
                  onClick={() => toggleNavigatorCollapse(element.id)}
                  disabled={!hasChildren}
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition disabled:opacity-25 ${collapsed ? "-rotate-90" : ""}`}
                  title={collapsed ? "Expand" : "Collapse"}
                >
                  <ChevronIcon />
                </button>
              ) : (
                <span className="h-7 w-7 shrink-0" />
              )}
              {editing ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                  {isContainer(element) ? <ContainerIcon /> : getWidgetIcon(element.type)}
                  <input
                    autoFocus
                    value={navigatorEditingValue}
                    onChange={(event) => {
                      setNavigatorEditingValue(event.target.value);
                    }}
                    onBlur={() => commitNavigatorRename(element)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitNavigatorRename(element);
                      if (event.key === "Escape") {
                        setNavigatorEditingId(null);
                        setNavigatorEditingValue("");
                      }
                    }}
                    placeholder={elementLabel}
                    className="min-w-0 flex-1 rounded-md border border-white/20 bg-white px-2 py-1 text-xs font-semibold text-slate-950"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelection(elementSelection);
                    setInsertionTargetContainerId(null);
                    setSidebarTab("CONTENT");
                  }}
                  onDoubleClick={() => startNavigatorRename(element)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm"
                >
                  {isContainer(element) ? <ContainerIcon /> : getWidgetIcon(element.type)}
                  <span className="min-w-0 flex-1 truncate">{elementLabel}</span>
                  {element.hidden ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Hidden</span> : null}
                </button>
              )}
              <div className={`flex shrink-0 items-center gap-1 transition ${active ? "opacity-100" : "opacity-0 group-hover/navitem:opacity-100"}`}>
                  <IconButton label="Move up" onClick={() => moveElement(element.id, -1)}><UpIcon /></IconButton>
                  <IconButton label="Move down" onClick={() => moveElement(element.id, 1)}><DownIcon /></IconButton>
                  <IconButton
                    label={element.hidden ? "Show" : "Hide"}
                    tone={element.hidden ? "success" : "default"}
                    onClick={() => {
                      if (isContainer(element)) updateContainer(element.id, { hidden: !element.hidden });
                      else updateWidget(element.id, { hidden: !element.hidden });
                    }}
                  >
                    {element.hidden ? <EyeIcon /> : <EyeOffIcon />}
                  </IconButton>
                  <IconButton label="Duplicate" onClick={() => duplicateSelected(elementSelection)}><CopyIcon /></IconButton>
                  <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(elementSelection)}><TrashIcon /></IconButton>
              </div>
            </div>
            {hasChildren && !collapsed ? renderNavigatorItems(element.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  const renderCanvasInsertionButton = (elementId: string, position: "before" | "after", tone: "container" | "widget", visible: boolean) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        openElementsAtCanvasPoint(elementId, position);
      }}
      className={`absolute left-1/2 z-30 h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-110 ${visible ? "inline-flex" : "hidden"} ${position === "before" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"} ${tone === "container" ? "bg-teal-600" : "bg-sky-600"}`}
      title={`Add ${position}`}
    >
      <PlusIcon />
    </button>
  );

  const renderCanvasElement = (element: HomepageElement): React.ReactNode => {
    const active = selection?.id === element.id;
    if (element.hidden) return null;
    const chromeVisible = shouldShowCanvasChrome(element.id);
    const deviceHidden = isDeviceHiddenInCanvas(element);
    const deviceHiddenClass = deviceHidden ? "opacity-45 blur-[1.5px] grayscale" : "";
    if (isContainer(element)) {
      return (
        <div
          key={element.id}
          role="button"
          tabIndex={0}
          onPointerMove={(event) => {
            event.stopPropagation();
            if (hoveredCanvasElementId !== element.id) setHoveredCanvasElementId(element.id);
          }}
          onPointerLeave={() => setHoveredCanvasElementId((current) => current === element.id ? null : current)}
          onClick={(event) => {
            event.stopPropagation();
            selectElement({ kind: "container", id: element.id }, "ADVANCED");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectElement({ kind: "container", id: element.id }, "ADVANCED");
            }
          }}
          className={`relative min-h-[44px] outline-offset-2 transition ${deviceHiddenClass} ${active ? "outline outline-2 outline-teal-500" : chromeVisible ? "outline outline-1 outline-teal-300" : ""}`}
          style={getContainerStyle(element, canvasViewport)}
        >
          {renderCanvasInsertionButton(element.id, "before", "container", chromeVisible)}
          {renderCanvasInsertionButton(element.id, "after", "container", chromeVisible)}
          <span className={`pointer-events-none absolute left-2 top-0 z-20 -translate-y-1/2 rounded-full bg-teal-600 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow ${chromeVisible ? "inline-flex" : "hidden"}`}>
            Container
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openElementsForContainer(element.id);
            }}
            className={`absolute right-2 top-2 z-20 h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition hover:scale-105 ${chromeVisible ? "inline-flex" : "hidden"}`}
            title="Add inside container"
          >
            <PlusIcon />
          </button>
          {element.children.length ? element.children.map(renderCanvasElement) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openElementsForContainer(element.id);
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
        onPointerMove={(event) => {
          event.stopPropagation();
          if (hoveredCanvasElementId !== element.id) setHoveredCanvasElementId(element.id);
        }}
        onPointerLeave={() => setHoveredCanvasElementId((current) => current === element.id ? null : current)}
        onClick={(event) => {
          event.stopPropagation();
          selectElement({ kind: "widget", id: element.id }, "CONTENT");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectElement({ kind: "widget", id: element.id }, "CONTENT");
          }
        }}
        className={`relative outline-offset-2 transition ${deviceHiddenClass} ${active ? "outline outline-2 outline-sky-500" : chromeVisible ? "outline outline-1 outline-sky-300" : ""}`}
      >
        {renderCanvasInsertionButton(element.id, "before", "widget", chromeVisible)}
        {renderCanvasInsertionButton(element.id, "after", "widget", chromeVisible)}
        <span className={`pointer-events-none absolute left-2 top-0 z-20 -translate-y-1/2 rounded-full bg-sky-600 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white shadow ${chromeVisible ? "inline-flex" : "hidden"}`}>
          Widget
        </span>
        <div className="pointer-events-none select-none">
          <HomepageCardView card={element} viewport={canvasViewport} mode="builder" />
        </div>
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
          <button type="button" onClick={() => openElementsForContainer(selectedContainer.id)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            <PlusIcon />
            Add inside this container
          </button>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Add child containers</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => addChildContainerSet(selectedContainer.id, count)}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (!selectedWidget) return null;

    const widgetLabelControl = (
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Navigator label</span>
        <input
          value={selectedWidget.builderLabel ?? ""}
          onChange={(event) => updateWidget(selectedWidget.id, { builderLabel: event.target.value })}
          className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
          placeholder={selectedWidget.title || "Widget"}
        />
      </label>
    );

    if (selectedWidget.type === "HEADING") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heading level</span>
            <select value={selectedWidget.textTag} onChange={(event) => updateWidget(selectedWidget.id, { textTag: event.target.value as Exclude<HomepageTextTag, "P"> })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              {(["H1", "H2", "H3", "H4", "H5", "H6"] as const).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Heading text</span>
            <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={4} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Write a strong homepage heading" />
          </label>
        </div>
      );
    }

    if (selectedWidget.type === "TEXT") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={8} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (selectedWidget.type === "BUTTON") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.label} onChange={(event) => updateWidget(selectedWidget.id, { label: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Button label" />
          <input value={selectedWidget.href} onChange={(event) => updateWidget(selectedWidget.id, { href: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="/courses or https://example.com" />
          <select value={selectedWidget.variant ?? "primary"} onChange={(event) => updateWidget(selectedWidget.id, { variant: event.target.value as HomepageButtonVariant })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
            <option value="primary">Primary button</option>
            <option value="secondary">Secondary button</option>
            <option value="ghost">Ghost button</option>
          </select>
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            Buttons are disabled inside the builder canvas and clickable only on the public homepage.
          </p>
        </div>
      );
    }

    if (selectedWidget.type === "IMAGE_BLOCK") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => setHomepageImageFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white" />
          <button type="button" disabled={!homepageImageFile || uploadHomepageImageMutation.isPending} onClick={() => uploadHomepageImageMutation.mutate()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {uploadHomepageImageMutation.isPending ? "Uploading..." : "Upload image"}
          </button>
          {selectedImagePreviewUrl ? <img src={selectedImagePreviewUrl} alt="Preview" className="h-40 w-full rounded-2xl object-cover" /> : null}
          <input value={selectedWidget.imageUrl} onChange={(event) => updateWidget(selectedWidget.id, { imageUrl: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Image URL or uploaded path" />
          <input value={selectedWidget.altText ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { altText: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Alt text" />
          <textarea value={selectedWidget.caption ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { caption: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Caption" />
        </div>
      );
    }

    if (selectedWidget.type === "SPACER") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
            Spacer creates vertical breathing room between widgets. Control the height from Style.
          </p>
        </div>
      );
    }

    if (selectedWidget.type === "DIVIDER") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <p className="rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
            Divider adds a visual separator line. Control color, width, and style from Style.
          </p>
        </div>
      );
    }

    if (selectedWidget.type === "VIDEO") {
      const status = getVideoUrlStatus(selectedWidget.videoUrl);
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Video URL</span>
            <input value={selectedWidget.videoUrl} onChange={(event) => updateWidget(selectedWidget.id, { videoUrl: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="YouTube, Vimeo, or direct embed URL" />
          </label>
          <p className={`rounded-2xl px-3 py-2 text-xs leading-5 ${status.tone === "success" ? "bg-teal-50 text-teal-800" : status.tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"}`}>
            {status.label}
          </p>
          <textarea value={selectedWidget.caption ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { caption: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional caption" />
        </div>
      );
    }

    if (selectedWidget.type === "ICON") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Icon symbol</p>
            <div className="grid grid-cols-6 gap-2">
              {iconSymbolOptions.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => updateWidget(selectedWidget.id, { iconSymbol: symbol })}
                  className={`flex h-10 items-center justify-center rounded-2xl border text-lg font-semibold transition ${selectedWidget.iconSymbol === symbol ? "border-teal-500 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50"}`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          <input value={selectedWidget.iconSymbol} onChange={(event) => updateWidget(selectedWidget.id, { iconSymbol: event.target.value.slice(0, 3) })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Custom icon symbol" />
          <textarea value={selectedWidget.content} onChange={(event) => updateWidget(selectedWidget.id, { content: event.target.value })} rows={4} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" />
        </div>
      );
    }

    if (selectedWidget.type === "LIST") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="List title" />
          <div className="space-y-2">
            {selectedWidget.items.map((item, index) => (
              <div key={`${selectedWidget.id}-item-${index}`} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <input value={item} onChange={(event) => updateWidget(selectedWidget.id, { items: selectedWidget.items.map((current, currentIndex) => currentIndex === index ? event.target.value : current) })} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder={`Item ${index + 1}`} />
                <IconButton label="Remove item" tone="danger" onClick={() => updateWidget(selectedWidget.id, { items: selectedWidget.items.filter((_, currentIndex) => currentIndex !== index) })}><TrashIcon /></IconButton>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateWidget(selectedWidget.id, { items: [...selectedWidget.items, "New item"] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <PlusIcon />
            Add list item
          </button>
        </div>
      );
    }

    if (selectedWidget.type === "CARD") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Card title" />
          <input value={selectedWidget.subtitle ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { subtitle: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subtitle" />
          <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Body" />
          <input value={selectedWidget.buttonLabel ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { buttonLabel: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Button label" />
          <input value={selectedWidget.buttonHref ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { buttonHref: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="/courses" />
        </div>
      );
    }

    if (selectedWidget.type === "TESTIMONIAL") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <textarea value={selectedWidget.quote} onChange={(event) => updateWidget(selectedWidget.id, { quote: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Quote" />
          <input value={selectedWidget.authorName} onChange={(event) => updateWidget(selectedWidget.id, { authorName: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Author name" />
          <input value={selectedWidget.authorRole ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { authorRole: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Author role" />
          <input value={selectedWidget.avatarUrl ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { avatarUrl: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Avatar URL" />
        </div>
      );
    }

    if (selectedWidget.type === "STATS") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Section title" />
          <div className="space-y-3">
            {selectedWidget.stats.map((item, index) => (
              <div key={item.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Stat {index + 1}</p>
                  <IconButton label="Remove stat" tone="danger" onClick={() => updateWidget(selectedWidget.id, { stats: selectedWidget.stats.filter((stat) => stat.id !== item.id) })}><TrashIcon /></IconButton>
                </div>
                <input value={item.value} onChange={(event) => updateWidget(selectedWidget.id, { stats: selectedWidget.stats.map((stat) => stat.id === item.id ? { ...stat, value: event.target.value } : stat) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Value, e.g. 120+" />
                <input value={item.label} onChange={(event) => updateWidget(selectedWidget.id, { stats: selectedWidget.stats.map((stat) => stat.id === item.id ? { ...stat, label: event.target.value } : stat) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Label" />
                <textarea value={item.description ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { stats: selectedWidget.stats.map((stat) => stat.id === item.id ? { ...stat, description: event.target.value } : stat) })} rows={2} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Optional description" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateWidget(selectedWidget.id, { stats: [...selectedWidget.stats, { id: createId("stat"), value: "0", label: "New stat", description: "" }] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <PlusIcon />
            Add stat
          </button>
        </div>
      );
    }

    if (selectedWidget.type === "FAQ") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Section title" />
          <div className="space-y-3">
            {selectedWidget.faqs.map((item, index) => (
              <div key={item.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Question {index + 1}</p>
                  <IconButton label="Remove question" tone="danger" onClick={() => updateWidget(selectedWidget.id, { faqs: selectedWidget.faqs.filter((faq) => faq.id !== item.id) })}><TrashIcon /></IconButton>
                </div>
                <input value={item.question} onChange={(event) => updateWidget(selectedWidget.id, { faqs: selectedWidget.faqs.map((faq) => faq.id === item.id ? { ...faq, question: event.target.value } : faq) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Question" />
                <textarea value={item.answer} onChange={(event) => updateWidget(selectedWidget.id, { faqs: selectedWidget.faqs.map((faq) => faq.id === item.id ? { ...faq, answer: event.target.value } : faq) })} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder="Answer" />
              </div>
            ))}
          </div>
          <button type="button" onClick={() => updateWidget(selectedWidget.id, { faqs: [...selectedWidget.faqs, { id: createId("faq"), question: "New question", answer: "Answer goes here." }] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            <PlusIcon />
            Add question
          </button>
        </div>
      );
    }

    if (selectedWidget.type === "COURSE_LIST") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Section title" />
          <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional intro text" />
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Courses</p>
            {catalogCourses.length ? catalogCourses.map((course) => {
              const checked = selectedWidget.items.some((item) => item.id === course.id);
              return (
                <label key={course.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const nextItems = checked ? selectedWidget.items.filter((item) => item.id !== course.id) : [...selectedWidget.items, course];
                      updateWidget(selectedWidget.id, { items: nextItems });
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{course.title}</span>
                    <span className="text-xs text-slate-500">{course.instructorName}</span>
                  </span>
                </label>
              );
            }) : <p className="text-sm text-slate-500">No published instructor courses are available yet.</p>}
          </div>
        </div>
      );
    }

    if (selectedWidget.type === "INSTRUCTOR_LIST") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Section title" />
          <input value={selectedWidget.subtitle ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { subtitle: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subtitle" />
          <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional intro text" />
          <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Instructors</p>
            {(catalogQuery.data ?? []).length ? (catalogQuery.data ?? []).map((instructor) => {
              const checked = selectedWidget.instructors.some((item) => item.id === instructor.id);
              return (
                <label key={instructor.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const nextInstructor: HomepageInstructorEntry = {
                        id: instructor.id,
                        fullName: instructor.fullName,
                        bio: instructor.bio,
                        profileImage: instructor.profileImage,
                        courses: instructor.instructorCourses
                      };
                      const nextInstructors = checked ? selectedWidget.instructors.filter((item) => item.id !== instructor.id) : [...selectedWidget.instructors, nextInstructor];
                      updateWidget(selectedWidget.id, { instructors: nextInstructors });
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{instructor.fullName}</span>
                    <span className="text-xs text-slate-500">{instructor.instructorCourses.length} published courses</span>
                  </span>
                </label>
              );
            }) : <p className="text-sm text-slate-500">No active instructors are available yet.</p>}
          </div>
        </div>
      );
    }

    if (selectedWidget.type === "FEATURED_INSTRUCTORS") {
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Section title" />
          <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={3} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Optional intro text" />
          <p className="rounded-2xl bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-800">
            Course selections update the widget immediately. No separate apply step is needed.
          </p>
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
                        onChange={() => {
                          const nextSelection = { ...featuredSelection };
                          const selected = nextSelection[instructor.id] ?? [];
                          nextSelection[instructor.id] = checked ? selected.filter((id) => id !== course.id) : [...selected, course.id];
                          if (!nextSelection[instructor.id].length) delete nextSelection[instructor.id];
                          updateFeaturedSelection(nextSelection);
                        }}
                      />
                      <span>
                        <span className="block font-medium text-slate-800">{course.title}</span>
                        <span className="text-xs text-slate-500">{course.category ?? "Course"}</span>
                      </span>
                    </label>
                  );
                })}
                {!instructor.instructorCourses.length ? <p className="text-sm text-slate-500">No published courses for this instructor.</p> : null}
              </div>
            </div>
          ))}
          {!(catalogQuery.data ?? []).length ? <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-800">No instructors are available yet.</p> : null}
        </div>
      );
    }

    if (contentSectionWidgetTypes.includes(selectedWidget.type)) {
      const bullets = "bullets" in selectedWidget ? selectedWidget.bullets ?? [] : [];
      return (
        <div className="space-y-4">
          {widgetLabelControl}
          <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Title" />
          <input value={selectedWidget.subtitle ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { subtitle: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subtitle" />
          <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Body" />
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Bullet points</p>
            {bullets.map((bullet, index) => (
              <div key={`${selectedWidget.id}-bullet-${index}`} className="flex items-center gap-2">
                <input value={bullet} onChange={(event) => updateWidget(selectedWidget.id, { bullets: bullets.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" placeholder={`Bullet ${index + 1}`} />
                <IconButton label="Remove bullet" tone="danger" onClick={() => updateWidget(selectedWidget.id, { bullets: bullets.filter((_, itemIndex) => itemIndex !== index) })}><TrashIcon /></IconButton>
              </div>
            ))}
            <button type="button" onClick={() => updateWidget(selectedWidget.id, { bullets: [...bullets, "New bullet point"] })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <PlusIcon />
              Add bullet
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {widgetLabelControl}
        <input value={selectedWidget.title} onChange={(event) => updateWidget(selectedWidget.id, { title: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Title" />
        <input value={selectedWidget.subtitle ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { subtitle: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Subtitle" />
        <textarea value={selectedWidget.body ?? ""} onChange={(event) => updateWidget(selectedWidget.id, { body: event.target.value })} rows={5} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Body" />
      </div>
    );
  };

  const renderStyleTab = () => {
    if (selectedContainer) {
      return (
        <div className="space-y-3">
          <ControlGroup title="Background" defaultOpen>
            <ColorControl label="Background color" value={selectedContainer.background?.color ?? "transparent"} onChange={(color) => updateContainer(selectedContainer.id, { background: { ...(selectedContainer.background ?? {}), color } })} />
            <input value={selectedContainer.backgroundImage ?? ""} onChange={(event) => updateContainer(selectedContainer.id, { backgroundImage: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Background image URL" />
          </ControlGroup>
          <ControlGroup title="Border">
            <BorderControl value={selectedContainer.border} onChange={(border) => updateContainer(selectedContainer.id, { border })} />
          </ControlGroup>
        </div>
      );
    }
    if (!selectedWidget) return null;

    type PartKey = keyof HomepageCardPartStyles;
    const updatePart = (key: PartKey, patch: Partial<HomepagePartStyle>) => {
      updateWidget(selectedWidget.id, {
        partStyles: {
          ...(selectedWidget.partStyles ?? {}),
          [key]: {
            ...(selectedWidget.partStyles?.[key] ?? {}),
            ...patch
          }
        }
      });
    };
    const part = (key: PartKey) => selectedWidget.partStyles?.[key] ?? {};
    const typographyGroup = (key: PartKey, title: string, options: { color?: boolean; align?: boolean; spacing?: boolean; first?: boolean } = {}) => (
      <ControlGroup title={title} defaultOpen={options.first ?? (title === "Title" || title === "Text")}>
        {options.color !== false ? <ColorControl label="Color" value={part(key).color ?? ""} allowTransparent={false} onChange={(color) => updatePart(key, { color })} /> : null}
        <TypographyControl value={part(key).typography} onChange={(typography) => updatePart(key, { typography })} />
        {options.align ? <AlignmentControl value={part(key).align} onChange={(align) => updatePart(key, { align })} /> : null}
        {options.spacing ? <BoxSpacingControl label="Spacing around this part" value={part(key).spacing?.margin} onChange={(margin) => updatePart(key, { spacing: { ...(part(key).spacing ?? {}), margin } })} /> : null}
      </ControlGroup>
    );
    const gapGroup = (key: PartKey, title: string, label = "Gap") => (
      <ControlGroup title={title} defaultOpen={false}>
        <NumberControl label={label} value={part(key).gap} min={0} onChange={(gap) => updatePart(key, { gap })} />
      </ControlGroup>
    );
    const cardVisualGroup = (key: PartKey, title: string) => (
      <ControlGroup title={title} defaultOpen={false}>
        <ColorControl label="Background" value={part(key).backgroundColor ?? ""} onChange={(backgroundColor) => updatePart(key, { backgroundColor })} />
        <BoxSpacingControl label="Padding" value={part(key).spacing?.padding} onChange={(padding) => updatePart(key, { spacing: { ...(part(key).spacing ?? {}), padding } })} />
        <BorderControl value={part(key).border} onChange={(border) => updatePart(key, { border })} />
      </ControlGroup>
    );
    const imageVisualGroup = (key: PartKey, title: string) => (
      <ControlGroup title={title} defaultOpen={false}>
        <LengthControl label="Width" value={part(key).width} onChange={(width) => updatePart(key, { width })} />
        <LengthControl label="Height" value={part(key).height} onChange={(height) => updatePart(key, { height })} />
        <NumberControl label="Radius" value={part(key).radius} min={0} onChange={(radius) => updatePart(key, { radius })} />
        <select value={part(key).objectFit ?? ""} onChange={(event) => updatePart(key, { objectFit: event.target.value ? event.target.value as HomepageImageFit : undefined })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Default fit</option>
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
        </select>
        <select value={part(key).objectPosition ?? ""} onChange={(event) => updatePart(key, { objectPosition: event.target.value ? event.target.value as HomepageImagePosition : undefined })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Default position</option>
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
      </ControlGroup>
    );

    return (
      <div className="space-y-3">
        {"textAlign" in selectedWidget ? (
          <ControlGroup title="Alignment" defaultOpen>
            <select value={selectedWidget.textAlign ?? "left"} onChange={(event) => updateWidget(selectedWidget.id, { textAlign: event.target.value as HomepageAlign })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
          </ControlGroup>
        ) : null}
        {["HEADING"].includes(selectedWidget.type) ? typographyGroup("title", "Heading", { align: true, spacing: true, first: true }) : null}
        {["TEXT"].includes(selectedWidget.type) ? typographyGroup("body", "Text", { align: true, spacing: true }) : null}
        {["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA", "CARD", "COURSE_LIST", "INSTRUCTOR_LIST", "FEATURED_INSTRUCTORS", "LIST", "STATS", "FAQ"].includes(selectedWidget.type) ? typographyGroup("title", "Title", { align: true, spacing: true }) : null}
        {["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA", "CARD", "INSTRUCTOR_LIST", "FEATURED_INSTRUCTORS"].includes(selectedWidget.type) ? typographyGroup("subtitle", "Subtitle / accent", { align: true, spacing: true }) : null}
        {["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA", "CARD", "COURSE_LIST", "INSTRUCTOR_LIST", "FEATURED_INSTRUCTORS"].includes(selectedWidget.type) ? typographyGroup("body", "Body", { align: true, spacing: true }) : null}
        {selectedWidget.type === "BUTTON" || selectedWidget.type === "CARD" ? (
          <ControlGroup title="Button">
            <ColorControl label="Button background" value={selectedWidget.buttonStyle?.backgroundColor ?? "#020617"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), backgroundColor: color } })} />
            <ColorControl label="Button text" value={selectedWidget.buttonStyle?.textColor ?? "#ffffff"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), textColor: color } })} />
            <ColorControl label="Hover background" value={selectedWidget.buttonStyle?.hoverBackgroundColor ?? "#0f172a"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), hoverBackgroundColor: color } })} />
            <ColorControl label="Hover text" value={selectedWidget.buttonStyle?.hoverTextColor ?? "#ffffff"} allowTransparent={false} onChange={(color) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), hoverTextColor: color } })} />
            <BoxSpacingControl
              label="Button padding"
              value={selectedWidget.buttonStyle?.padding}
              onChange={(padding) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), padding } })}
            />
            <BorderControl value={selectedWidget.buttonStyle?.border} onChange={(border) => updateWidget(selectedWidget.id, { buttonStyle: { ...(selectedWidget.buttonStyle ?? createButtonStyle()), border } })} />
          </ControlGroup>
        ) : null}
        {selectedWidget.type === "ICON" ? (
          <ControlGroup title="Icon symbol" defaultOpen>
            <input value={part("icon").iconSymbol ?? selectedWidget.iconSymbol} onChange={(event) => updatePart("icon", { iconSymbol: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Icon symbol" />
            <LengthControl label="Icon size" value={part("icon").size ?? selectedWidget.iconSize} onChange={(size) => updatePart("icon", { size })} />
            <ColorControl label="Icon color" value={part("icon").color ?? selectedWidget.iconColor ?? ""} allowTransparent={false} onChange={(color) => updatePart("icon", { color })} />
          </ControlGroup>
        ) : null}
        {selectedWidget.type === "ICON" ? typographyGroup("body", "Icon text", { align: true, spacing: true }) : null}
        {selectedWidget.type === "DIVIDER" ? (
          <ControlGroup title="Divider" defaultOpen>
            <ColorControl label="Divider color" value={selectedWidget.dividerColor ?? "#cbd5e1"} allowTransparent={false} onChange={(dividerColor) => updateWidget(selectedWidget.id, { dividerColor })} />
            <label>
              <span className="mb-1 block text-xs text-slate-500">Divider width</span>
              <input
                type="number"
                value={selectedWidget.dividerWidth ?? 1}
                onChange={(event) => updateWidget(selectedWidget.id, { dividerWidth: Number(event.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <select value={selectedWidget.dividerStyle ?? "solid"} onChange={(event) => updateWidget(selectedWidget.id, { dividerStyle: event.target.value as "solid" | "dashed" })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
            </select>
          </ControlGroup>
        ) : null}
        {selectedWidget.type === "TESTIMONIAL" ? (
          <>
            {typographyGroup("quote", "Quote", { align: true, spacing: true })}
            {typographyGroup("authorName", "Author name", { spacing: true })}
            {typographyGroup("authorRole", "Author role", { spacing: true })}
            {imageVisualGroup("image", "Avatar")}
          </>
        ) : null}
        {selectedWidget.type === "SPACER" ? (
          <ControlGroup title="Spacer" defaultOpen>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Spacer height</p>
            <select value={selectedWidget.heightPreset ?? "medium"} onChange={(event) => updateWidget(selectedWidget.id, { heightPreset: event.target.value as HomepageSizePreset })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="none">None</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </ControlGroup>
        ) : null}
        {selectedWidget.type === "IMAGE_BLOCK" ? (
          <>
          <ControlGroup title="Image" defaultOpen>
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
          </ControlGroup>
          {imageVisualGroup("image", "Image frame")}
          {typographyGroup("caption", "Caption", { align: true, spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "VIDEO" ? (
          <>
          <ControlGroup title="Video" defaultOpen>
            <select value={selectedWidget.aspectRatio ?? "16:9"} onChange={(event) => updateWidget(selectedWidget.id, { aspectRatio: event.target.value as HomepageVideoAspectRatio })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm">
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
            </select>
          </ControlGroup>
          {imageVisualGroup("image", "Video frame")}
          {typographyGroup("caption", "Caption", { align: true, spacing: true })}
          </>
        ) : null}
        {["ABOUT_US", "WHY_US", "ABOUT_SITE", "TEXT_MEDIA"].includes(selectedWidget.type) ? (
          <>
            {gapGroup("list", "Bullet list", "Gap between bullets")}
            {gapGroup("listItem", "Bullet row", "Icon/text gap")}
            <ControlGroup title="Bullet icon" defaultOpen={false}>
              <LengthControl label="Icon size" value={part("listIcon").size} onChange={(size) => updatePart("listIcon", { size })} />
              <ColorControl label="Icon color" value={part("listIcon").color ?? "#0ea5e9"} allowTransparent={false} onChange={(color) => updatePart("listIcon", { color })} />
              <NumberControl label="Icon radius" value={part("listIcon").radius} min={0} onChange={(radius) => updatePart("listIcon", { radius })} />
            </ControlGroup>
            {typographyGroup("listText", "Bullet text", { spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "LIST" ? (
          <>
            {gapGroup("list", "List spacing", "Gap between list items")}
            {gapGroup("listItem", "Item layout", "Icon/text gap")}
            <ControlGroup title="List icon">
              <LengthControl label="Icon size" value={part("listIcon").size} onChange={(size) => updatePart("listIcon", { size })} />
              <ColorControl label="Icon color" value={part("listIcon").color ?? "#0ea5e9"} allowTransparent={false} onChange={(color) => updatePart("listIcon", { color })} />
              <NumberControl label="Icon radius" value={part("listIcon").radius} min={0} onChange={(radius) => updatePart("listIcon", { radius })} />
            </ControlGroup>
            {typographyGroup("listText", "List text", { spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "STATS" ? (
          <>
            {gapGroup("list", "Stats grid", "Gap between stats")}
            {cardVisualGroup("card", "Stat card")}
            {typographyGroup("statValue", "Stat value", { align: true, spacing: true })}
            {typographyGroup("statLabel", "Stat label", { align: true, spacing: true })}
            {typographyGroup("statDescription", "Stat description", { align: true, spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "FAQ" ? (
          <>
            {gapGroup("list", "FAQ list", "Gap between questions")}
            {cardVisualGroup("card", "FAQ card")}
            {typographyGroup("faqQuestion", "Question", { spacing: true })}
            {typographyGroup("faqAnswer", "Answer", { spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "COURSE_LIST" ? (
          <>
            {gapGroup("list", "Course list", "Gap between courses")}
            {cardVisualGroup("card", "Course card")}
            {imageVisualGroup("image", "Course thumbnail")}
            {typographyGroup("courseTitle", "Course title", { spacing: true })}
            {typographyGroup("courseDescription", "Course description", { spacing: true })}
            {typographyGroup("courseMeta", "Course metadata", { spacing: true })}
          </>
        ) : null}
        {selectedWidget.type === "INSTRUCTOR_LIST" || selectedWidget.type === "FEATURED_INSTRUCTORS" ? (
          <>
            {gapGroup("list", "Instructor grid", "Gap between cards")}
            {cardVisualGroup("card", "Instructor card")}
            {imageVisualGroup("image", "Instructor avatar")}
            {typographyGroup("instructorName", "Instructor name", { spacing: true })}
            {typographyGroup("instructorBio", "Instructor bio", { spacing: true })}
            {typographyGroup("courseMeta", "Course tags", { spacing: true })}
          </>
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
    const responsiveDevice = canvasViewport === "auto" ? "desktop" : canvasViewport;
    const updateResponsiveContainer = (
      container: HomepageContainer,
      patch: NonNullable<HomepageContainer["responsive"]>["desktop"]
    ) => {
      updateContainer(container.id, {
        responsive: {
          ...(container.responsive ?? {}),
          [responsiveDevice]: {
            ...(container.responsive?.[responsiveDevice] ?? {}),
            ...patch
          }
        }
      });
    };
    return (
      <div className="space-y-3">
        {isContainer(element) ? (
          <>
            <ControlGroup title="Spacing" defaultOpen>
              <BoxSpacingControl label="Padding" value={element.spacing?.padding} onChange={(padding) => updateCommon({ spacing: { ...(element.spacing ?? {}), padding } })} />
              <BoxSpacingControl label="Margin" value={element.spacing?.margin} onChange={(margin) => updateCommon({ spacing: { ...(element.spacing ?? {}), margin } })} />
              <div className="grid grid-cols-2 gap-2">
                <NumberControl label="Vertical gap" value={element.rowGap ?? element.gap ?? 10} min={0} onChange={(rowGap) => updateContainer(element.id, { rowGap })} />
                <NumberControl label="Horizontal gap" value={element.columnGap ?? element.gap ?? 10} min={0} onChange={(columnGap) => updateContainer(element.id, { columnGap })} />
              </div>
            </ControlGroup>
            <ControlGroup title="Layout">
              <IconSegmentedControl<HomepageContainerDirection>
                label="Direction"
                value={element.direction ?? "column"}
                onChange={(direction) => updateContainer(element.id, { direction })}
                options={[
                  { value: "column", label: "Vertical", icon: <ColumnDirectionIcon /> },
                  { value: "row", label: "Horizontal", icon: <RowDirectionIcon /> }
                ]}
              />
              <IconSegmentedControl<HomepageContainerWrap>
                label="Wrap"
                value={element.wrap ?? "wrap"}
                onChange={(wrap) => updateContainer(element.id, { wrap })}
                options={[
                  { value: "wrap", label: "Wrap", icon: <WrapIcon /> },
                  { value: "nowrap", label: "No wrap", icon: <NoWrapIcon /> }
                ]}
              />
              <IconSegmentedControl<HomepageContainerJustify>
                label="Justify"
                value={element.justify ?? "start"}
                onChange={(justify) => updateContainer(element.id, { justify })}
                options={[
                  { value: "start", label: "Start", icon: <AlignStartIcon /> },
                  { value: "center", label: "Center", icon: <AlignCenterIcon /> },
                  { value: "end", label: "End", icon: <AlignEndIcon /> },
                  { value: "between", label: "Space between", icon: <AlignBetweenIcon /> }
                ]}
              />
              <IconSegmentedControl<HomepageContainerAlign>
                label="Align"
                value={element.align ?? "stretch"}
                onChange={(align) => updateContainer(element.id, { align })}
                options={[
                  { value: "stretch", label: "Stretch", icon: <StretchIcon /> },
                  { value: "start", label: "Start", icon: <AlignStartIcon /> },
                  { value: "center", label: "Center", icon: <AlignCenterIcon /> },
                  { value: "end", label: "End", icon: <AlignEndIcon /> }
                ]}
              />
            </ControlGroup>
            <ControlGroup title="Size">
              <LengthControl label="Width" value={element.width} onChange={(width) => updateContainer(element.id, { width })} />
              <LengthControl label="Max width" value={element.maxWidth} onChange={(maxWidth) => updateContainer(element.id, { maxWidth })} />
              <LengthControl label="Min height" value={element.minHeight} onChange={(minHeight) => updateContainer(element.id, { minHeight })} />
              <LengthControl label="Height" value={element.height} onChange={(height) => updateContainer(element.id, { height })} />
            </ControlGroup>
            <ControlGroup title={`Responsive overrides: ${responsiveDevice}`}>
              <select
                value={element.responsive?.[responsiveDevice]?.direction ?? ""}
                onChange={(event) => updateResponsiveContainer(element, { direction: event.target.value ? event.target.value as HomepageContainerDirection : undefined })}
                className="w-full rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Inherit direction</option>
                <option value="column">Below each other</option>
                <option value="row">Next to each other</option>
              </select>
              <LengthControl label="Device width" value={element.responsive?.[responsiveDevice]?.width} onChange={(width) => updateResponsiveContainer(element, { width })} />
              <LengthControl label="Device max width" value={element.responsive?.[responsiveDevice]?.maxWidth} onChange={(maxWidth) => updateResponsiveContainer(element, { maxWidth })} />
              <LengthControl label="Device min height" value={element.responsive?.[responsiveDevice]?.minHeight} onChange={(minHeight) => updateResponsiveContainer(element, { minHeight })} />
              <LengthControl label="Device height" value={element.responsive?.[responsiveDevice]?.height} onChange={(height) => updateResponsiveContainer(element, { height })} />
            </ControlGroup>
            <ControlGroup title="Responsive">
              <VisibilityControls visibility={element.visibility} onChange={(visibility) => updateCommon({ visibility })} />
            </ControlGroup>
            <ControlGroup title="Actions">
              <div className="flex gap-2">
                <IconButton label="Select parent" disabled={!selection} onClick={selectParentElement}><UpIcon /></IconButton>
                <IconButton label="Copy" disabled={!selection} onClick={() => copySelected(selection)}><CopyIcon /></IconButton>
                <IconButton label="Paste" disabled={!copiedElement} onClick={pasteCopiedElement}><ClipboardIcon /></IconButton>
                <IconButton label={element.hidden ? "Show" : "Hide"} tone={element.hidden ? "success" : "default"} onClick={() => updateCommon({ hidden: !element.hidden })}>{element.hidden ? <EyeIcon /> : <EyeOffIcon />}</IconButton>
                <IconButton label="Duplicate" onClick={() => duplicateSelected(selection)}><CopyIcon /></IconButton>
                <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(selection)}><TrashIcon /></IconButton>
              </div>
            </ControlGroup>
          </>
        ) : selectedWidget?.type === "ICON" ? (
          <>
          <ControlGroup title="Spacing" defaultOpen>
            <BoxSpacingControl label="Wrapper padding" value={element.spacing?.padding} onChange={(padding) => updateCommon({ spacing: { ...(element.spacing ?? {}), padding } })} />
            <BoxSpacingControl label="Wrapper margin" value={element.spacing?.margin} onChange={(margin) => updateCommon({ spacing: { ...(element.spacing ?? {}), margin } })} />
          </ControlGroup>
          <ControlGroup title="Responsive">
            <VisibilityControls visibility={element.visibility} onChange={(visibility) => updateCommon({ visibility })} />
          </ControlGroup>
          <ControlGroup title="Actions">
            <div className="flex gap-2">
              <IconButton label="Select parent" disabled={!selection} onClick={selectParentElement}><UpIcon /></IconButton>
              <IconButton label="Copy" disabled={!selection} onClick={() => copySelected(selection)}><CopyIcon /></IconButton>
              <IconButton label="Paste" disabled={!copiedElement} onClick={pasteCopiedElement}><ClipboardIcon /></IconButton>
              <IconButton label={element.hidden ? "Show" : "Hide"} tone={element.hidden ? "success" : "default"} onClick={() => updateCommon({ hidden: !element.hidden })}>{element.hidden ? <EyeIcon /> : <EyeOffIcon />}</IconButton>
              <IconButton label="Duplicate" onClick={() => duplicateSelected(selection)}><CopyIcon /></IconButton>
              <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(selection)}><TrashIcon /></IconButton>
            </div>
          </ControlGroup>
          <ControlGroup title="Legacy icon field">
            <input value={selectedWidget.iconSymbol} onChange={(event) => updateWidget(selectedWidget.id, { iconSymbol: event.target.value })} className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" placeholder="Icon symbol" />
          </ControlGroup>
          <ControlGroup title="Background">
            <ColorControl label="Wrapper background color" value={element.background?.color ?? "transparent"} onChange={(color) => updateCommon({ background: { ...(element.background ?? {}), color } })} />
          </ControlGroup>
          <ControlGroup title="Border">
            <BorderControl value={element.border} onChange={(border) => updateCommon({ border })} />
          </ControlGroup>
          </>
        ) : null}
        {!isContainer(element) && selectedWidget?.type !== "ICON" ? (
          <>
            <ControlGroup title="Spacing" defaultOpen>
              <BoxSpacingControl label="Wrapper padding" value={element.spacing?.padding} onChange={(padding) => updateCommon({ spacing: { ...(element.spacing ?? {}), padding } })} />
              <BoxSpacingControl label="Wrapper margin" value={element.spacing?.margin} onChange={(margin) => updateCommon({ spacing: { ...(element.spacing ?? {}), margin } })} />
            </ControlGroup>
            <ControlGroup title="Responsive">
              <VisibilityControls visibility={element.visibility} onChange={(visibility) => updateCommon({ visibility })} />
            </ControlGroup>
            <ControlGroup title="Actions">
              <div className="flex gap-2">
                <IconButton label="Select parent" disabled={!selection} onClick={selectParentElement}><UpIcon /></IconButton>
                <IconButton label="Copy" disabled={!selection} onClick={() => copySelected(selection)}><CopyIcon /></IconButton>
                <IconButton label="Paste" disabled={!copiedElement} onClick={pasteCopiedElement}><ClipboardIcon /></IconButton>
                <IconButton label={element.hidden ? "Show" : "Hide"} tone={element.hidden ? "success" : "default"} onClick={() => updateCommon({ hidden: !element.hidden })}>{element.hidden ? <EyeIcon /> : <EyeOffIcon />}</IconButton>
                <IconButton label="Duplicate" onClick={() => duplicateSelected(selection)}><CopyIcon /></IconButton>
                <IconButton label="Delete" tone="danger" onClick={() => setDeleteTarget(selection)}><TrashIcon /></IconButton>
              </div>
            </ControlGroup>
            <ControlGroup title="Background">
              <ColorControl label="Wrapper background color" value={element.background?.color ?? "transparent"} onChange={(color) => updateCommon({ background: { ...(element.background ?? {}), color } })} />
            </ControlGroup>
            <ControlGroup title="Border">
              <BorderControl value={element.border} onChange={(border) => updateCommon({ border })} />
            </ControlGroup>
          </>
        ) : null}
      </div>
    );
  };

  const selectedLabel = selectedContainer?.builderLabel || selectedWidget?.builderLabel || selectedWidget?.title || (selectedContainer ? "Container" : "Elements");
  const selectedKindLabel = selectedContainer ? "Container" : selectedWidget ? "Widget" : "Elements";
  const selectedPanelTitle = sidebarTab === "CONTENT" ? "Content" : sidebarTab === "STYLE" ? "Style" : "Advanced";

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="flex h-[4.75rem] items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
        <div className="flex items-center gap-3">
          <a href="/admin/overview" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700"><BackIcon /></a>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-teal-700">Homepage</p>
            <h1 className="text-lg font-semibold text-slate-950">Builder</h1>
            <p className="text-xs text-slate-500">
              {hasPendingDraftChanges ? "Unsaved edits" : `Saved: ${draftSaveLabel}`} - {workingDraftSummary.containers} containers - {workingDraftSummary.widgets} widgets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Undo" disabled={!undoStack.length} onClick={undo}><UndoIcon /></IconButton>
          <IconButton label="Redo" disabled={!redoStack.length} onClick={redo}><RedoIcon /></IconButton>
          <IconButton label="Copy selected" disabled={!selection} onClick={() => copySelected(selection)}><CopyIcon /></IconButton>
          <IconButton label="Paste copied" disabled={!copiedElement} onClick={pasteCopiedElement}><ClipboardIcon /></IconButton>
          <div className="mx-2 flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {(["desktop", "tablet", "mobile"] as const).map((viewport) => (
              <IconButton key={viewport} label={viewport} active={canvasViewport === viewport} onClick={() => setCanvasViewport(viewport)}>
                {viewport === "desktop" ? <MonitorIcon /> : viewport === "tablet" ? <TabletIcon /> : <PhoneIcon />}
              </IconButton>
            ))}
          </div>
          <IconButton label={showPreviewHeader ? "Hide header" : "Show header"} active={showPreviewHeader} onClick={() => setShowPreviewHeader((value) => !value)}><LayersIcon /></IconButton>
          <IconButton label={showPreviewFooter ? "Hide footer" : "Show footer"} active={showPreviewFooter} onClick={() => setShowPreviewFooter((value) => !value)}><BoxIcon /></IconButton>
          <IconButton label={navigatorOpen ? "Hide navigator" : "Show navigator"} active={navigatorOpen} onClick={() => setNavigatorOpen((value) => !value)}><LayersIcon /></IconButton>
          {hasPendingDraftChanges ? (
            <button type="button" onClick={() => saveDraftMutation.mutate(workingDraft)} disabled={saveDraftMutation.isPending} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">
              {saveDraftMutation.isPending ? "Saving..." : "Draft"}
            </button>
          ) : null}
          <button type="button" onClick={() => setResetConfirmOpen(true)} disabled={!homepageQuery.data?.hasPublishedContent} className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
            Reset
          </button>
          {canOpenPublishReview ? (
            <button type="button" onClick={openPublishReview} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              Publish
            </button>
          ) : null}
        </div>
      </div>

      <div className={`grid min-h-[calc(100vh-4.75rem)] ${sidebarOpen ? "grid-cols-[20rem_minmax(0,1fr)]" : "grid-cols-1"}`}>
        {sidebarOpen ? (
          <aside className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto border-r border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-teal-700">{selectedKindLabel}</p>
                <h2 className="truncate text-lg font-semibold text-slate-950">{selection ? selectedLabel : "Builder"}</h2>
              </div>
              <IconButton label="Close sidebar" onClick={() => setSidebarOpen(false)}><BackIcon /></IconButton>
            </div>

            {message ? <div className="mt-4"><StatusBanner variant={message.type}>{message.text}</StatusBanner></div> : null}
            {homepageQuery.error instanceof Error ? <div className="mt-4"><StatusBanner variant="error">{homepageQuery.error.message}</StatusBanner></div> : null}

            {!selection ? (
              <>
                <div className="mt-4 space-y-4">
                  <EditorSection title="Structure">
                    <div className="space-y-3">
                      {canvasInsertionPoint ? (
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                          Inserting {canvasInsertionPoint.position} selected canvas item in: <span className="font-semibold">{targetContainerLabel}</span>
                          <button type="button" onClick={() => setCanvasInsertionPoint(null)} className="ml-2 font-semibold text-sky-700 underline">
                            clear
                          </button>
                        </div>
                      ) : null}
                      {canInsertIntoTarget ? (
                        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs leading-5 text-teal-900">
                          Adding inside: <span className="font-semibold">{targetContainerLabel}</span>
                          <button type="button" onClick={() => setInsertionTargetContainerId(null)} className="ml-2 font-semibold text-teal-700 underline">
                            clear
                          </button>
                        </div>
                      ) : null}
                      <button type="button" onClick={() => addElement(createContainer())} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                        <ContainerIcon />
                        {canvasInsertionPoint ? "Container at insertion point" : canInsertIntoTarget ? "Container inside target" : "Root container"}
                      </button>
                    </div>
                  </EditorSection>
                  <EditorSection title="Widgets">
                    <div className="space-y-3">
                      <input value={widgetSearch} onChange={(event) => setWidgetSearch(event.target.value)} placeholder="Search widgets" className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm" />
                      <div className="grid grid-cols-2 gap-3">
                        {filteredWidgets.map((item) => (
                          <button key={item.type} type="button" disabled={!canInsertIntoTarget} onClick={() => addElement(createWidget(item.type))} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-center text-xs font-semibold text-slate-800 shadow-sm hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45">
                            {getWidgetIcon(item.type)}
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  </EditorSection>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Editing</p>
                      <p className="truncate text-sm font-semibold text-slate-950">{selectedLabel}</p>
                    </div>
                    <button type="button" onClick={() => { setSelection(null); setInsertionTargetContainerId(null); setCanvasInsertionPoint(null); }} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                      Back
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 rounded-[18px] border border-slate-200 bg-slate-100 p-1">
                  {(["CONTENT", "STYLE", "ADVANCED"] as const).map((tab) => (
                    <button key={tab} type="button" onClick={() => setSidebarTab(tab)} className={`flex-1 rounded-2xl px-2 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.11em] ${sidebarTab === tab ? "bg-slate-950 text-white" : "bg-white text-slate-600"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  <EditorSection key={`${selection?.kind ?? "none"}-${selection?.id ?? "none"}-${sidebarTab}`} title={selectedPanelTitle}>
                    {sidebarTab === "CONTENT" ? renderContentTab() : sidebarTab === "STYLE" ? renderStyleTab() : renderAdvancedTab()}
                  </EditorSection>
                </div>
              </>
            )}
          </aside>
        ) : (
          <button type="button" onClick={() => setSidebarOpen(true)} className="fixed left-3 top-24 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-xl">
            <LayersIcon />
          </button>
        )}

        <section className="ui-scrollbar h-[calc(100vh-4.75rem)] overflow-y-auto bg-[var(--app-bg)]">
          <div className={`mx-auto px-4 py-6 transition-all sm:px-6 lg:px-8 lg:py-10 ${canvasViewport === "mobile" ? "max-w-[390px]" : canvasViewport === "tablet" ? "max-w-[820px]" : "max-w-6xl"}`} onClick={() => setSelection(null)}>
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

      {navigatorOpen ? (
        <div
          className="fixed z-[120] flex min-h-[260px] min-w-[280px] resize overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl"
          style={{ left: navigatorPosition.x, top: navigatorPosition.y, width: navigatorSize.width, height: navigatorSize.height }}
          onMouseUp={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setNavigatorSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
          }}
        >
          <div className="flex min-h-0 w-full flex-col">
            <div
              className="flex cursor-move items-center justify-between gap-3 border-b border-slate-100 bg-slate-950 px-4 py-3 text-white"
              onMouseDown={(event) => {
                setNavigatorDrag({
                  startX: event.clientX,
                  startY: event.clientY,
                  originX: navigatorPosition.x,
                  originY: navigatorPosition.y
                });
              }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <LayersIcon />
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-teal-200">Navigator</p>
                  <p className="truncate text-sm font-semibold">Page structure</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigator"
                title="Close navigator"
                onClick={() => setNavigatorOpen(false)}
                onMouseDown={(event) => event.stopPropagation()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <BackIcon />
              </button>
            </div>
            <div className="ui-scrollbar min-h-0 flex-1 overflow-auto p-3">
              {(workingDraft.containers ?? []).length ? (
                renderNavigatorItems(workingDraft.containers ?? [])
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                  No containers yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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
                <p className="mt-2 text-sm text-slate-500">Only the saved draft is published. Unsaved canvas edits are blocked from publishing.</p>
              </div>
              <button type="button" onClick={() => setPublishConfirmOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Saved draft</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{draftSaveLabel}</p>
              </div>
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-teal-700">Draft content</p>
                <p className="mt-2 text-sm font-semibold text-teal-950">{savedDraftSummary.containers} containers, {savedDraftSummary.widgets} widgets, {savedDraftSummary.hidden} hidden</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sky-700">Current live</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">{publishedSummary.containers} containers, {publishedSummary.widgets} widgets, {publishedSummary.hidden} hidden</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div>
                <h4 className="mb-3 text-lg font-semibold text-slate-950">Current live homepage</h4>
                <div className="rounded-[32px] border border-slate-200 bg-[var(--app-bg)] p-4">
                  {showPreviewHeader ? <PublicHomepageHeader previewViewport="desktop" interactive={false} /> : null}
                  <div className="mt-6">{homepageQuery.data?.hasPublishedContent ? <HomepageRenderer content={publishedPreview} viewport="desktop" mode="builder" /> : <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">Nothing is published yet.</div>}</div>
                  {showPreviewFooter ? <div className="mt-6"><SiteFooter interactive={false} previewViewport="desktop" /></div> : null}
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-lg font-semibold text-slate-950">Draft that will go live</h4>
                <div className="rounded-[32px] border border-slate-200 bg-[var(--app-bg)] p-4">
                  {showPreviewHeader ? <PublicHomepageHeader previewViewport="desktop" interactive={false} /> : null}
                  <div className="mt-6"><HomepageRenderer content={publishPreviewContent} viewport="desktop" mode="builder" /></div>
                  {showPreviewFooter ? <div className="mt-6"><SiteFooter interactive={false} previewViewport="desktop" /></div> : null}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPublishConfirmOpen(false)} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => publishDraftMutation.mutate()} disabled={publishDraftMutation.isPending || hasPendingDraftChanges || !hasHomepageContent(publishPreviewContent)} className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
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
              <button type="button" onClick={() => { const nextDraft = cloneContent(publishedPreview); setWorkingDraft(nextDraft); setSelection(null); setResetConfirmOpen(false); }} className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white">Reset</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
