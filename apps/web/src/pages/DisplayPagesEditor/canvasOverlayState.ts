import {
  type CanvasGuide,
  resolveRelationalMeasurements,
  mapCanvasPointToDesignPoint,
  resolveCanvasDesignMapping,
  type CanvasDesignMapping,
  resolveSelectionBounds,
  type CanvasDistanceLockSession,
  type CanvasRect
} from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

type OverlayPresetStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type DisplayEditorOverlayDisplayMode = "full-canvas" | "selected-only";
export type DisplayEditorOverlayFrameDensity = "soft" | "strong";
export type DisplayEditorOverlayDesignPresetKey = "custom" | "fhd" | "hd" | "uhd";

export type DisplayEditorOverlayPreset = {
  customHeight: number;
  customWidth: number;
  designPreset: DisplayEditorOverlayDesignPresetKey;
  displayMode: DisplayEditorOverlayDisplayMode;
  frameDensity: DisplayEditorOverlayFrameDensity;
  snapCenterLines: boolean;
  snapEnabled: boolean;
  snapGuides: boolean;
  snapRegionCenters: boolean;
  snapRegionEdges: boolean;
  showAxes: boolean;
  showCenterLines: boolean;
  showRegionLabels: boolean;
};

export type DisplayEditorOverlayFrame = {
  isLocked: boolean;
  isSelected: boolean;
  label: string | null;
  rect: CanvasRect;
  regionId: string;
  tone: "primary" | "secondary";
  visible: boolean;
};

export type DisplayEditorOverlayGuide = {
  axis: "x" | "y";
  canvasPosition: number;
  designPosition: number;
  kind: "boundary" | "center";
};

export type DisplayEditorOverlayTick = {
  axis: "x" | "y";
  canvasPosition: number;
  designPosition: number;
};

export type DisplayEditorOverlayMeasurement = {
  constraintRect: CanvasRect;
  rect: CanvasRect;
  designRect: CanvasRect;
  distances: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  };
};

export type DisplayEditorOverlayShellBandGuide = {
  canvasPosition: number;
  designPosition: number;
  id: "content-footer" | "header-content" | "shell-bottom" | "shell-top";
  label: string;
};

export type DisplayEditorOverlayRuler = {
  axis: "x" | "y";
  canDrag: boolean;
  compact: boolean;
  distance: number;
  handlePosition: { x: number; y: number };
  labelPlacement: "after" | "before";
  labelPosition: { x: number; y: number };
  targetRegionId: string;
  end: { x: number; y: number };
  start: { x: number; y: number };
};

export type DisplayEditorOverlayState = {
  activeInteraction: {
    constraintRect: CanvasRect | null;
    guides: CanvasGuide[];
    rect: CanvasRect | null;
    type: "drag" | "idle" | "measure-x" | "measure-y" | "resize";
  };
  axisTicks: DisplayEditorOverlayTick[];
  contentOffsetTop: number;
  designMapping: CanvasDesignMapping;
  designSpace: {
    height: number;
    width: number;
  };
  displayMode: DisplayEditorOverlayDisplayMode;
  frames: DisplayEditorOverlayFrame[];
  measurement: DisplayEditorOverlayMeasurement | null;
  pageGuides: DisplayEditorOverlayGuide[];
  preset: DisplayEditorOverlayPreset;
  relationalRulers: DisplayEditorOverlayRuler[];
  selectionBounds: CanvasRect | null;
  selectionLabel: string | null;
  sessionDistanceLock: {
    axis: "x" | "y";
    boundaryClamped: boolean;
    distance: number;
  } | null;
  shellBandGuides: DisplayEditorOverlayShellBandGuide[];
  snapGuides: CanvasGuide[];
  temporaryMeasureMode: boolean;
  temporaryMeasureTargetRegionId: string | null;
};

export const DISPLAY_EDITOR_OVERLAY_STORAGE_KEY = "solar-display:display-editor-overlay";

