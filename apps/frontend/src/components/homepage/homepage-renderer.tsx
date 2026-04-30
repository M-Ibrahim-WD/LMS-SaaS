"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type {
  HomepageAlign,
  HomepageBorder,
  HomepageBorderPreset,
  HomepageBoxSpacing,
  HomepageButtonVariant,
  HomepageCard,
  HomepageCardBackgroundStyle,
  HomepageColumn,
  HomepageColumnAlign,
  HomepageContainer,
  HomepageContainerAlign,
  HomepageContainerDirection,
  HomepageContainerJustify,
  HomepageElement,
  HomepageLengthValue,
  HomepageContent,
  HomepageGapPreset,
  HomepageImageFit,
  HomepageImageHeightPreset,
  HomepageImagePosition,
  HomepagePaddingPreset,
  HomepageRadiusPreset,
  HomepageResponsiveVisibility,
  HomepageRow,
  HomepageRowBackgroundStyle,
  HomepageRowOrder,
  HomepageSizePreset,
  HomepageSpacingPreset,
  HomepageTextTag,
  HomepageTypography,
  HomepageVideoAspectRatio,
  HomepageWidthPreset
} from "../../lib/homepage/types";

export type HomepageRendererViewport = "auto" | "desktop" | "tablet" | "mobile";
type HomepageRendererMode = "public" | "builder";

const colorValue = (value?: string) => (value?.trim() ? value.trim() : undefined);
const transparentValue = (value?: string) => (value === "transparent" ? "transparent" : colorValue(value));

function getTextTagClasses(viewport: HomepageRendererViewport): Record<HomepageTextTag, string> {
  const compact = viewport === "mobile" || viewport === "tablet";
  return {
    H1: compact ? "text-3xl font-semibold text-slate-950" : "text-5xl font-semibold text-slate-950",
    H2: compact ? "text-2xl font-semibold text-slate-950" : "text-4xl font-semibold text-slate-950",
    H3: compact ? "text-xl font-semibold text-slate-950" : "text-3xl font-semibold text-slate-950",
    H4: compact ? "text-lg font-semibold text-slate-950" : "text-2xl font-semibold text-slate-950",
    H5: "text-lg font-semibold text-slate-950",
    H6: "text-base font-semibold uppercase tracking-[0.18em] text-slate-700",
    P: "text-base leading-8 text-slate-600"
  };
}

function shouldDisplayOnViewport(
  hidden: boolean | undefined,
  visibility: HomepageResponsiveVisibility | undefined,
  viewport: HomepageRendererViewport
) {
  if (hidden) {
    return false;
  }
  if (viewport === "auto" || !visibility) {
    return true;
  }
  return visibility[viewport] ?? true;
}

function getResponsiveVisibilityClass(
  visibility: HomepageResponsiveVisibility | undefined,
  viewport: HomepageRendererViewport
) {
  if (!visibility || viewport !== "auto") {
    return "";
  }

  const desktop = visibility.desktop ?? true;
  const tablet = visibility.tablet ?? true;
  const mobile = visibility.mobile ?? true;
  if (desktop && tablet && mobile) return "";
  if (!desktop && !tablet && !mobile) return "hidden";
  if (desktop && !tablet && !mobile) return "hidden lg:block";
  if (!desktop && tablet && !mobile) return "hidden md:block lg:hidden";
  if (!desktop && !tablet && mobile) return "block md:hidden";
  if (desktop && tablet && !mobile) return "hidden md:block";
  if (desktop && !tablet && mobile) return "block md:hidden lg:block";
  return "block lg:hidden";
}

function getGapClasses(gapPreset: HomepageGapPreset | undefined) {
  const map: Record<HomepageGapPreset, string> = {
    tight: "gap-3",
    normal: "gap-5",
    loose: "gap-7"
  };
  return map[gapPreset ?? "normal"];
}

function getStackGapClasses(gapPreset: HomepageGapPreset | undefined) {
  const map: Record<HomepageGapPreset, string> = {
    tight: "space-y-3",
    normal: "space-y-5",
    loose: "space-y-7"
  };
  return map[gapPreset ?? "normal"];
}

