import {
  resolveDisplayPageMediaEffects,
  type DisplayPageMediaBinding,
  type DisplayPageMediaEffectResolverOptions,
  type DisplayPageLocalizedMediaEffectZone,
  type DisplayPageResolvedMediaEffectLayer,
  type DisplayPageResolvedMediaBlurEffectLayer,
  type DisplayPageResolvedMediaOpacityEffectLayer,
  type DisplayPageResolvedMediaToneEffectLayer,
  type DisplayPageResolvedMediaEffects
} from "@solar-display/shared";
import type { CSSProperties } from "react";

type DisplayPageMediaOverlayLayer = {
  className: string;
  id: string;
  kind: DisplayPageResolvedMediaEffectLayer["kind"];
  style: CSSProperties & Record<string, string>;
  zone: DisplayPageLocalizedMediaEffectZone;
};

function normalizeFitMode(fitMode?: DisplayPageMediaBinding["fitMode"]) {
  return fitMode === "contain" ? "contain" : "cover";
}

function normalizeAnchor(value: number | undefined) {
  return value ?? 0.5;
}

function formatPercent(value: number) {
  return `${Math.round(value * 10000) / 100}%`;
}

function formatBlurPixels(value: number) {
  return `${Math.round(value)}px`;
}

function normalizeOverlayStrength(
  layer: Extract<DisplayPageResolvedMediaEffectLayer, { kind: "blur" | "fade" | "mist" }>
) {
  if (layer.kind === "blur") {
    return formatPercent(Math.min(1, layer.strength / 24));
  }

  return formatPercent(layer.strength);
}

function expandLocalizedZone(zone: DisplayPageLocalizedMediaEffectZone): DisplayPageLocalizedMediaEffectZone[] {
  switch (zone) {
    case "all-edges":
      return ["top", "right", "bottom", "left"];
    case "left-right":
      return ["left", "right"];
    case "top-bottom":
      return ["top", "bottom"];
    default:
      return [zone];
  }
}

function buildOverlayLayer(
  layer: Extract<DisplayPageResolvedMediaEffectLayer, { kind: "blur" | "fade" | "mist" }>,
  zone: DisplayPageLocalizedMediaEffectZone,
  index: number
): DisplayPageMediaOverlayLayer {
  const style: CSSProperties & Record<string, string> = {
    "--display-photo-effect-coverage": formatPercent(layer.coverage),
    "--display-photo-effect-feather": formatPercent(layer.feather),
    "--display-photo-effect-strength": normalizeOverlayStrength(layer)
  };

  if (layer.kind === "blur" || layer.kind === "mist") {
    style["--display-photo-effect-blur"] =
      layer.kind === "blur" ? formatBlurPixels(layer.strength) : formatBlurPixels(layer.blur);
  }

  return {
    className: `display-surface-media-overlay display-surface-media-overlay--${layer.kind} display-surface-media-overlay--${zone}`,
    id: `${layer.kind}-${zone}-${index}`,
    kind: layer.kind,
    style,
    zone
  };
}

function buildOverlayLayers(effects: DisplayPageResolvedMediaEffects) {
  const overlays: DisplayPageMediaOverlayLayer[] = [];

  effects.layers.forEach((layer, index) => {
    if (layer.kind === "opacity" || layer.zone === "full-frame") {
      return;
    }

    expandLocalizedZone(layer.zone).forEach((zone, expandedIndex) => {
      overlays.push(
        buildOverlayLayer(
          layer,
          zone,
          index * 10 + expandedIndex
        )
      );
    });
  });

  return overlays;
}

function buildFullFrameMediaStyle(
  mediaStyle: CSSProperties,
  effects: DisplayPageResolvedMediaEffects
) {
  const filters: string[] = [];
  const fullFrameBlurAmount = effects.layers
    .filter((layer): layer is DisplayPageResolvedMediaBlurEffectLayer =>
      layer.kind === "blur" && layer.zone === "full-frame"
    )
    .reduce((sum, layer) => sum + layer.strength, 0);

  if (fullFrameBlurAmount > 0) {
    filters.push(`blur(${Math.min(24, fullFrameBlurAmount)}px)`);
  }

  effects.layers
    .filter((layer): layer is DisplayPageResolvedMediaToneEffectLayer => layer.kind === "tone")
    .forEach((layer) => {
      filters.push(`saturate(${layer.saturation})`);
      filters.push(`contrast(${layer.contrast})`);
    });

  if (filters.length > 0) {
    mediaStyle.filter = filters.join(" ");
  }

  const fullFrameOpacityLayers = effects.layers.filter(
    (layer): layer is DisplayPageResolvedMediaOpacityEffectLayer =>
      layer.kind === "opacity"
  );
  if (fullFrameOpacityLayers.length > 0) {
    mediaStyle.opacity = fullFrameOpacityLayers.reduce((current, layer) => current * layer.strength, 1);
  }
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
  buildFullFrameMediaStyle(mediaStyle, effects);

  return {
    mediaStyle,
    overlayLayers: buildOverlayLayers(effects),
    stageClassName: "",
    stageStyle: {}
  };
}
