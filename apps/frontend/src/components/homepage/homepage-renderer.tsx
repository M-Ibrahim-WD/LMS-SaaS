"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type {
  HomepageAlign,
  HomepageBorderPreset,
  HomepageButtonVariant,
  HomepageCard,
  HomepageCardBackgroundStyle,
  HomepageColumn,
  HomepageColumnAlign,
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
  HomepageVideoAspectRatio,
  HomepageWidthPreset
} from "../../lib/homepage/types";

export type HomepageRendererViewport = "auto" | "desktop" | "tablet" | "mobile";

const colorValue = (value?: string) => (value?.trim() ? value.trim() : undefined);

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
  return `${getRadiusClasses(row.radiusPreset)} ${getBorderClasses(row.borderPreset)} ${background[row.backgroundStyle ?? "plain"]} ${getPaddingClasses(row.paddingPreset)} ${getMarginClasses(row.marginPreset)} ${minHeight[row.minHeightPreset ?? "none"]}`;
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
  return `${background[card.backgroundStyle ?? "surface"]} ${getRadiusClasses(card.radiusPreset)} ${getBorderClasses(card.borderPreset)} ${spacing[card.spacingPreset ?? "comfortable"]} ${getMarginClasses(card.marginPreset)} ${width[card.widthPreset ?? "auto"]}`;
}

function getCardStyle(card: HomepageCard): CSSProperties {
  return {
    backgroundColor: colorValue(card.backgroundColor),
    color: colorValue(card.textColor)
  };
}

function getRowStyle(row: HomepageRow): CSSProperties {
  return {
    backgroundColor: colorValue(row.backgroundColor),
    backgroundImage: row.backgroundImage ? `url(${row.backgroundImage})` : undefined,
    backgroundSize: row.backgroundImage ? "cover" : undefined,
    backgroundPosition: row.backgroundImage ? "center" : undefined
  };
}