function getPaddingClasses(padding: HomepagePaddingPreset | undefined) {
  const map: Record<HomepagePaddingPreset, string> = {
    compact: "p-3 sm:p-4",
    comfortable: "p-4 sm:p-5",
    spacious: "p-5 sm:p-7"
  };
  return map[padding ?? "comfortable"];
}

function boxSpacingToStyle(box: HomepageBoxSpacing | undefined, prefix: "padding" | "margin"): CSSProperties {
  if (!box) return {};
  const unit = box.unit ?? "px";
  return {
    [`${prefix}Top`]: `${box.top ?? 0}${unit}`,
    [`${prefix}Right`]: `${box.right ?? 0}${unit}`,
    [`${prefix}Bottom`]: `${box.bottom ?? 0}${unit}`,
    [`${prefix}Left`]: `${box.left ?? 0}${unit}`
  } as CSSProperties;
}

function borderToStyle(border: HomepageBorder | undefined): CSSProperties {
  if (!border?.enabled) return {};
  const unit = border.unit ?? "px";
  return {
    borderWidth: `${border.width ?? 1}px`,
    borderColor: colorValue(border.color) ?? "#cbd5e1",
    borderStyle: border.style ?? "solid",
    borderRadius: `${border.radius ?? 0}${unit}`
  };
}

function getMarginClasses(margin: HomepageSizePreset | undefined) {
  const map: Record<HomepageSizePreset, string> = {
    none: "",
    small: "my-2",
    medium: "my-4",
    large: "my-8"
  };
  return map[margin ?? "none"];
}

function getBorderClasses(border: HomepageBorderPreset | undefined) {
  const map: Record<HomepageBorderPreset, string> = {
    none: "border border-transparent",
    soft: "border border-slate-200",
    strong: "border-2 border-slate-300"
  };
  return map[border ?? "soft"];
}

function getRadiusClasses(radius: HomepageRadiusPreset | undefined) {
  const map: Record<HomepageRadiusPreset, string> = {
    soft: "rounded-[12px]",
    rounded: "rounded-[20px]",
    pill: "rounded-[32px]"
  };
  return map[radius ?? "rounded"];
}

function getRowClasses(row: HomepageRow) {
  const background: Record<HomepageRowBackgroundStyle, string> = {
    plain: "bg-transparent",
    soft: "bg-white/55 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.25)] backdrop-blur",
    highlight:
      "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_24%),radial-gradient(circle_at_88%_16%,rgba(16,185,129,0.12),transparent_18%),rgba(255,255,255,0.72)] shadow-[0_26px_60px_-40px_rgba(14,165,233,0.28)] backdrop-blur"
  };
  const minHeight: Record<HomepageSizePreset, string> = {
    none: "",
    small: "min-h-[220px]",
    medium: "min-h-[360px]",
    large: "min-h-[520px]"
  };
  const usesExplicitStyle = Boolean(row.spacing || row.background || row.border);
  const radius = usesExplicitStyle ? "" : getRadiusClasses(row.radiusPreset);
  const border = usesExplicitStyle ? "" : getBorderClasses(row.borderPreset);
  const padding = row.spacing?.padding ? "" : getPaddingClasses(row.paddingPreset);
  const margin = row.spacing?.margin ? "" : getMarginClasses(row.marginPreset);
  const backgroundClass = row.background ? "" : background[row.backgroundStyle ?? "plain"];
  return `${radius} ${border} ${backgroundClass} ${padding} ${margin} ${minHeight[row.minHeightPreset ?? "none"]}`;
}

