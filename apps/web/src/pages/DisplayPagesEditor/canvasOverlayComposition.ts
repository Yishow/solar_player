import {
  type CanvasDesignMapping,
  type CanvasDistanceLockSession,
  type CanvasGuide,
  type CanvasRect,
  resolveCanvasDesignMapping,
  resolveRelationalMeasurements,
  resolveSelectionBounds
} from "./canvasInteractions";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import type {
  DisplayEditorOverlayFrame,
  DisplayEditorOverlayPreset,
  DisplayEditorOverlayRuler,
  DisplayEditorOverlayShellBandGuide,
  DisplayEditorOverlayState,
  DisplayEditorOverlayTick
} from "./canvasOverlayState";
import { resolveDisplayEditorOverlayDesignSpace } from "./canvasOverlayState";
import {
  resolveAxisTicks,
  resolveMeasurement,
  resolvePageGuides,
  resolveShellBandGuides
} from "./canvasOverlayHelpers";

export type StaticOverlayPreparation = {
  axisTicks: DisplayEditorOverlayTick[];
  baseFrames: DisplayEditorOverlayFrame[];
  canvasHeight: number;
  canvasWidth: number;
  contentOffsetTop: number;
  designMapping: CanvasDesignMapping;
  designSpace: { height: number; width: number };
  framesById: Map<string, DisplayEditorOverlayFrame>;
  generation: number;
  pageGuides: import("./canvasOverlayState").DisplayEditorOverlayGuide[];
  shellBandGuides: DisplayEditorOverlayShellBandGuide[];
  shellDesignMapping: CanvasDesignMapping;
  shellHeight: number;
};

export type StaticOverlayInputs = {
  canvasHeight: number;
  canvasWidth: number;
  contentOffsetTop?: number;
  lockedRegionIds: string[];
  overlayPreset: DisplayEditorOverlayPreset;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegion?: ResolvedDisplayEditorRegion | null;
  selectedRegionIds?: string[];
  shellHeight?: number;
  viewport?: {
    offsetX?: number;
    offsetY?: number;
    zoom?: number;
  } | null;
};

export function areOverlayPresetsEqual(
  a: DisplayEditorOverlayPreset,
  b: DisplayEditorOverlayPreset
): boolean {
  if (a === b) return true;
  return (
    a.designPreset === b.designPreset &&
    a.displayMode === b.displayMode &&
    a.frameDensity === b.frameDensity &&
    a.snapCenterLines === b.snapCenterLines &&
    a.snapEnabled === b.snapEnabled &&
    a.snapGuides === b.snapGuides &&
    a.snapRegionCenters === b.snapRegionCenters &&
    a.snapRegionEdges === b.snapRegionEdges &&
    a.showAxes === b.showAxes &&
    a.showCenterLines === b.showCenterLines &&
    a.showRegionLabels === b.showRegionLabels &&
    a.customWidth === b.customWidth &&
    a.customHeight === b.customHeight
  );
}

