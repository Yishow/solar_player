import type { ButtonHTMLAttributes } from "react";

type KioskButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function KioskButton({
  variant = "primary",
  className,
  type = "button",
  ...props
}: KioskButtonProps) {
  const variantClassName =
    variant === "primary"
      ? "bg-brand-900 text-white hover:bg-brand-800"
      : variant === "secondary"
        ? "bg-brand-100 text-brand-900 hover:bg-white"
        : "bg-transparent text-neutral-700 hover:bg-white/60";

  return (
    <button
      {...props}
      type={type}
      className={[
        "inline-flex h-[var(--button-height)] items-center justify-center rounded-xl px-6 text-lg font-semibold shadow-card transition-colors",
        variantClassName,
        className ?? ""
      ].join(" ")}
    />
  );
}