function getCardClasses(card: HomepageCard) {
  const background: Record<HomepageCardBackgroundStyle, string> = {
    surface: "surface-card",
    muted: "bg-slate-50",
    highlight: "bg-sky-50/80"
  };
  const spacing: Record<HomepageSpacingPreset, string> = {
    compact: "p-4 sm:p-5",
    comfortable: "p-5 sm:p-6",
    spacious: "p-6 sm:p-8"
  };
  const width: Record<HomepageWidthPreset, string> = {
    auto: "",
    full: "w-full",
    narrow: "mx-auto max-w-2xl"
  };
  const usesExplicitStyle = Boolean(card.spacing || card.background || card.border);
  const backgroundClass = usesExplicitStyle ? "" : background[card.backgroundStyle ?? "surface"];
  const radius = usesExplicitStyle ? "" : getRadiusClasses(card.radiusPreset);
  const border = usesExplicitStyle ? "" : getBorderClasses(card.borderPreset);
  const padding = card.spacing?.padding ? "" : spacing[card.spacingPreset ?? "comfortable"];
  const margin = card.spacing?.margin ? "" : getMarginClasses(card.marginPreset);
  return `${backgroundClass} ${radius} ${border} ${padding} ${margin} ${width[card.widthPreset ?? "auto"]}`;
}

function getCardStyle(card: HomepageCard): CSSProperties {
  return {
    backgroundColor: transparentValue(card.background?.color ?? card.backgroundColor),
    color: colorValue(card.textColor),
    ...boxSpacingToStyle(card.spacing?.padding, "padding"),
    ...boxSpacingToStyle(card.spacing?.margin, "margin"),
    ...borderToStyle(card.border)
  };
}

function getRowStyle(row: HomepageRow): CSSProperties {
  return {
    backgroundColor: transparentValue(row.background?.color ?? row.backgroundColor),
    backgroundImage: row.backgroundImage ? `url(${row.backgroundImage})` : undefined,
    backgroundSize: row.backgroundImage ? "cover" : undefined,
    backgroundPosition: row.backgroundImage ? "center" : undefined,
    ...boxSpacingToStyle(row.spacing?.padding, "padding"),
    ...boxSpacingToStyle(row.spacing?.margin, "margin"),
    ...borderToStyle(row.border)
  };
}

function getColumnStyle(column: HomepageColumn): CSSProperties {
  return {
    backgroundColor: transparentValue(column.background?.color ?? column.backgroundColor),
    ...boxSpacingToStyle(column.spacing?.padding, "padding"),
    ...boxSpacingToStyle(column.spacing?.margin, "margin"),
    ...borderToStyle(column.border)
  };
}

function getColumnAlignClasses(column: HomepageColumn) {
  const vertical: Record<HomepageColumnAlign, string> = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end"
  };
  const horizontal: Record<HomepageColumnAlign, string> = {
    start: "items-stretch",
    center: "items-center",
    end: "items-end"
  };
  return `${vertical[column.verticalAlign ?? "start"]} ${horizontal[column.horizontalAlign ?? "start"]}`;
}

function lengthToCss(length: HomepageLengthValue | undefined) {
  if (typeof length?.value !== "number") return undefined;
  return `${length.value}${length.unit ?? "px"}`;
}

function typographyToStyle(typography: HomepageTypography | undefined, textColor?: string): CSSProperties {
  return {
    color: colorValue(textColor),
    fontSize: lengthToCss(typography?.fontSize),
    lineHeight: typeof typography?.lineHeight === "number" ? typography.lineHeight : undefined,
    fontWeight: typography?.fontWeight,
    letterSpacing: typeof typography?.letterSpacing === "number" ? `${typography.letterSpacing}px` : undefined,
    textTransform: typography?.textTransform && typography.textTransform !== "none" ? typography.textTransform : undefined
  };
}

function getResponsiveContainerValue<T>(
  container: HomepageContainer,
  viewport: HomepageRendererViewport,
  field: "direction" | "width" | "maxWidth" | "minHeight" | "height",
  fallback: T | undefined
) {
  if (viewport === "desktop" || viewport === "tablet" || viewport === "mobile") {
    const deviceValue = container.responsive?.[viewport]?.[field] as T | undefined;
    return deviceValue ?? fallback;
  }
  return fallback;
}