export function areStringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function areRectsEqual(a?: CanvasRect | null, b?: CanvasRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
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

export type ResolveDisplayEditorOverlayStateParams = StaticOverlayInputs & {
  activeInteraction?: {
    boundaryClamped?: boolean;
    constraintRect: CanvasRect;
    guides: CanvasGuide[];
    rect: CanvasRect;
    regionId?: string;
    type: "drag" | "measure-x" | "measure-y" | "resize";
  } | null;
  distanceLockSession?: CanvasDistanceLockSession | null;
  measurementTargetRegion?: ResolvedDisplayEditorRegion | null;
  selectedRegion: ResolvedDisplayEditorRegion | null;
  selectionFeedbackLabel?: string | null;
  session?: {
    prepare: (inputs: StaticOverlayInputs) => StaticOverlayPreparation;
  } | null;
  temporaryMeasureMode?: boolean;
};

export function prepareStaticOverlayData(
  inputs: StaticOverlayInputs,
  generation: number = 1
): StaticOverlayPreparation {
  const {
    canvasHeight,
    canvasWidth,
    contentOffsetTop = 0,
    lockedRegionIds,
    overlayPreset,
    regions,
    selectedRegion,
    selectedRegionIds,
    shellHeight = canvasHeight
  } = inputs;
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

  const baseFrames: DisplayEditorOverlayFrame[] = regions
    .filter((region) => Boolean(region.geometry))
    .map((region) => ({
      isLocked: lockedRegionIds.includes(region.id),
      isSelected: activeSelectedRegionIds.includes(region.id),
      label: overlayPreset.showRegionLabels ? region.label : null,
      rect: region.geometry!,
      regionId: region.id,
      tone: (selectedRegion?.id === region.id ? "primary" : "secondary") as "primary" | "secondary",
      visible:
        overlayPreset.displayMode === "full-canvas" ||
        activeSelectedRegionIds.includes(region.id)
    }));

  const framesById = new Map<string, DisplayEditorOverlayFrame>();
  for (const frame of baseFrames) {
    framesById.set(frame.regionId, frame);
  }

  return {
    axisTicks: resolveAxisTicks(designMapping, overlayPreset.showAxes),
    baseFrames,
    canvasHeight,
    canvasWidth,
    contentOffsetTop,
    designMapping,
    designSpace,
    framesById,
    generation,
    pageGuides: resolvePageGuides(regions, designMapping, overlayPreset.showCenterLines),
    shellBandGuides: resolveShellBandGuides({
      contentHeight: canvasHeight,
      contentOffsetTop,
      mapping: shellDesignMapping,
      shellHeight
    }),
    shellDesignMapping,
    shellHeight
  };
}

export function composeOverlayFeedback(
  preparation: StaticOverlayPreparation,
  {
    activeInteraction,
    distanceLockSession,
    measurementTargetRegion,
    overlayPreset,
    regions,
    selectedRegion,
    selectedRegionIds,
    selectionFeedbackLabel,
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
    distanceLockSession?: CanvasDistanceLockSession | null;
    measurementTargetRegion?: ResolvedDisplayEditorRegion | null;
    overlayPreset: DisplayEditorOverlayPreset;
    regions: ResolvedDisplayEditorRegion[];
    selectedRegion: ResolvedDisplayEditorRegion | null;
    selectedRegionIds?: string[];
    selectionFeedbackLabel?: string | null;
    temporaryMeasureMode?: boolean;
  }
): DisplayEditorOverlayState {
  const {
    axisTicks,
    baseFrames,
    contentOffsetTop,
    designMapping,
    designSpace,
    framesById: baseFramesById,
    pageGuides,
    shellBandGuides
  } = preparation;

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

  const isActiveDrag =
    activeInteraction != null &&
    Boolean(activeInteraction.regionId) &&
    (activeInteraction.type === "drag" || activeInteraction.type === "resize");

  let frames: DisplayEditorOverlayFrame[];
  let framesById: Map<string, DisplayEditorOverlayFrame>;

  if (isActiveDrag && activeInteraction.regionId) {
    const activeRegionId = activeInteraction.regionId;
    framesById = new Map(baseFramesById);
    frames = baseFrames.map((frame) => {
      if (frame.regionId === activeRegionId) {
        const updatedFrame: DisplayEditorOverlayFrame = {
          ...frame,
          rect: activeInteraction.rect
        };
        framesById.set(activeRegionId, updatedFrame);
        return updatedFrame;
      }
      return frame;
    });
  } else {
    frames = baseFrames;
    framesById = baseFramesById;
  }

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
    axisTicks,
    contentOffsetTop,
    designMapping,
    designSpace,
    displayMode: overlayPreset.displayMode,
    frames,
    framesById,
    measurement: resolveMeasurement(effectiveSelectedRegion, designMapping),
    pageGuides,
    preset: overlayPreset,
    relationalRulers: resolveRelationalRulers(
      effectiveSelectedRegion,
      effectiveMeasurementTargetRegion,
      designMapping
    ),
    selectionBounds,
    selectionLabel:
      selectionFeedbackLabel ??
      (selectionBounds && activeSelectedRegionIds.length > 1 ? `已選 ${activeSelectedRegionIds.length} 區` : null),
    sessionDistanceLock: distanceLockSession
      ? {
          axis: distanceLockSession.axis,
          boundaryClamped: activeInteraction?.boundaryClamped === true,
          distance: distanceLockSession.distance
        }
      : null,
    shellBandGuides,
    snapGuides: activeInteraction?.guides.filter((guide) => Boolean(guide.targetType)) ?? [],
    temporaryMeasureMode,
    temporaryMeasureTargetRegionId: measurementTargetRegion?.id ?? null
  };
}

export function resolveDisplayEditorOverlayState(
  params: ResolveDisplayEditorOverlayStateParams
): DisplayEditorOverlayState {
  const preparation = params.session
    ? params.session.prepare(params)
    : prepareStaticOverlayData(params);
  return composeOverlayFeedback(preparation, params);
}
