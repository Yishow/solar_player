import type { PropsWithChildren } from "react";
import { shellDensityClassMap, type ShellDensity } from "./shellDensity";

type MediaSlotProps = PropsWithChildren<{
  className?: string;
  density?: ShellDensity;
}>;

export function MediaSlot({
  className,
  density = "playback",
  children
}: MediaSlotProps) {
  return (
    <div
      data-shell-density={density}
      data-shell-primitive="media-slot"
      className={[
        "relative overflow-hidden border border-white/70 bg-white/56 shadow-soft backdrop-blur",
        shellDensityClassMap[density].panel,
        className ?? ""
      ].join(" ")}
    >
      {children}
    </div>
  );
}