export function getContainerStyle(container: HomepageContainer, viewport: HomepageRendererViewport): CSSProperties {
  const direction = getResponsiveContainerValue<HomepageContainerDirection>(container, viewport, "direction", container.direction ?? "column");
  const width = getResponsiveContainerValue<HomepageLengthValue>(container, viewport, "width", container.width);
  const maxWidth = getResponsiveContainerValue<HomepageLengthValue>(container, viewport, "maxWidth", container.maxWidth);
  const minHeight = getResponsiveContainerValue<HomepageLengthValue>(container, viewport, "minHeight", container.minHeight);
  const height = getResponsiveContainerValue<HomepageLengthValue>(container, viewport, "height", container.height);
  const justifyMap: Record<HomepageContainerJustify, CSSProperties["justifyContent"]> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between"
  };
  const alignMap: Record<HomepageContainerAlign, CSSProperties["alignItems"]> = {
    stretch: "stretch",
    start: "flex-start",
    center: "center",
    end: "flex-end"
  };

  return {
    display: "flex",
    flexDirection: direction,
    flexWrap: container.wrap ?? "nowrap",
    justifyContent: justifyMap[container.justify ?? "start"],
    alignItems: alignMap[container.align ?? "stretch"],
    gap: `${container.gap ?? 10}px`,
    width: lengthToCss(width),
    maxWidth: lengthToCss(maxWidth),
    minHeight: lengthToCss(minHeight),
    height: lengthToCss(height),
    backgroundColor: transparentValue(container.background?.color),
    backgroundImage: container.backgroundImage ? `url(${container.backgroundImage})` : undefined,
    backgroundSize: container.backgroundImage ? "cover" : undefined,
    backgroundPosition: container.backgroundImage ? "center" : undefined,
    ...boxSpacingToStyle(container.spacing?.padding, "padding"),
    ...boxSpacingToStyle(container.spacing?.margin, "margin"),
    ...borderToStyle(container.border)
  };
}

function rowToContainer(row: HomepageRow): HomepageContainer {
  const columns = normalizeRowColumns(row);
  return {
    id: row.id,
    type: "CONTAINER",
    builderLabel: row.builderLabel,
    hidden: row.hidden,
    visibility: row.visibility,
    direction: row.columns === 2 ? "row" : "column",
    wrap: "wrap",
    gap: row.gapPreset === "tight" ? 12 : row.gapPreset === "loose" ? 28 : 20,
    spacing: row.spacing,
    background: row.background ?? { color: row.backgroundColor ?? "transparent" },
    backgroundImage: row.backgroundImage,
    border: row.border,
    children: columns.map((column) => ({
      id: column.id,
      type: "CONTAINER" as const,
      builderLabel: column.builderLabel,
      hidden: column.hidden,
      visibility: column.visibility,
      direction: "column",
      gap: column.gapPreset === "tight" ? 12 : column.gapPreset === "loose" ? 28 : 20,
      spacing: column.spacing,
      background: column.background ?? { color: column.backgroundColor ?? "transparent" },
      border: column.border,
      width: row.columns === 2 ? { value: 50, unit: "%" } : { value: 100, unit: "%" },
      children: column.widgets
    }))
  };
}

function getRenderableContainers(content: HomepageContent) {
  if (content.containers?.length) return content.containers;
  return content.rows.map(rowToContainer);
}

function getImageHeightClasses(imageHeightPreset: HomepageImageHeightPreset | undefined, viewport: HomepageRendererViewport) {
  const compact = viewport === "mobile" || viewport === "tablet";
  const map: Record<HomepageImageHeightPreset, string> = {
    compact: compact ? "min-h-[180px]" : "min-h-[220px]",
    medium: compact ? "min-h-[220px]" : "min-h-[280px]",
    tall: compact ? "min-h-[280px]" : "min-h-[420px]"
  };
  return map[imageHeightPreset ?? "medium"];
}

function getSizeHeight(size: HomepageSizePreset | undefined) {
  const map: Record<HomepageSizePreset, string> = {
    none: "h-0",
    small: "h-6",
    medium: "h-12",
    large: "h-24"
  };
  return map[size ?? "medium"];
}

function getVideoRatioClass(aspectRatio: HomepageVideoAspectRatio | undefined) {
  if (aspectRatio === "4:3") return "aspect-[4/3]";
  if (aspectRatio === "1:1") return "aspect-square";
  return "aspect-video";
}