export const defaultDisplayEditorOverlayPreset: DisplayEditorOverlayPreset = {
  customHeight: 1080,
  customWidth: 1920,
  designPreset: "fhd",
  displayMode: "selected-only",
  frameDensity: "soft",
  snapCenterLines: true,
  snapEnabled: true,
  snapGuides: true,
  snapRegionCenters: true,
  snapRegionEdges: true,
  showAxes: true,
  showCenterLines: false,
  showRegionLabels: false
};

const DESIGN_PRESET_SIZE = {
  fhd: { height: 1080, width: 1920 },
  hd: { height: 720, width: 1280 },
  uhd: { height: 2160, width: 3840 }
} as const;

function resolveOverlayStorage(storage?: OverlayPresetStorage | null) {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeDimension(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function normalizeDisplayMode(value: unknown): DisplayEditorOverlayDisplayMode {
  return value === "full-canvas" ? "full-canvas" : "selected-only";
}

function normalizeFrameDensity(value: unknown): DisplayEditorOverlayFrameDensity {
  return value === "strong" ? "strong" : "soft";
}

function normalizeDesignPreset(value: unknown): DisplayEditorOverlayDesignPresetKey {
  return value === "custom" || value === "hd" || value === "uhd" ? value : "fhd";
}

function normalizeOverlayPreset(value: unknown): DisplayEditorOverlayPreset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<DisplayEditorOverlayPreset>;

  return {
    customHeight: normalizeDimension(candidate.customHeight, defaultDisplayEditorOverlayPreset.customHeight),
    customWidth: normalizeDimension(candidate.customWidth, defaultDisplayEditorOverlayPreset.customWidth),
    designPreset: normalizeDesignPreset(candidate.designPreset),
    displayMode: normalizeDisplayMode(candidate.displayMode),
    frameDensity: normalizeFrameDensity(candidate.frameDensity),
    snapCenterLines: candidate.snapCenterLines !== false,
    snapEnabled: candidate.snapEnabled !== false,
    snapGuides: candidate.snapGuides !== false,
    snapRegionCenters: candidate.snapRegionCenters !== false,
    snapRegionEdges: candidate.snapRegionEdges !== false,
    showAxes: candidate.showAxes !== false,
    showCenterLines: candidate.showCenterLines === true,
    showRegionLabels: candidate.showRegionLabels === true
  };
}

export function readStoredDisplayEditorOverlayPreset(storage?: OverlayPresetStorage | null) {
  const resolvedStorage = resolveOverlayStorage(storage);

  if (!resolvedStorage) {
    return null;
  }

  const raw = resolvedStorage.getItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizeOverlayPreset(JSON.parse(raw));
  } catch {
    resolvedStorage.removeItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY);
    return null;
  }
}

export function writeStoredDisplayEditorOverlayPreset(
  preset: DisplayEditorOverlayPreset,
  storage?: OverlayPresetStorage | null
) {
  const resolvedStorage = resolveOverlayStorage(storage);

  if (!resolvedStorage) {
    return;
  }

  resolvedStorage.setItem(DISPLAY_EDITOR_OVERLAY_STORAGE_KEY, JSON.stringify(preset));
}

export function resolveInitialDisplayEditorOverlayPreset(
  initialPreset?: Partial<DisplayEditorOverlayPreset> | null,
  storage?: OverlayPresetStorage | null
) {
  return (
    normalizeOverlayPreset(initialPreset) ??
    readStoredDisplayEditorOverlayPreset(storage) ??
    defaultDisplayEditorOverlayPreset
  );
}

export function resolveDisplayEditorOverlayDesignSpace(preset: DisplayEditorOverlayPreset) {
  if (preset.designPreset === "custom") {
    return {
      height: preset.customHeight,
      width: preset.customWidth
    };
  }

  return DESIGN_PRESET_SIZE[preset.designPreset];
}

function mapCanvasRectToDesignRect(rect: CanvasRect, mapping: CanvasDesignMapping): CanvasRect {
  const topLeft = mapCanvasPointToDesignPoint({ x: rect.left, y: rect.top }, mapping);
  const bottomRight = mapCanvasPointToDesignPoint(
    { x: rect.left + rect.width, y: rect.top + rect.height },
    mapping
  );

  return {
    height: bottomRight.y - topLeft.y,
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x
  };
}

