import type { CanvasRect } from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { setValueAtPath } from "../../hooks/displayPageConfigPaths";

export type DisplayEditorGeometryClipboard = {
  compatibilityKey?: string;
  rect: CanvasRect;
  sourceRegionId: string;
};

export function applyRegionRect(
  config: Record<string, unknown>,
  region: ResolvedDisplayEditorRegion,
  nextRect: CanvasRect
) {
  if (region.nodeType === "card-rail-card" && region.cardPath && region.geometryConstraint) {
    let nextConfig = setValueAtPath(
      config,
      [...region.cardPath, "frame", "left"],
      nextRect.left - region.geometryConstraint.left
    );
    nextConfig = setValueAtPath(
      nextConfig,
      [...region.cardPath, "frame", "top"],
      nextRect.top - region.geometryConstraint.top
    );
    nextConfig = setValueAtPath(nextConfig, [...region.cardPath, "frame", "width"], nextRect.width);
    nextConfig = setValueAtPath(nextConfig, [...region.cardPath, "frame", "height"], nextRect.height);
    return nextConfig;
  }

  if (!region.schema.geometry) {
    return config;
  }

  const { geometry } = region.schema;
  let nextConfig = setValueAtPath(config, geometry.leftPath, nextRect.left);
  nextConfig = setValueAtPath(nextConfig, geometry.topPath, nextRect.top + (geometry.topOffset ?? 0));
  nextConfig = setValueAtPath(nextConfig, geometry.widthPath, nextRect.width);

  if (geometry.heightPath) {
    nextConfig = setValueAtPath(nextConfig, geometry.heightPath, nextRect.height);
  }

  return nextConfig;
}

export function createGeometryClipboard(
  region: ResolvedDisplayEditorRegion
): DisplayEditorGeometryClipboard {
  if (!region.geometry || !region.schema.geometry) {
    throw new Error("Cannot copy geometry from a region without geometry.");
  }

  return {
    compatibilityKey: region.schema.geometry.compatibilityKey,
    rect: region.geometry,
    sourceRegionId: region.id
  };
}

export function resolveGeometryClipboardCompatibility(
  region: ResolvedDisplayEditorRegion,
  clipboard: DisplayEditorGeometryClipboard | null
) {
  if (!clipboard || !region.geometry || !region.schema.geometry) {
    return {
      compatible: false,
      reason: "幾何剪貼簿只可貼到相容的 region。"
    } as const;
  }

  const regionKey = region.schema.geometry.compatibilityKey;
  const compatible =
    regionKey !== undefined &&
    clipboard.compatibilityKey !== undefined &&
    regionKey === clipboard.compatibilityKey;

  return compatible
    ? ({ compatible: true, reason: null } as const)
    : ({
        compatible: false,
        reason: "幾何剪貼簿只可貼到相容的 region。"
      } as const);
}

export function applyGeometryClipboard(
  config: Record<string, unknown>,
  region: ResolvedDisplayEditorRegion,
  clipboard: DisplayEditorGeometryClipboard | null
) {
  const compatibility = resolveGeometryClipboardCompatibility(region, clipboard);
  if (!compatibility.compatible || !clipboard) {
    return config;
  }

  return applyRegionRect(config, region, clipboard.rect);
}