function getVideoEmbedUrl(videoUrl: string) {
  if (videoUrl.includes("youtube.com/watch?v=")) {
    return `https://www.youtube.com/embed/${videoUrl.split("v=")[1]?.split("&")[0] ?? ""}`;
  }
  if (videoUrl.includes("youtu.be/")) {
    return `https://www.youtube.com/embed/${videoUrl.split("youtu.be/")[1]?.split("?")[0] ?? ""}`;
  }
  if (videoUrl.includes("vimeo.com/")) {
    const id = videoUrl.split("vimeo.com/")[1]?.split("?")[0]?.split("/").filter(Boolean).at(-1);
    return id ? `https://player.vimeo.com/video/${id}` : videoUrl;
  }
  return videoUrl;
}

function getButtonClasses(variant: HomepageButtonVariant | undefined) {
  if (variant === "secondary") return "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  if (variant === "ghost") return "border border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200";
  return "bg-slate-950 text-white hover:bg-slate-800";
}

function getButtonStyle(card: HomepageCard): CSSProperties {
  return {
    backgroundColor: colorValue(card.buttonStyle?.backgroundColor),
    color: colorValue(card.buttonStyle?.textColor),
    "--homepage-button-hover-bg": colorValue(card.buttonStyle?.hoverBackgroundColor) ?? colorValue(card.buttonStyle?.backgroundColor),
    "--homepage-button-hover-text": colorValue(card.buttonStyle?.hoverTextColor) ?? colorValue(card.buttonStyle?.textColor),
    ...boxSpacingToStyle(card.buttonStyle?.padding, "padding"),
    ...borderToStyle(card.buttonStyle?.border)
  } as CSSProperties;
}