function createGuideKey(axis: "x" | "y", designPosition: number, kind: "boundary" | "center") {
  return `${axis}:${kind}:${designPosition}`;
}

function resolvePageGuides(
  regions: ResolvedDisplayEditorRegion[],
  mapping: CanvasDesignMapping,
  showCenterLines: boolean
) {
  const seen = new Set<string>();
  const guides: DisplayEditorOverlayGuide[] = [];

  for (const region of regions) {
    if (!region.geometry || region.parentId) {
      continue;
    }

    const horizontalBoundaries = [
      { axis: "x" as const, canvasPosition: region.geometry.left, kind: "boundary" as const },
      { axis: "x" as const, canvasPosition: region.geometry.left + region.geometry.width, kind: "boundary" as const }
    ];
    const verticalBoundaries = [
      { axis: "y" as const, canvasPosition: region.geometry.top, kind: "boundary" as const },
      { axis: "y" as const, canvasPosition: region.geometry.top + region.geometry.height, kind: "boundary" as const }
    ];
    const centerGuides = showCenterLines
      ? [
        { axis: "x" as const, canvasPosition: region.geometry.left + region.geometry.width / 2, kind: "center" as const },
        { axis: "y" as const, canvasPosition: region.geometry.top + region.geometry.height / 2, kind: "center" as const }
      ]
      : [];

    for (const item of [...horizontalBoundaries, ...verticalBoundaries, ...centerGuides]) {
      const designPosition =
        item.axis === "x"
          ? mapCanvasPointToDesignPoint({ x: item.canvasPosition, y: 0 }, mapping).x
          : mapCanvasPointToDesignPoint({ x: 0, y: item.canvasPosition }, mapping).y;
      const key = createGuideKey(item.axis, designPosition, item.kind);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      guides.push({
        axis: item.axis,
        canvasPosition: Math.round(item.canvasPosition),
        designPosition,
        kind: item.kind
      });
    }
  }

  if (showCenterLines) {
    for (const item of [
      { axis: "x" as const, canvasPosition: mapping.canvasWidth / 2, kind: "center" as const },
      { axis: "y" as const, canvasPosition: mapping.canvasHeight / 2, kind: "center" as const }
    ]) {
      const designPosition =
        item.axis === "x"
          ? mapCanvasPointToDesignPoint({ x: item.canvasPosition, y: 0 }, mapping).x
          : mapCanvasPointToDesignPoint({ x: 0, y: item.canvasPosition }, mapping).y;
      const key = createGuideKey(item.axis, designPosition, item.kind);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      guides.push({
        axis: item.axis,
        canvasPosition: Math.round(item.canvasPosition),
        designPosition,
        kind: item.kind
      });
    }
  }

  return guides.sort((a, b) => a.canvasPosition - b.canvasPosition);
}

function resolveAxisTicks(mapping: CanvasDesignMapping, showAxes: boolean): DisplayEditorOverlayTick[] {
  if (!showAxes) {
    return [];
  }

  const ticks: DisplayEditorOverlayTick[] = [];
  const divisions = 4;

  for (let step = 0; step <= divisions; step += 1) {
    const x = Math.round((mapping.designWidth / divisions) * step);
    const y = Math.round((mapping.designHeight / divisions) * step);
    ticks.push({
      axis: "x",
      canvasPosition: Math.round(x * mapping.scaleX),
      designPosition: x
    });
    ticks.push({
      axis: "y",
      canvasPosition: Math.round(y * mapping.scaleY),
      designPosition: y
    });
  }

  return ticks;
}

function resolveShellBandGuides({
  contentHeight,
  contentOffsetTop,
  mapping,
  shellHeight
}: {
  contentHeight: number;
  contentOffsetTop: number;
  mapping: CanvasDesignMapping;
  shellHeight: number;
}): DisplayEditorOverlayShellBandGuide[] {
  const positions = [
    { id: "shell-top" as const, label: "Shell top", position: 0 },
    { id: "header-content" as const, label: "Header / content", position: contentOffsetTop },
    { id: "content-footer" as const, label: "Content / footer", position: contentOffsetTop + contentHeight },
    { id: "shell-bottom" as const, label: "Shell bottom", position: shellHeight }
  ];

  return positions.map((guide) => ({
    canvasPosition: guide.position,
    designPosition: mapCanvasPointToDesignPoint({ x: 0, y: guide.position }, mapping).y,
    id: guide.id,
    label: guide.label
  }));
}

