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
      className="inline-flex h-[54px] w-[210px] items-center justify-center gap-[12px] rounded-[16px] border font-en text-[18px] font-medium"
      style={{
        background: "rgba(255, 255, 249, 0.78)",
        borderColor: "rgba(89, 124, 67, 0.32)",
        boxShadow: "0 8px 22px rgba(70, 60, 40, 0.04)",
        color: style.accent
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
      width="20"
      height="20"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 9c5-4 11-4 16 0M7 12c3-2 7-2 10 0M10 15c1-1 3-1 4 0" />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  );
}
