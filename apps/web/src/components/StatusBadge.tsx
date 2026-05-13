type StatusBadgeProps = {
  status: "connected" | "disconnected" | "connecting";
  label?: string;
};

const badgeStyleMap = {
  connected: {
    dot: "bg-[var(--color-status-success-500)]",
    wrapper: "bg-[rgba(35,122,34,0.12)] text-[var(--color-status-success-500)]",
    text: "Connected"
  },
  disconnected: {
    dot: "bg-[var(--color-status-error-500)]",
    wrapper: "bg-[rgba(230,0,18,0.12)] text-[var(--color-status-error-500)]",
    text: "Disconnected"
  },
  connecting: {
    dot: "bg-[var(--color-status-warning-500)]",
    wrapper: "bg-[rgba(224,161,42,0.16)] text-[var(--color-status-warning-500)]",
    text: "Connecting"
  }
} as const;

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = badgeStyleMap[status];

  return (
    <span
      className={[
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold tracking-[0.08em]",
        style.wrapper
      ].join(" ")}
    >
      <span className={["h-2.5 w-2.5 rounded-full", style.dot].join(" ")} />
      <span>{label ?? style.text}</span>
    </span>
  );
}
