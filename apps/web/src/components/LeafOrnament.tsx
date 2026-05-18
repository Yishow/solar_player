import React from "react";

type LeafOrnamentProps = {
  className?: string;
  variant?: "logo" | "footer-mini";
};

export function LeafOrnament({ className, variant = "logo" }: LeafOrnamentProps) {
  if (variant === "footer-mini") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 30 26"
        fill="none"
        stroke="#789467"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={["inline-block", className ?? ""].join(" ")}
        style={{ width: "26px", height: "22px", transform: "translateY(-2px)" }}
        aria-hidden="true"
      >
        <path d="M24 3C13 4 5 11 5 22C16 22 23 13 24 3Z" />
        <path d="M7 21C12 14 17 9 23 4" />
      </svg>
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