function getColumnStyle(column: HomepageColumn): CSSProperties {
  return {
    backgroundColor: colorValue(column.backgroundColor)
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

function getButtonClasses(variant: HomepageButtonVariant | undefined) {
  if (variant === "secondary") return "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  if (variant === "ghost") return "border border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200";
  return "bg-slate-950 text-white hover:bg-slate-800";
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

function TextTagView({ tag, className, children }: { tag: HomepageTextTag; className: string; children: string }) {
  switch (tag) {
    case "H1":
      return <h1 className={className}>{children}</h1>;
    case "H2":
      return <h2 className={className}>{children}</h2>;
    case "H3":
      return <h3 className={className}>{children}</h3>;
    case "H4":
      return <h4 className={className}>{children}</h4>;
    case "H5":
      return <h5 className={className}>{children}</h5>;
    case "H6":
      return <h6 className={className}>{children}</h6>;
    case "P":
      return <p className={className}>{children}</p>;
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

function HomepageCardView({ card, viewport }: { card: HomepageCard; viewport: HomepageRendererViewport }) {
  const textTagClasses = getTextTagClasses(viewport);
  const cardClasses = getCardClasses(card);
  const cardStyle = getCardStyle(card);

  if (card.type === "SPACER") {
    return <div className={getSizeHeight(card.heightPreset)} style={cardStyle} />;
  }

  if (card.type === "DIVIDER") {
    return (
      <div className={`${getMarginClasses(card.marginPreset)} px-2`} style={cardStyle}>
        <div className={`border-t ${card.dividerStyle === "dashed" ? "border-dashed" : "border-solid"} border-slate-300`} />
      </div>
    );
  }

  if (card.type === "HEADING") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <TextTagView tag={card.textTag} className={`${textTagClasses[card.textTag]} ${card.textAlign === "center" ? "text-center" : "text-left"}`}>
          {card.content}
        </TextTagView>
      </article>
    );
  }

  if (card.type === "TEXT") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <AlignWrap align={card.textAlign}>
          <p className="text-base leading-8">{card.content}</p>
        </AlignWrap>
      </article>
    );
  }

  if (card.type === "BUTTON") {
    return (
      <article className={cardClasses} style={cardStyle}>
        <AlignWrap align={card.textAlign}>
          <Link href={card.href || "#"} className={`inline-flex min-h-[3rem] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${getButtonClasses(card.variant)}`}>
            {card.label}
          </Link>
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
    const embedUrl = card.videoUrl.includes("youtube.com/watch?v=")
      ? `https://www.youtube.com/embed/${card.videoUrl.split("v=")[1]?.split("&")[0] ?? ""}`
      : card.videoUrl.includes("youtu.be/")
        ? `https://www.youtube.com/embed/${card.videoUrl.split("youtu.be/")[1]?.split("?")[0] ?? ""}`
        : card.videoUrl;

    return (
      <article className={cardClasses} style={cardStyle}>
        <div className={`overflow-hidden rounded-[16px] bg-slate-950 ${getVideoRatioClass(card.aspectRatio)}`}>
          <iframe src={embedUrl} title={card.title || "Homepage video"} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
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
            <span className="text-4xl leading-none">{card.iconSymbol}</span>
            <p className="mt-4 text-base leading-7">{card.content}</p>
          </div>
        </AlignWrap>
      </article>
    );
  }

  if (card.type === "LIST") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-xl font-semibold text-slate-950">{card.title}</h3> : null}
        <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
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
        {card.title ? <h3 className="mt-3 text-2xl font-semibold text-slate-950">{card.title}</h3> : null}
        {card.body ? <p className="mt-4 text-base leading-8 text-slate-600">{card.body}</p> : null}
        {card.buttonLabel ? (
          <Link href={card.buttonHref || "#"} className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">
            {card.buttonLabel}
          </Link>
        ) : null}
      </article>
    );
  }

  if (card.type === "COURSE_LIST") {
    return (
      <article className={cardClasses} style={cardStyle}>
        {card.title ? <h3 className="text-2xl font-semibold text-slate-950">{card.title}</h3> : null}
        <div className="mt-5 grid gap-3">
          {card.items.map((course) => (
            <div key={course.id} className="rounded-[14px] border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-950">{course.title}</p>
              {course.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p> : null}
            </div>
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
        {card.title ? <h2 className="mt-3 text-2xl font-semibold text-slate-950">{card.title}</h2> : null}
        {card.body ? <p className="mt-4 text-base leading-8 text-slate-600">{card.body}</p> : null}
        {instructors.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {instructors.map((instructor) => (
              <article key={instructor.id} className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100">
                    {instructor.profileImage ? <img src={instructor.profileImage} alt={instructor.fullName} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{instructor.fullName}</h3>
                    {instructor.bio ? <p className="mt-1 text-sm leading-6 text-slate-600">{instructor.bio}</p> : null}
                  </div>
                </div>
              </article>
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
      {card.title ? <h2 className="mt-3 text-2xl font-semibold text-slate-950">{card.title}</h2> : null}
      {card.body ? <p className="mt-4 text-base leading-8 text-slate-600">{card.body}</p> : null}
      {renderBulletLines(card)}
    </article>
  );
}

export function HomepageRenderer({ content, viewport = "auto" }: { content: HomepageContent; viewport?: HomepageRendererViewport }) {
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
                {orderedColumns.map(({ column }) => (
                  <div
                    key={column.id}
                    className={`flex min-w-0 flex-col ${getStackGapClasses(column.gapPreset)} ${getPaddingClasses(column.paddingPreset)} ${getColumnAlignClasses(column)}`}
                    style={getColumnStyle(column)}
                  >
                    {column.widgets
                      .filter((widget) => shouldDisplayOnViewport(widget.hidden, widget.visibility, viewport))
                      .map((widget) => (
                        <div key={widget.id} className={getResponsiveVisibilityClass(widget.visibility, viewport)}>
                          <HomepageCardView card={widget} viewport={viewport} />
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