function resolveMeasurement(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  mapping: CanvasDesignMapping,
  activeRect?: CanvasRect | null
): DisplayEditorOverlayMeasurement | null {
  if (!selectedRegion?.geometry) {
    return null;
  }

  const measurementRect = activeRect ?? selectedRegion.geometry;
  const constraintRect = selectedRegion.geometryConstraint ?? {
    height: mapping.canvasHeight,
    left: 0,
    top: 0,
    width: mapping.canvasWidth
  };
  const designRect = mapCanvasRectToDesignRect(measurementRect, mapping);
  const designConstraintRect = mapCanvasRectToDesignRect(constraintRect, mapping);

  return {
    constraintRect,
    rect: measurementRect,
    designRect,
    distances: {
      bottom: designConstraintRect.top + designConstraintRect.height - (designRect.top + designRect.height),
      left: designRect.left - designConstraintRect.left,
      right: designConstraintRect.left + designConstraintRect.width - (designRect.left + designRect.width),
      top: designRect.top - designConstraintRect.top
    }
  };
}

function resolveEffectiveInteractionRegion(
  region: ResolvedDisplayEditorRegion | null,
  activeInteraction?: {
    rect: CanvasRect;
    regionId?: string;
  } | null
): ResolvedDisplayEditorRegion | null {
  if (!region?.geometry || activeInteraction?.regionId !== region.id) {
    return region;
  }

  return {
    ...region,
    geometry: activeInteraction.rect
  };
}

function resolveRelationalRulers(
  selectedRegion: ResolvedDisplayEditorRegion | null,
  targetRegion: ResolvedDisplayEditorRegion | null,
  mapping: CanvasDesignMapping
): DisplayEditorOverlayRuler[] {
  if (!selectedRegion?.geometry || !targetRegion?.geometry) {
    return [];
  }

  return resolveRelationalMeasurements(selectedRegion.geometry, targetRegion.geometry, mapping).map((measurement) => {
    const labelPlacement =
      measurement.axis === "x"
        ? measurement.midpoint.y >= targetRegion.geometry!.top
          ? "before"
          : "after"
        : measurement.midpoint.x >= targetRegion.geometry!.left
          ? "after"
          : "before";
    const labelPosition =
      measurement.axis === "x"
        ? {
          x: measurement.midpoint.x,
          y: labelPlacement === "before" ? measurement.midpoint.y - 14 : measurement.midpoint.y + 14
        }
        : {
          x: labelPlacement === "before" ? measurement.midpoint.x - 14 : measurement.midpoint.x + 14,
          y: measurement.midpoint.y
        };

    return {
      axis: measurement.axis,
      canDrag: measurement.distance > 0,
      compact: measurement.distance < 32,
      distance: measurement.distance,
      end: measurement.end,
      handlePosition: measurement.midpoint,
      labelPlacement,
      labelPosition,
      start: measurement.start,
      targetRegionId: targetRegion.id
    };
  });
}

