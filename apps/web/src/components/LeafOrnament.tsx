type LeafOrnamentProps = {
  className?: string;
  variant?: "logo" | "footer-mini";
};

export function LeafOrnament({ className, variant = "logo" }: LeafOrnamentProps) {
  if (variant === "footer-mini") {
    return (
      <span
        aria-hidden
        className={["inline-block", className ?? ""].join(" ")}
        style={{
          width: "22px",
          height: "28px",
          border: "1.5px solid rgba(83, 123, 68, 0.45)",
          borderRadius: "60% 0 60% 0",
          transform: "rotate(-20deg)"
        }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 64 60"
      className={["h-12 w-12", className ?? ""].join(" ")}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M52 8C30 10 12 24 12 46C30 47 47 34 52 8Z"
        fill="var(--shell-leaf-fill)"
        stroke="var(--shell-leaf-stroke-strong)"
        strokeWidth="2"
      />
      <path
        d="M16 45C26 35 35 26 48 14"
        stroke="var(--shell-leaf-stroke-soft)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