function ButtonLikeLink({
  href,
  className,
  style,
  mode,
  children
}: {
  href: string;
  className: string;
  style?: CSSProperties;
  mode: HomepageRendererMode;
  children: ReactNode;
}) {
  if (mode === "builder") {
    return (
      <span aria-disabled="true" className={`${className} pointer-events-none select-none`} style={style}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}

function normalizeRowColumns(row: HomepageRow): HomepageColumn[] {
  if (row.columnsData?.length) {
    return row.columnsData.map((column, index) => ({
      ...column,
      id: column.id || `${row.id}-column-${index + 1}`,
      widgets: column.widgets ?? []
    }));
  }

  const slotSource = row.slots ?? Array.from({ length: row.columns }, () => null);
  return Array.from({ length: row.columns }, (_, index) => ({
    id: `${row.id}-column-${index + 1}`,
    widgets: slotSource[index] ? [slotSource[index] as HomepageCard] : []
  }));
}

function getOrderedColumns(row: HomepageRow, viewport: HomepageRendererViewport) {
  const mobileOrder = row.mobileOrder ?? "FIRST_SLOT_FIRST";
  const tabletOrder = row.tabletOrder ?? mobileOrder;
  const columns = normalizeRowColumns(row).map((column, index) => ({ column, slotIndex: index }));

  if (viewport === "mobile" && mobileOrder === "SECOND_SLOT_FIRST" && columns.length === 2) return [...columns].reverse();
  if (viewport === "tablet" && tabletOrder === "SECOND_SLOT_FIRST" && columns.length === 2) return [...columns].reverse();
  return columns;
}

function TextTagView({ tag, className, style, children }: { tag: HomepageTextTag; className: string; style?: CSSProperties; children: string }) {
  switch (tag) {
    case "H1":
      return <h1 className={className} style={style}>{children}</h1>;
    case "H2":
      return <h2 className={className} style={style}>{children}</h2>;
    case "H3":
      return <h3 className={className} style={style}>{children}</h3>;
    case "H4":
      return <h4 className={className} style={style}>{children}</h4>;
    case "H5":
      return <h5 className={className} style={style}>{children}</h5>;
    case "H6":
      return <h6 className={className} style={style}>{children}</h6>;
    case "P":
      return <p className={className} style={style}>{children}</p>;
  }
}

function AlignWrap({ align, children }: { align?: HomepageAlign; children: ReactNode }) {
  return <div className={align === "center" ? "text-center" : "text-left"}>{children}</div>;
}

function renderBulletLines(card: HomepageCard) {
  if (!("bullets" in card) || !card.bullets?.length) return null;
  return (
    <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
      {card.bullets.map((bullet, index) => (
        <li key={`${card.id}-bullet-${index}`} className="flex gap-3">
          <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

export function HomepageCardView({ card, viewport, mode }: { card: HomepageCard; viewport: HomepageRendererViewport; mode: HomepageRendererMode }) {
  const textTagClasses = getTextTagClasses(viewport);
  const cardClasses = getCardClasses(card);
  const cardStyle = getCardStyle(card);
  const textStyle = typographyToStyle(card.typography, card.textColor);

  if (card.type === "SPACER") {
    return <div className={getSizeHeight(card.heightPreset)} style={cardStyle} />;
  }

  if (card.type === "DIVIDER") {
    return (
      <div className={`${getMarginClasses(card.marginPreset)} px-2`} style={cardStyle}>
        <div
          className={`border-t ${card.dividerStyle === "dashed" ? "border-dashed" : "border-solid"}`}
          style={{
            borderColor: colorValue(card.dividerColor) ?? "#cbd5e1",
            borderTopWidth: `${card.dividerWidth ?? 1}px`
          }}
        />
      </div>
    );
  }

  if (card.type === "HEADING") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <TextTagView tag={card.textTag} className={`${textTagClasses[card.textTag]} ${card.textAlign === "center" ? "text-center" : "text-left"}`} style={textStyle}>
          {card.content}
        </TextTagView>
      </article>
    );
  }

  if (card.type === "TEXT") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <AlignWrap align={card.textAlign}>
          <p className="text-base leading-8" style={textStyle}>{card.content}</p>
        </AlignWrap>
      </article>
    );
  }

  if (card.type === "BUTTON") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <AlignWrap align={card.textAlign}>
          <ButtonLikeLink href={card.href || "#"} mode={mode} style={getButtonStyle(card)} className={`inline-flex min-h-[3rem] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition hover:bg-[var(--homepage-button-hover-bg)] hover:text-[var(--homepage-button-hover-text)] ${getButtonClasses(card.variant)}`}>
            {card.label}
          </ButtonLikeLink>
        </AlignWrap>
      </article>
    );
  }

  if (card.type === "IMAGE_BLOCK") {
    const fit: HomepageImageFit = card.imageFit ?? "cover";
    const position: HomepageImagePosition = card.imagePosition ?? "center";
    const fitClass = fit === "contain" ? "object-contain" : "object-cover";
    const positionClass = position === "top" ? "object-top" : position === "bottom" ? "object-bottom" : "object-center";
    return (
      <article className={cardClasses} style={cardStyle}>
        <div className={`overflow-hidden rounded-[16px] bg-slate-100 ${getImageHeightClasses(card.imageHeightPreset, viewport)}`}>
          <img src={card.imageUrl} alt={card.altText || "Homepage image"} className={`h-full w-full ${fitClass} ${positionClass}`} />
        </div>
        {card.caption ? <p className="mt-4 text-sm leading-6 text-slate-600">{card.caption}</p> : null}
      </article>
    );
  }

  if (card.type === "VIDEO") {
    const embedUrl = getVideoEmbedUrl(card.videoUrl);

    return (
      <article className={cardClasses} style={cardStyle}>
        <div className={`overflow-hidden rounded-[16px] bg-slate-950 ${getVideoRatioClass(card.aspectRatio)}`}>
          <iframe src={embedUrl} title={card.title || "Homepage video"} className={`h-full w-full ${mode === "builder" ? "pointer-events-none" : ""}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        {card.caption ? <p className="mt-4 text-sm leading-6 text-slate-600">{card.caption}</p> : null}
      </article>
    );
  }

  if (card.type === "ICON") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <AlignWrap align={card.textAlign}>
          <div className={card.textAlign === "center" ? "flex flex-col items-center" : "flex flex-col items-start"}>
            <span
              className="leading-none"
              style={{ fontSize: lengthToCss(card.iconSize) ?? "2.25rem", color: colorValue(card.iconColor) ?? colorValue(card.textColor) }}
            >
              {card.iconSymbol}
            </span>
            <p className="mt-4 text-base leading-7" style={textStyle}>{card.content}</p>
          </div>
        </AlignWrap>
      </article>
    );
  }

  if (card.type === "LIST") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-xl font-semibold text-slate-950" style={textStyle}>{card.title}</h3> : null}
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600" style={textStyle}>
          {card.items.map((item, index) => (
            <li key={`${card.id}-list-${index}`} className="flex gap-3">
              <span className="mt-2 h-2 w-2 rounded-full bg-sky-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  }

  if (card.type === "CARD") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.subtitle ? <p className="section-kicker">{card.subtitle}</p> : null}
        {card.title ? <h3 className="mt-3 text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h3> : null}
        {card.body ? <p className="mt-4 text-base leading-8 text-slate-600" style={textStyle}>{card.body}</p> : null}
        {card.buttonLabel ? (
          <ButtonLikeLink href={card.buttonHref || "#"} mode={mode} style={getButtonStyle(card)} className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--homepage-button-hover-bg)] hover:text-[var(--homepage-button-hover-text)]">
            {card.buttonLabel}
          </ButtonLikeLink>
        ) : null}
      </article>
    );
  }

  if (card.type === "TESTIMONIAL") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <div className="text-5xl leading-none text-sky-500">&ldquo;</div>
        <blockquote className="mt-2 text-xl font-semibold leading-9 text-slate-950" style={textStyle}>
          {card.quote}
        </blockquote>
        <div className="mt-6 flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-slate-100">
            {card.avatarUrl ? <img src={card.avatarUrl} alt={card.authorName} className="h-full w-full object-cover" /> : null}
          </div>
          <div>
            <p className="font-semibold text-slate-950">{card.authorName}</p>
            {card.authorRole ? <p className="text-sm text-slate-500">{card.authorRole}</p> : null}
          </div>
        </div>
      </article>
    );
  }

  if (card.type === "STATS") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h3> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {card.stats.map((item) => (
            <div key={item.id} className="rounded-[18px] border border-slate-200 bg-white/80 p-4">
              <p className="text-3xl font-semibold text-sky-600">{item.value}</p>
              <p className="mt-2 font-semibold text-slate-950">{item.label}</p>
              {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (card.type === "FAQ") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h3> : null}
        <div className="mt-5 space-y-3">
          {card.faqs.map((item) => (
            <details key={item.id} className="group rounded-[18px] border border-slate-200 bg-white/80 p-4">
              <summary className="cursor-pointer list-none font-semibold text-slate-950">
                <span>{item.question}</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </article>
    );
  }

  if (card.type === "COURSE_LIST") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h3> : null}
        {card.body ? <p className="mt-3 text-base leading-8 text-slate-600" style={textStyle}>{card.body}</p> : null}
        <div className="mt-5 grid gap-3">
          {card.items.map((course) => (
            <ButtonLikeLink key={course.id} href={`/courses/${course.id}`} mode={mode} className="block rounded-[14px] border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
              <div className="flex gap-4">
                {course.thumbnailImage ? <img src={course.thumbnailImage} alt={course.title} className="h-16 w-20 shrink-0 rounded-xl object-cover" /> : null}
                <div className="min-w-0">
                  <p className="font-semibold text-slate-950">{course.title}</p>
                  {course.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {course.category ? <span>{course.category}</span> : null}
                    {course.level ? <span>{course.level}</span> : null}
                    <span>{course.isPaid ? "Paid" : "Free"}</span>
                  </div>
                </div>
              </div>
            </ButtonLikeLink>
          ))}
        </div>
      </article>
    );
  }

  if (card.type === "INSTRUCTOR_LIST" || card.type === "FEATURED_INSTRUCTORS") {
    const instructors = card.instructors;
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.subtitle ? <p className="section-kicker">{card.subtitle}</p> : null}
        {card.title ? <h2 className="mt-3 text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h2> : null}
        {card.body ? <p className="mt-4 text-base leading-8 text-slate-600" style={textStyle}>{card.body}</p> : null}
        {instructors.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {instructors.map((instructor) => (
              <ButtonLikeLink key={instructor.id} href={`/instructors/${instructor.id}`} mode={mode} className="block rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200 hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100">
                    {instructor.profileImage ? <img src={instructor.profileImage} alt={instructor.fullName} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{instructor.fullName}</h3>
                    {instructor.bio ? <p className="mt-1 text-sm leading-6 text-slate-600">{instructor.bio}</p> : null}
                  </div>
                </div>
                {instructor.courses.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {instructor.courses.slice(0, 4).map((course) => (
                      <span key={course.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{course.title}</span>
                    ))}
                  </div>
                ) : null}
              </ButtonLikeLink>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">No instructors selected yet.</p>
        )}
      </article>
    );
  }

  return (
    <article className={cardClasses} style={cardStyle}>
      {card.subtitle ? <p className="section-kicker">{card.subtitle}</p> : null}
      {card.title ? <h2 className="mt-3 text-2xl font-semibold text-slate-950" style={textStyle}>{card.title}</h2> : null}
      {card.body ? <p className="mt-4 text-base leading-8 text-slate-600" style={textStyle}>{card.body}</p> : null}
      {renderBulletLines(card)}
    </article>
  );
}

function HomepageElementView({
  element,
  viewport,
  mode
}: {
  element: HomepageElement;
  viewport: HomepageRendererViewport;
  mode: HomepageRendererMode;
}) {
  if ("type" in element && element.type === "CONTAINER") {
    if (!shouldDisplayOnViewport(element.hidden, element.visibility, viewport)) return null;
    return (
      <section className={getResponsiveVisibilityClass(element.visibility, viewport)} style={getContainerStyle(element, viewport)}>
        {element.children.map((child) => (
          <HomepageElementView key={child.id} element={child} viewport={viewport} mode={mode} />
        ))}
      </section>
    );
  }

  if (!shouldDisplayOnViewport(element.hidden, element.visibility, viewport)) return null;
  return (
    <div className={`${getResponsiveVisibilityClass(element.visibility, viewport)} ${mode === "builder" ? "pointer-events-none select-none" : ""}`}>
      <HomepageCardView card={element} viewport={viewport} mode={mode} />
    </div>
  );
}

export function HomepageRenderer({
  content,
  viewport = "auto",
  mode = "public"
}: {
  content: HomepageContent;
  viewport?: HomepageRendererViewport;
  mode?: HomepageRendererMode;
}) {
  const containers = getRenderableContainers(content);
  if (containers.length) {
    return (
      <div className="space-y-6">
        {containers.map((container) => (
          <HomepageElementView key={container.id} element={container} viewport={viewport} mode={mode} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content.rows.map((row) => {
        if (!shouldDisplayOnViewport(row.hidden, row.visibility, viewport)) return null;

        const orderedColumns = getOrderedColumns(row, viewport);
        const rowVisibilityClass = getResponsiveVisibilityClass(row.visibility, viewport);
        const desktopGrid = row.columns === 2 && viewport === "desktop";

        return (
          <section key={row.id} className={rowVisibilityClass}>
            <div className={getRowClasses(row)} style={getRowStyle(row)}>
              <div className={`grid ${getGapClasses(row.gapPreset)} ${desktopGrid ? "grid-cols-2" : "grid-cols-1"}`}>
                {orderedColumns
                  .filter(({ column }) => shouldDisplayOnViewport(column.hidden, column.visibility, viewport))
                  .map(({ column }) => (
                    <div
                      key={column.id}
                      className={`flex min-w-0 flex-col ${getStackGapClasses(column.gapPreset)} ${column.spacing?.padding ? "" : getPaddingClasses(column.paddingPreset)} ${getColumnAlignClasses(column)}`}
                      style={getColumnStyle(column)}
                    >
                      {column.widgets
                        .filter((widget) => shouldDisplayOnViewport(widget.hidden, widget.visibility, viewport))
                        .map((widget) => (
                          <div key={widget.id} className={`${getResponsiveVisibilityClass(widget.visibility, viewport)} ${mode === "builder" ? "pointer-events-none select-none" : ""}`}>
                            <HomepageCardView card={widget} viewport={viewport} mode={mode} />
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
