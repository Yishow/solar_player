import {
  resolveDisplayPageMediaEffects,
  type DisplayPageMediaBinding,
  type DisplayPageMediaEffectResolverOptions,
  type DisplayPageMediaFitMode
} from "@solar-display/shared";
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

export function buildDisplayPageMediaPresentation(
  binding: DisplayPageMediaBinding,
  options: DisplayPageMediaEffectResolverOptions
) {
  const mediaStyle = buildDisplayPageMediaStyle(binding);
  const effects = resolveDisplayPageMediaEffects(binding.effects, options);
  const stageClassNames: string[] = [];
  const stageStyle: CSSProperties & Record<string, string> = {};

  if (effects.edgeFade.enabled) {
    stageClassNames.push(`display-surface-media-fade-${effects.edgeFade.direction}`);
    stageStyle["--display-photo-fade-edge-width" as string] = `${effects.edgeFade.width * 100}%`;
  }

  if (effects.bottomFade.enabled) {
    stageClassNames.push("display-surface-media-fade-bottom");
    stageStyle["--display-photo-fade-bottom-height" as string] = `${effects.bottomFade.height * 100}%`;
  }

  if (effects.blur.enabled && effects.blur.amount > 0) {
    mediaStyle.filter = `blur(${effects.blur.amount}px)`;
  }

  if (effects.opacity.enabled) {
    mediaStyle.opacity = effects.opacity.value;
  }

  return {
    mediaStyle,
    stageClassName: stageClassNames.join(" "),
    stageStyle
  };
}
