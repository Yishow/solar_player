import type { ReactNode } from "react";
export {
  OpsActionRow,
  OpsInfoBanner,
  OpsStatStrip,
  OpsSurface,
  OpsSurfaceTitle
} from "./opsSurfacePrimitives";
export { RotationOpsSummary } from "./rotationOpsSummary";
export { CustomSelect } from "./CustomSelect";
export type { CustomSelectOption, CustomSelectProps } from "./CustomSelect";

export type SwitchProps = {
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
};

export function Switch({ on, disabled, onChange, ariaLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`mgmt-switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

export type ChipTone = "default" | "success" | "warning" | "danger" | "accent" | "on" | "cover";

export type ChipProps = {
  tone?: ChipTone;
  children: ReactNode;
};

export function Chip({ tone = "default", children }: ChipProps) {
  const toneClass = tone !== "default" ? `is-${tone}` : "";
  return <span className={`mgmt-chip ${toneClass}`.trim()}>{children}</span>;
}

export type StatusBarTone = "ready" | "saving" | "loading" | "uploading" | "deleting" | "error";

export type StatusBarProps = {
  tone: StatusBarTone;
  positionClass: string;
  children: ReactNode;
};

export function StatusBar({ tone, positionClass, children }: StatusBarProps) {
  const toneClass = tone !== "ready" ? `is-${tone}` : "";
  return (
    <div role="status" className={`mgmt-status ${positionClass} ${toneClass}`.trim()}>
      {children}
    </div>
  );
}