export function resolveDisplayEditorOverlayState({
  activeInteraction,
  canvasHeight,
  canvasWidth,
  contentOffsetTop = 0,
  distanceLockSession,
  lockedRegionIds,
  measurementTargetRegion,
  overlayPreset,
  regions,
  selectedRegion,
  selectedRegionIds,
  selectionFeedbackLabel,
  shellHeight = canvasHeight,
  temporaryMeasureMode = false
}: {
  activeInteraction?: {
    boundaryClamped?: boolean;
    constraintRect: CanvasRect;
    guides: CanvasGuide[];
    rect: CanvasRect;
    regionId?: string;
    type: "drag" | "measure-x" | "measure-y" | "resize";
  } | null;
  canvasHeight: number;
  canvasWidth: number;
  contentOffsetTop?: number;
  distanceLockSession?: CanvasDistanceLockSession | null;
  lockedRegionIds: string[];
  measurementTargetRegion?: ResolvedDisplayEditorRegion | null;
  overlayPreset: DisplayEditorOverlayPreset;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegion: ResolvedDisplayEditorRegion | null;
  selectedRegionIds?: string[];
  selectionFeedbackLabel?: string | null;
  shellHeight?: number;
  temporaryMeasureMode?: boolean;
}): DisplayEditorOverlayState {
  const designSpace = resolveDisplayEditorOverlayDesignSpace(overlayPreset);
  const designMapping = resolveCanvasDesignMapping(
    { height: canvasHeight, width: canvasWidth },
    designSpace
  );
  const shellDesignMapping = resolveCanvasDesignMapping(
    { height: shellHeight, width: canvasWidth },
    designSpace
  );
  const activeSelectedRegionIds = selectedRegionIds ?? (selectedRegion ? [selectedRegion.id] : []);
  const effectiveSelectedRegion = resolveEffectiveInteractionRegion(selectedRegion, activeInteraction);
  const effectiveMeasurementTargetRegion = resolveEffectiveInteractionRegion(
    measurementTargetRegion ?? null,
    activeInteraction
  );
  const selectedRects = regions
    .filter((region) => region.geometry && activeSelectedRegionIds.includes(region.id))
    .map((region) => ({
      id: region.id,
      rect: resolveEffectiveInteractionRegion(region, activeInteraction)?.geometry ?? region.geometry!
    }));
  const selectionBounds = activeSelectedRegionIds.length > 1 ? resolveSelectionBounds(selectedRects) : null;

  return {
    activeInteraction: activeInteraction
      ? {
        constraintRect: activeInteraction.constraintRect,
        guides: activeInteraction.guides,
        rect: activeInteraction.rect,
        type: activeInteraction.type
      }
      : {
        constraintRect: null,
        guides: [],
        rect: selectedRegion?.geometry ?? null,
        type: "idle"
      },
    axisTicks: resolveAxisTicks(designMapping, overlayPreset.showAxes),
    contentOffsetTop,
    designMapping,
    designSpace,
    displayMode: overlayPreset.displayMode,
    frames: regions
      .filter((region) => Boolean(region.geometry))
      .map((region) => {
        const isActiveDragRegion =
          activeInteraction != null &&
          activeInteraction.regionId === region.id &&
          (activeInteraction.type === "drag" || activeInteraction.type === "resize");

        return {
          isLocked: lockedRegionIds.includes(region.id),
          isSelected: activeSelectedRegionIds.includes(region.id),
          label: overlayPreset.showRegionLabels ? region.label : null,
          rect: isActiveDragRegion ? activeInteraction.rect : region.geometry!,
          regionId: region.id,
          tone: selectedRegion?.id === region.id ? "primary" : "secondary",
          visible:
            overlayPreset.displayMode === "full-canvas" ||
            activeSelectedRegionIds.includes(region.id)
        };
      }),
    measurement: resolveMeasurement(effectiveSelectedRegion, designMapping),
    pageGuides: resolvePageGuides(regions, designMapping, overlayPreset.showCenterLines),
    preset: overlayPreset,
    relationalRulers: resolveRelationalRulers(
      effectiveSelectedRegion,
      effectiveMeasurementTargetRegion,
      designMapping
    ),
    selectionBounds,
    selectionLabel:
      selectionFeedbackLabel ?? (selectionBounds && activeSelectedRegionIds.length > 1 ? `已選 ${activeSelectedRegionIds.length} 區` : null),
    sessionDistanceLock: distanceLockSession
      ? {
        axis: distanceLockSession.axis,
        boundaryClamped: activeInteraction?.boundaryClamped === true,
        distance: distanceLockSession.distance
      }
      : null,
    shellBandGuides: resolveShellBandGuides({
      contentHeight: canvasHeight,
      contentOffsetTop,
      mapping: shellDesignMapping,
      shellHeight
    }),
    snapGuides: activeInteraction?.guides.filter((guide) => Boolean(guide.targetType)) ?? [],
    temporaryMeasureMode,
    temporaryMeasureTargetRegionId: measurementTargetRegion?.id ?? null
  };
}
