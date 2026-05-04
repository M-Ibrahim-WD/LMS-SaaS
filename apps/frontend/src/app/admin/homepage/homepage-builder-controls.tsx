import type { ReactNode } from "react";
import type {
  HomepageAlign,
  HomepageBorder,
  HomepageBorderStyle,
  HomepageBoxSpacing,
  HomepageLengthUnit,
  HomepageLengthValue,
  HomepageResponsiveVisibility,
  HomepageStyleUnit,
  HomepageTypography
} from "../../../lib/homepage/types";
import { MonitorIcon, PhoneIcon, TabletIcon } from "./homepage-builder-icons";
import { createBox, createNoBorder, createVisibility } from "./homepage-builder-utils";

export function LengthControl({
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

export function ColorControl({
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

export function BoxSpacingControl({
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

export function BorderControl({ value, onChange }: { value?: HomepageBorder; onChange: (value: HomepageBorder) => void }) {
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

export function TypographyControl({
  value,
  onChange
}: {
  value?: HomepageTypography;
  onChange: (value: HomepageTypography) => void;
}) {
  const typography = value ?? {};
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Typography</p>
      <LengthControl
        label="Font size"
        value={typography.fontSize}
        onChange={(fontSize) => onChange({ ...typography, fontSize })}
      />
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Weight</span>
          <select
            value={typography.fontWeight ?? "600"}
            onChange={(event) => onChange({ ...typography, fontWeight: event.target.value as HomepageTypography["fontWeight"] })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="300">Light</option>
            <option value="400">Regular</option>
            <option value="500">Medium</option>
            <option value="600">Semi bold</option>
            <option value="700">Bold</option>
            <option value="800">Extra bold</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">Transform</span>
          <select
            value={typography.textTransform ?? "none"}
            onChange={(event) => onChange({ ...typography, textTransform: event.target.value as HomepageTypography["textTransform"] })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="mb-1 block text-xs text-slate-500">Line height</span>
          <input
            type="number"
            step="0.1"
            value={typography.lineHeight ?? ""}
            onChange={(event) => onChange({ ...typography, lineHeight: event.target.value === "" ? undefined : Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Auto"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">Letter spacing</span>
          <input
            type="number"
            step="0.1"
            value={typography.letterSpacing ?? ""}
            onChange={(event) => onChange({ ...typography, letterSpacing: event.target.value === "" ? undefined : Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="0"
          />
        </label>
      </div>
    </div>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
  placeholder = "Auto",
  min
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        value={typeof value === "number" ? value : ""}
        onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}

export function AlignmentControl({ value, onChange }: { value?: HomepageAlign; onChange: (value: HomepageAlign | undefined) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Alignment</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value ? event.target.value as HomepageAlign : undefined)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
        <option value="">Default</option>
        <option value="left">Left</option>
        <option value="center">Center</option>
      </select>
    </label>
  );
}

export function IconSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              title={option.label}
              onClick={() => onChange(option.value)}
              className={`inline-flex h-11 items-center justify-center rounded-2xl border transition ${active ? "border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-100" : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50"}`}
            >
              {option.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function IconButton({
  label,
  children,
  onClick,
  active,
  tone = "default",
  disabled
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "default" | "danger" | "success";
  disabled?: boolean;
}) {
  const toneClass = tone === "danger" ? "border-rose-100 bg-white text-rose-600 hover:bg-rose-50" : tone === "success" ? "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";
  const activeClass = "border-teal-500 bg-teal-600 text-white shadow-sm ring-2 ring-teal-100 hover:bg-teal-700";
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 disabled:opacity-40 ${active ? activeClass : toneClass}`}>
      {children}
    </button>
  );
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
  children: ReactNode;
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

export function EditorSection({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        {title}
        <span className="text-slate-400 transition group-open:rotate-180">v</span>
      </summary>
      <div className="border-t border-slate-100 p-3">
        {children}
      </div>
    </details>
  );
}

export function ControlGroup({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details name="homepage-builder-control-group" open={defaultOpen} className="rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.13em] text-slate-600">
        {title}
        <span className="text-slate-400">v</span>
      </summary>
      <div className="space-y-3 border-t border-slate-100 p-3">
        {children}
      </div>
    </details>
  );
}

export function VisibilityControls({
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
