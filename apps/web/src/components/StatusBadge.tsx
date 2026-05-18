import React from "react";
import type { ShellDensity } from "./shellDensity";

type StatusBadgeProps = {
  density?: ShellDensity;
  status: "connected" | "disconnected" | "connecting";
  label?: string;
};

const badgeStyleMap = {
  connected: {
    accent: "var(--color-status-success-500)",
    text: "Connected"
  },
  disconnected: {
    accent: "var(--color-status-error-500)",
    text: "Disconnected"
  },
  connecting: {
    accent: "var(--color-status-warning-500)",
    text: "Connecting"
  }
} as const;

export function StatusBadge({
  density = "management",
  status,
  label
}: StatusBadgeProps) {
  const style = badgeStyleMap[status];

  return (
    <span
      data-shell-density={density}
      data-shell-primitive="status-pill"
      className="inline-flex h-[44px] w-auto items-center justify-center gap-[12px] font-en text-[18px] font-medium"
      style={{
        color: "var(--shell-meta-weather-ink)"
      }}
    >
      <WifiGlyph color={style.accent} />
      <span>{label ?? style.text}</span>
    </span>
  );
}

function WifiGlyph({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      aria-hidden
    >
      <path d="M4 9c5-4 11-4 16 0M7 12c3-2 7-2 10 0M10 15c1-1 3-1 4 0" />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  );
}
