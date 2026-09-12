import {
  applyCanvasDrag,
  applyCanvasResize,
  applyMeasurementHandleDrag,
  type CanvasDistanceLockSession,
  type CanvasGuide,
  type CanvasRect,
  type CanvasResizeHandle,
  type CanvasResizeMode,
  type CanvasSnapOptions,
  type CanvasSnapTarget
} from "./canvasInteractions";
import type { DisplayEditorOverlayPreset } from "./canvasOverlayState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export const EDITOR_PREVIEW_SCALE = 0.5;
export const EDITOR_PREVIEW_CONTENT_TOP = 110;
export const EDITOR_PREVIEW_SHELL_HEIGHT = 1080;
export const EDITOR_PREVIEW_SURFACE_HEIGHT = 898;
export const EDITOR_PREVIEW_SURFACE_WIDTH = 1920;
export const EDITOR_PREVIEW_VIEWPORT_HEIGHT = Math.round(EDITOR_PREVIEW_SHELL_HEIGHT * EDITOR_PREVIEW_SCALE);
export const EDITOR_PREVIEW_VIEWPORT_WIDTH = Math.round(EDITOR_PREVIEW_SURFACE_WIDTH * EDITOR_PREVIEW_SCALE);

export function resolveRegionConstraint(region: ResolvedDisplayEditorRegion) {
  const schema = region.schema.geometry;
  const boundary = region.geometryConstraint;

  return {
    canvasHeight: boundary?.height ?? EDITOR_PREVIEW_SURFACE_HEIGHT,
    canvasWidth: boundary?.width ?? EDITOR_PREVIEW_SURFACE_WIDTH,
    minHeight: schema?.minHeight ?? 40,
    minWidth: schema?.minWidth ?? 40,
    originLeft: boundary?.left ?? 0,
    originTop: boundary?.top ?? 0
  };
}

export function constraintToRect(constraint: ReturnType<typeof resolveRegionConstraint>): CanvasRect {
  return {
    height: constraint.canvasHeight,
    left: constraint.originLeft,
    top: constraint.originTop,
    width: constraint.canvasWidth
  };
}

export function resolveCanvasSnapTargets(
  activeRegionId: string,
  regions: ResolvedDisplayEditorRegion[],
  overlayPreset: DisplayEditorOverlayPreset
): CanvasSnapTarget[] {
  const targets: CanvasSnapTarget[] = [];

  if (overlayPreset.snapCenterLines) {
    targets.push(
      { axis: "x", position: EDITOR_PREVIEW_SURFACE_WIDTH / 2, type: "center-line" },
      { axis: "y", position: EDITOR_PREVIEW_SURFACE_HEIGHT / 2, type: "center-line" }
    );
  }

  for (const region of regions) {
    if (!region.geometry || region.id === activeRegionId) {
      continue;
    }

    if (overlayPreset.snapGuides && !region.parentId) {
      targets.push(
        { axis: "x", position: region.geometry.left, type: "guide" },
        { axis: "x", position: region.geometry.left + region.geometry.width, type: "guide" },
        { axis: "y", position: region.geometry.top, type: "guide" },
        { axis: "y", position: region.geometry.top + region.geometry.height, type: "guide" }
      );
    }

    if (overlayPreset.snapRegionEdges) {
      targets.push(
        { axis: "x", position: region.geometry.left, type: "region-edge" },
        { axis: "x", position: region.geometry.left + region.geometry.width, type: "region-edge" },
        { axis: "y", position: region.geometry.top, type: "region-edge" },
        { axis: "y", position: region.geometry.top + region.geometry.height, type: "region-edge" }
      );
    }

    if (overlayPreset.snapRegionCenters) {
      targets.push(
        { axis: "x", position: region.geometry.left + region.geometry.width / 2, type: "region-center" },
        { axis: "y", position: region.geometry.top + region.geometry.height / 2, type: "region-center" }
      );
    }
  }

  return targets;
}

export function resolveSnapOptions(
  activeRegionId: string,
  regions: ResolvedDisplayEditorRegion[],
  overlayPreset: DisplayEditorOverlayPreset
): CanvasSnapOptions | undefined {
  if (!overlayPreset.snapEnabled) {
    return undefined;
  }

  return {
    enabled: true,
    targets: resolveCanvasSnapTargets(activeRegionId, regions, overlayPreset),
    threshold: 16
  };
}

export type CanvasInteractionState = {
  distanceLock: CanvasDistanceLockSession | null;
  handle?: CanvasResizeHandle;
  origin: { x: number; y: number };
  regionId: string;
  startConfig: Record<string, unknown>;
  startRect: CanvasRect;
  type: "drag" | "measure-x" | "measure-y" | "resize";
};

export type CanvasInteractionFeedback = {
  boundaryClamped?: boolean;
  constraintRect: CanvasRect;
  guides: CanvasGuide[];
  rect: CanvasRect;
  regionId: string;
  type: "drag" | "measure-x" | "measure-y" | "resize";
};

export function computeCanvasInteractionResult({
  activeInteraction,
  delta,
  constraint,
  snap,
  schema
}: {
  activeInteraction: CanvasInteractionState;
  delta: { x: number; y: number };
  constraint: ReturnType<typeof resolveRegionConstraint>;
  snap?: CanvasSnapOptions;
  schema?: { resizeMode?: CanvasResizeMode };
}) {
  if (activeInteraction.type === "resize" && activeInteraction.handle) {
    return applyCanvasResize(
      activeInteraction.startRect,
      activeInteraction.handle,
      delta,
      constraint,
      snap,
      activeInteraction.distanceLock,
      schema?.resizeMode
    );
  }
  if (activeInteraction.type === "measure-x" || activeInteraction.type === "measure-y") {
    return applyMeasurementHandleDrag(
      activeInteraction.startRect,
      activeInteraction.type === "measure-x" ? "x" : "y",
      activeInteraction.type === "measure-x" ? delta.x : delta.y,
      constraint
    );
  }
  return applyCanvasDrag(activeInteraction.startRect, delta, constraint, snap, activeInteraction.distanceLock);
}

export function createInteractionFeedback(
  result: ReturnType<typeof computeCanvasInteractionResult>,
  constraint: ReturnType<typeof resolveRegionConstraint>,
  regionId: string,
  type: CanvasInteractionFeedback["type"]
): CanvasInteractionFeedback {
  return {
    boundaryClamped: result.boundaryClamped,
    constraintRect: constraintToRect(constraint),
    guides: result.guides,
    rect: result.rect,
    regionId,
    type
  };
}
