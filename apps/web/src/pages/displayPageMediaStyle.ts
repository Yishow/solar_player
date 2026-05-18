import type { DisplayPageMediaBinding, DisplayPageMediaFitMode } from "@solar-display/shared";
import type { CSSProperties } from "react";

function normalizeFitMode(fitMode?: DisplayPageMediaFitMode) {
  return fitMode === "contain" ? "contain" : "cover";
}

function normalizeAnchor(value: number | undefined) {
  return value ?? 0.5;
}

export function buildDisplayPageMediaStyle(binding: DisplayPageMediaBinding): CSSProperties {
  const fitMode = normalizeFitMode(binding.fitMode);
  const positionX =
    fitMode === "cover"
      ? normalizeAnchor(binding.focusX ?? binding.alignX)
      : normalizeAnchor(binding.alignX);
  const positionY =
    fitMode === "cover"
      ? normalizeAnchor(binding.focusY ?? binding.alignY)
      : normalizeAnchor(binding.alignY);

  return {
    objectFit: fitMode,
    objectPosition: `${positionX * 100}% ${positionY * 100}%`
  };
}
