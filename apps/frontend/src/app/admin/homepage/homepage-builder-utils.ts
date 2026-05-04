import type {
  HomepageBorder,
  HomepageBoxSpacing,
  HomepageButtonStyle,
  HomepageCard,
  HomepageCardType,
  HomepageColumn,
  HomepageContainer,
  HomepageContent,
  HomepageElement,
  HomepageLengthValue,
  HomepageResponsiveVisibility,
  HomepageRow
} from "../../../lib/homepage/types";

type HomepageContentSummary = { containers: number; widgets: number; hidden: number };

export function isContainer(element: HomepageElement): element is HomepageContainer {
  return element.type === "CONTAINER";
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createBox(value: number): HomepageBoxSpacing {
  return { top: value, right: value, bottom: value, left: value, unit: "px", linked: true };
}

export function createNoBorder(): HomepageBorder {
  return { enabled: false, width: 0, color: "#0f172a", style: "solid", radius: 0, unit: "px" };
}

export function createVisibility(): HomepageResponsiveVisibility {
  return { desktop: true, tablet: true, mobile: true };
}

function summarizeElements(elements: HomepageElement[]): HomepageContentSummary {
  return elements.reduce(
    (summary: HomepageContentSummary, element): HomepageContentSummary => {
      const hidden = element.hidden ? 1 : 0;
      if (isContainer(element)) {
        const childSummary = summarizeElements(element.children);
        return {
          containers: summary.containers + 1 + childSummary.containers,
          widgets: summary.widgets + childSummary.widgets,
          hidden: summary.hidden + hidden + childSummary.hidden
        };
      }
      return {
        containers: summary.containers,
        widgets: summary.widgets + 1,
        hidden: summary.hidden + hidden
      };
    },
    { containers: 0, widgets: 0, hidden: 0 }
  );
}

export function summarizeContent(content: HomepageContent) {
  const containerSummary = summarizeElements(content.containers ?? []);
  const legacyWidgetCount = content.rows.reduce(
    (count, row) =>
      count +
      (row.columnsData?.reduce(
        (columnCount, column) => columnCount + column.widgets.length,
        0
      ) ??
        row.slots?.filter(Boolean).length ??
        0),
    0
  );
  return {
    containers: containerSummary.containers || content.rows.length,
    widgets: containerSummary.widgets || legacyWidgetCount,
    hidden: containerSummary.hidden
  };
}

export function hasHomepageContent(content: HomepageContent) {
  const summary = summarizeContent(content);
  return summary.containers > 0 || summary.widgets > 0;
}

export function formatBuilderTimestamp(value?: string | null) {
  if (!value) return "Not saved yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved draft";
  return date.toLocaleString();
}

export function createButtonStyle(): HomepageButtonStyle {
  return {
    backgroundColor: "#020617",
    textColor: "#ffffff",
    hoverBackgroundColor: "#0f172a",
    hoverTextColor: "#ffffff",
    border: createNoBorder()
  };
}

export function createContainer(
  children: HomepageElement[] = [],
  overrides: Partial<Omit<HomepageContainer, "id" | "type" | "children">> = {}
): HomepageContainer {
  return {
    id: createId("container"),
    type: "CONTAINER",
    builderLabel: "Container",
    direction: overrides.direction ?? "column",
    wrap: overrides.wrap ?? "wrap",
    justify: overrides.justify ?? "start",
    align: overrides.align ?? "stretch",
    gap: overrides.gap ?? 10,
    rowGap: overrides.rowGap,
    columnGap: overrides.columnGap,
    visibility: overrides.visibility ?? createVisibility(),
    spacing: overrides.spacing ?? { padding: createBox(10), margin: createBox(10) },
    background: overrides.background ?? { color: "transparent" },
    backgroundImage: overrides.backgroundImage,
    border: overrides.border ?? createNoBorder(),
    width: overrides.width ?? { value: 100, unit: "%" },
    maxWidth: overrides.maxWidth,
    minHeight: overrides.minHeight,
    height: overrides.height,
    responsive: overrides.responsive,
    hidden: overrides.hidden,
    children
  };
}

export function getEvenContainerWidth(count: number): HomepageLengthValue {
  return { value: Math.round((100 / count) * 100) / 100, unit: "%" };
}

export function createWidget(type: HomepageCardType): HomepageCard {
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
  if (type === "TESTIMONIAL") {
    return {
      ...base,
      type,
      title: "Testimonial",
      quote: "This learning experience made everything clearer and easier to follow.",
      authorName: "Student name",
      authorRole: "Course student",
      avatarUrl: ""
    };
  }
  if (type === "STATS") {
    return {
      ...base,
      type,
      title: "Stats",
      stats: [
        { id: createId("stat"), value: "120+", label: "Students", description: "Active learners" },
        { id: createId("stat"), value: "24", label: "Courses", description: "Published programs" },
        { id: createId("stat"), value: "98%", label: "Satisfaction", description: "Positive feedback" }
      ]
    };
  }
  if (type === "FAQ") {
    return {
      ...base,
      type,
      title: "FAQ",
      faqs: [
        { id: createId("faq"), question: "How do I start?", answer: "Create an account, choose a course, and begin learning at your own pace." },
        { id: createId("faq"), question: "Can instructors publish courses?", answer: "Yes. Instructors can build and manage their own courses from the platform." }
      ]
    };
  }
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

export function normalizeContent(content: HomepageContent): HomepageContent {
  const containers = content.containers?.length ? content.containers : rowsToContainers(content.rows ?? []);
  return { ...content, rows: content.rows ?? [], containers };
}

export function cloneContent(content: HomepageContent): HomepageContent {
  return normalizeContent(JSON.parse(JSON.stringify(content)) as HomepageContent);
}

export function cloneElement<T extends HomepageElement>(element: T): T {
  const cloned = JSON.parse(JSON.stringify(element)) as T;
  const replaceIds = (entry: HomepageElement): HomepageElement => {
    if (isContainer(entry)) {
      return { ...entry, id: createId("container"), children: entry.children.map(replaceIds) };
    }
    return { ...entry, id: createId("widget") };
  };
  return replaceIds(cloned) as T;
}

export function updateElementList(elements: HomepageElement[], id: string, updater: (element: HomepageElement) => HomepageElement): HomepageElement[] {
  return elements.map((element) => {
    if (element.id === id) return updater(element);
    if (isContainer(element)) return { ...element, children: updateElementList(element.children, id, updater) };
    return element;
  });
}

export function removeElementList(elements: HomepageElement[], id: string): HomepageElement[] {
  return elements
    .filter((element) => element.id !== id)
    .map((element) => (isContainer(element) ? { ...element, children: removeElementList(element.children, id) } : element));
}

export function addElementToContainer(elements: HomepageElement[], containerId: string | null, child: HomepageElement): HomepageElement[] {
  if (!containerId) return [...elements, child];
  return elements.map((element) => {
    if (isContainer(element) && element.id === containerId) return { ...element, children: [...element.children, child] };
    if (isContainer(element)) return { ...element, children: addElementToContainer(element.children, containerId, child) };
    return element;
  });
}

export function addElementsToContainer(elements: HomepageElement[], containerId: string, children: HomepageElement[]): HomepageElement[] {
  return elements.map((element) => {
    if (isContainer(element) && element.id === containerId) return { ...element, children: [...element.children, ...children] };
    if (isContainer(element)) return { ...element, children: addElementsToContainer(element.children, containerId, children) };
    return element;
  });
}

export function insertElementNearSibling(
  elements: HomepageElement[],
  siblingId: string,
  position: "before" | "after",
  child: HomepageElement
): HomepageElement[] {
  const index = elements.findIndex((element) => element.id === siblingId);
  if (index >= 0) {
    const next = [...elements];
    next.splice(position === "before" ? index : index + 1, 0, child);
    return next;
  }

  return elements.map((element) => (
    isContainer(element)
      ? { ...element, children: insertElementNearSibling(element.children, siblingId, position, child) }
      : element
  ));
}

export function moveElementList(elements: HomepageElement[], id: string, direction: -1 | 1): HomepageElement[] {
  const index = elements.findIndex((element) => element.id === id);
  if (index >= 0) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= elements.length) return elements;
    const next = [...elements];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
  }

  return elements.map((element) => (
    isContainer(element)
      ? { ...element, children: moveElementList(element.children, id, direction) }
      : element
  ));
}

export function findElement(elements: HomepageElement[], id: string | undefined): HomepageElement | null {
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

export function getParentContainerId(elements: HomepageElement[], id: string): string | null {
  for (const element of elements) {
    if (isContainer(element)) {
      if (element.children.some((child) => child.id === id)) return element.id;
      const found = getParentContainerId(element.children, id);
      if (found) return found;
    }
  }
  return null;
}
