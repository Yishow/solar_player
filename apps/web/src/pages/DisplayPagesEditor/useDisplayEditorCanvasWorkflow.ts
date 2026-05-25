import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDisplayEditorHistoryKey } from "../../hooks/useDisplayEditor";
import {
  type CanvasDistanceLockSession,
  applyCanvasDrag,
  applyCanvasNudge,
  applyCanvasResize,
  applyMeasurementHandleDrag,
  panCanvasViewport,
  resolveCanvasNudgeStep,
  resolveDistanceLockSession,
  resolveViewportAfterZoom,
  type CanvasSnapOptions,
  type CanvasSnapTarget,
  type CanvasGuide,
  type CanvasRect,
  type CanvasResizeHandle
} from "./canvasInteractions";
import {
  resolveDisplayEditorOverlayState,
  resolveInitialDisplayEditorOverlayPreset,
  writeStoredDisplayEditorOverlayPreset,
  type DisplayEditorOverlayPreset
} from "./canvasOverlayState";
import { applyRegionRect } from "./displayEditorGeometry";
import { isRegionLocked } from "./displayEditorRegionState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";

const EDITOR_PREVIEW_SCALE = 0.5;
const EDITOR_PREVIEW_CONTENT_TOP = 146;
const EDITOR_PREVIEW_SHELL_HEIGHT = 1080;
const EDITOR_PREVIEW_SURFACE_HEIGHT = 934;
const EDITOR_PREVIEW_SURFACE_WIDTH = 1920;
const EDITOR_PREVIEW_VIEWPORT_HEIGHT = Math.round(EDITOR_PREVIEW_SHELL_HEIGHT * EDITOR_PREVIEW_SCALE);
const EDITOR_PREVIEW_VIEWPORT_WIDTH = Math.round(EDITOR_PREVIEW_SURFACE_WIDTH * EDITOR_PREVIEW_SCALE);

export {
  EDITOR_PREVIEW_CONTENT_TOP,
  EDITOR_PREVIEW_SHELL_HEIGHT,
  EDITOR_PREVIEW_SURFACE_HEIGHT,
  EDITOR_PREVIEW_SURFACE_WIDTH,
  EDITOR_PREVIEW_VIEWPORT_HEIGHT,
  EDITOR_PREVIEW_VIEWPORT_WIDTH
};

function resolveRegionConstraint(region: ResolvedDisplayEditorRegion) {
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

function constraintToRect(constraint: ReturnType<typeof resolveRegionConstraint>): CanvasRect {
  return {
    height: constraint.canvasHeight,
    left: constraint.originLeft,
    top: constraint.originTop,
    width: constraint.canvasWidth
  };
}

function resolveCanvasSnapTargets(
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

function resolveSnapOptions(
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

type CanvasInteractionState = {
  distanceLock: CanvasDistanceLockSession | null;
  handle?: CanvasResizeHandle;
  origin: { x: number; y: number };
  regionId: string;
  startConfig: Record<string, unknown>;
  startRect: CanvasRect;
  type: "drag" | "measure-x" | "measure-y" | "resize";
};

type CanvasInteractionFeedback = {
  boundaryClamped?: boolean;
  constraintRect: CanvasRect;
  guides: CanvasGuide[];
  rect: CanvasRect;
  type: "drag" | "measure-x" | "measure-y" | "resize";
};

export function useDisplayEditorCanvasWorkflow({
  applyConfigUpdate,
  canRedo,
  canUndo,
  canvasContainerScale = 1,
  config,
  editMode,
  distanceLockTargetRegion,
  lockedRegionIds,
  redo,
  selectedRegion,
  selectedRegionIds,
  selectionFeedbackLabel,
  undo,
  regions
}: {
  applyConfigUpdate: (
    nextValue: Record<string, unknown> | ((current: Record<string, unknown>) => Record<string, unknown>),
    options?: { historyBase?: Record<string, unknown>; recordHistory?: boolean }
  ) => void;
  canRedo: boolean;
  canUndo: boolean;
  canvasContainerScale?: number;
  config: Record<string, unknown>;
  distanceLockTargetRegion: ResolvedDisplayEditorRegion | null;
  editMode: boolean;
  lockedRegionIds: string[];
  redo: () => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegion: ResolvedDisplayEditorRegion | null;
  selectedRegionIds: string[];
  selectionFeedbackLabel: string | null;
  undo: () => void;
}) {
  const [viewport, setViewport] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const [canvasInteraction, setCanvasInteraction] = useState<CanvasInteractionState | null>(null);
  const [canvasInteractionFeedback, setCanvasInteractionFeedback] = useState<CanvasInteractionFeedback | null>(null);
  const [overlayPreset, setOverlayPreset] = useState<DisplayEditorOverlayPreset>(() =>
    resolveInitialDisplayEditorOverlayPreset()
  );
  const [distanceLockArmed, setDistanceLockArmed] = useState(false);
  const [temporaryMeasureMode, setTemporaryMeasureMode] = useState(false);
  const [temporaryMeasureTargetRegionId, setTemporaryMeasureTargetRegionId] = useState<string | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const containerScaleRef = useRef(canvasContainerScale);
  containerScaleRef.current = canvasContainerScale;
  const selectedRegionLocked = isRegionLocked(lockedRegionIds, selectedRegion?.id);
  const temporaryMeasureTargetRegion = useMemo(
    () => regions.find((region) => region.id === temporaryMeasureTargetRegionId) ?? null,
    [regions, temporaryMeasureTargetRegionId]
  );

  useEffect(() => {
    writeStoredDisplayEditorOverlayPreset(overlayPreset);
  }, [overlayPreset]);

  useEffect(() => {
    if (!editMode) {
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
      setDistanceLockArmed(false);
      setTemporaryMeasureMode(false);
      setTemporaryMeasureTargetRegionId(null);
    }
  }, [editMode]);

  useEffect(() => {
    if (
      !selectedRegion?.geometry ||
      !temporaryMeasureTargetRegion?.geometry ||
      temporaryMeasureTargetRegion.id === selectedRegion.id
    ) {
      setTemporaryMeasureTargetRegionId(null);
    }
  }, [selectedRegion, temporaryMeasureTargetRegion]);

  useEffect(() => {
    if (!selectedRegion?.geometry || !distanceLockTargetRegion?.geometry || selectedRegionIds.length !== 2) {
      setDistanceLockArmed(false);
    }
  }, [distanceLockTargetRegion, selectedRegion, selectedRegionIds]);

  useEffect(() => {
    if (!editMode || !selectedRegion?.geometry || selectedRegionLocked) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (
        !selectedRegion.geometry ||
        !["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key) ||
        target?.matches("input, textarea, select") ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const directionByKey = {
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up"
      } as const;
      const nudgeStep = resolveCanvasNudgeStep({
        altKey: event.altKey,
        shiftKey: event.shiftKey
      });
      const result = applyCanvasNudge(
        selectedRegion.geometry,
        directionByKey[event.key as keyof typeof directionByKey],
        nudgeStep.step,
        resolveRegionConstraint(selectedRegion)
      );

      event.preventDefault();
      applyConfigUpdate((current) => applyRegionRect(current, selectedRegion, result.rect));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyConfigUpdate, editMode, selectedRegion, selectedRegionLocked]);

  useEffect(() => {
    if (!editMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const action = isDisplayEditorHistoryKey({
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        targetTagName: target?.tagName
      });

      if (!action) {
        return;
      }

      event.preventDefault();
      if (action === "undo") {
        undo();
        return;
      }
      redo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editMode, redo, undo]);

  useEffect(() => {
    if (!canvasInteraction) {
      return;
    }

    const activeInteraction = canvasInteraction;
    const handlePointerMove = (event: PointerEvent) => {
      const region = regions.find((item) => item.id === activeInteraction.regionId);
      const schema = region?.schema.geometry;
      if (!region?.geometry || !schema || isRegionLocked(lockedRegionIds, region.id)) {
        return;
      }

      const effectiveScale = EDITOR_PREVIEW_SCALE * viewportRef.current.zoom * containerScaleRef.current;
      const delta = {
        x: Math.round((event.clientX - activeInteraction.origin.x) / effectiveScale),
        y: Math.round((event.clientY - activeInteraction.origin.y) / effectiveScale)
      };
      const constraint = resolveRegionConstraint(region);
      const snap = resolveSnapOptions(region.id, regions, overlayPreset);
      const interactionResult =
        activeInteraction.type === "resize" && activeInteraction.handle
          ? applyCanvasResize(
              activeInteraction.startRect,
              activeInteraction.handle,
              delta,
              constraint,
              snap,
              activeInteraction.distanceLock
            )
          : activeInteraction.type === "measure-x" || activeInteraction.type === "measure-y"
            ? applyMeasurementHandleDrag(
                activeInteraction.startRect,
                activeInteraction.type === "measure-x" ? "x" : "y",
                activeInteraction.type === "measure-x" ? delta.x : delta.y,
                constraint
              )
          : applyCanvasDrag(activeInteraction.startRect, delta, constraint, snap, activeInteraction.distanceLock);

      setCanvasInteractionFeedback({
        boundaryClamped: interactionResult.boundaryClamped,
        constraintRect: constraintToRect(constraint),
        guides: interactionResult.guides,
        rect: interactionResult.rect,
        type: activeInteraction.type
      });

      applyConfigUpdate((current) => applyRegionRect(current, region, interactionResult.rect), {
        recordHistory: false
      });
    };

    const handlePointerUp = () => {
      applyConfigUpdate((current) => current, {
        historyBase: activeInteraction.startConfig
      });
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
      setDistanceLockArmed(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [applyConfigUpdate, canvasInteraction, lockedRegionIds, overlayPreset, regions]);

  useEffect(() => {
    if (selectedRegionLocked && canvasInteraction) {
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
    }
  }, [canvasInteraction, selectedRegionLocked]);

  const viewportControls = useMemo(
    () => [
      {
        action: () =>
          setViewport((current) =>
            resolveViewportAfterZoom(current, current.zoom - 0.1, {
              x: EDITOR_PREVIEW_VIEWPORT_WIDTH / 2,
              y: EDITOR_PREVIEW_VIEWPORT_HEIGHT / 2
            })
          ),
        label: localizeDisplayEditorLabel("Zoom -")
      },
      {
        action: () =>
          setViewport((current) =>
            resolveViewportAfterZoom(current, current.zoom + 0.1, {
              x: EDITOR_PREVIEW_VIEWPORT_WIDTH / 2,
              y: EDITOR_PREVIEW_VIEWPORT_HEIGHT / 2
            })
          ),
        label: localizeDisplayEditorLabel("Zoom +")
      },
      {
        action: () => setViewport({ offsetX: 0, offsetY: 0, zoom: 1 }),
        label: localizeDisplayEditorLabel("Reset View")
      },
      {
        action: () => setViewport((current) => panCanvasViewport(current, { x: 40, y: 0 })),
        label: localizeDisplayEditorLabel("Pan Left")
      },
      {
        action: () => setViewport((current) => panCanvasViewport(current, { x: -40, y: 0 })),
        label: localizeDisplayEditorLabel("Pan Right")
      },
      { action: () => undo(), disabled: !canUndo, label: localizeDisplayEditorLabel("Undo") },
      { action: () => redo(), disabled: !canRedo, label: localizeDisplayEditorLabel("Redo") }
    ],
    [canRedo, canUndo, redo, undo]
  );

  const onZoomDelta = useCallback(
    (delta: number, focusPoint: { x: number; y: number }) => {
      setViewport((current) => resolveViewportAfterZoom(current, current.zoom + delta, focusPoint));
    },
    []
  );

  const overlayState = useMemo(
    () =>
      resolveDisplayEditorOverlayState({
        activeInteraction: canvasInteractionFeedback,
        canvasHeight: EDITOR_PREVIEW_SURFACE_HEIGHT,
        canvasWidth: EDITOR_PREVIEW_SURFACE_WIDTH,
        distanceLockSession: canvasInteraction?.distanceLock ?? null,
        lockedRegionIds,
        measurementTargetRegion: temporaryMeasureTargetRegion,
        overlayPreset,
        regions,
        selectedRegion,
        selectedRegionIds,
        selectionFeedbackLabel,
        temporaryMeasureMode
      }),
    [
      canvasInteraction?.distanceLock,
      canvasInteractionFeedback,
      lockedRegionIds,
      overlayPreset,
      regions,
      selectedRegion,
      selectedRegionIds,
      selectionFeedbackLabel,
      temporaryMeasureMode,
      temporaryMeasureTargetRegion
    ]
  );

  return {
    overlayPreset,
    overlayState,
    distanceLockArmed,
    onSelectTemporaryMeasureTarget: (regionId: string) => {
      if (!selectedRegion || regionId === selectedRegion.id) {
        return;
      }

      setTemporaryMeasureTargetRegionId(regionId);
      setTemporaryMeasureMode(false);
    },
    onStartInteraction: (
      event: ReactPointerEvent<HTMLButtonElement>,
      region: ResolvedDisplayEditorRegion,
      type: "drag" | "resize"
    ) => {
      if (!region.geometry || isRegionLocked(lockedRegionIds, region.id)) {
        return;
      }

      const constraint = resolveRegionConstraint(region);
      const distanceLock =
        distanceLockArmed && distanceLockTargetRegion?.geometry
          ? resolveDistanceLockSession(region.geometry, distanceLockTargetRegion.geometry)
          : null;
      setCanvasInteraction({
        distanceLock,
        handle: type === "resize" ? "se" : undefined,
        origin: { x: event.clientX, y: event.clientY },
        regionId: region.id,
        startConfig: config,
        startRect: region.geometry,
        type
      });
      setCanvasInteractionFeedback({
        constraintRect: constraintToRect(constraint),
        guides: [],
        rect: region.geometry,
        type
      });
      setDistanceLockArmed(false);
    },
    onStartMeasurementHandleDrag: (
      event: ReactPointerEvent<HTMLButtonElement>,
      axis: "x" | "y"
    ) => {
      if (!selectedRegion?.geometry || !temporaryMeasureTargetRegion?.geometry || selectedRegionLocked) {
        return;
      }

      const constraint = resolveRegionConstraint(selectedRegion);
      setCanvasInteraction({
        distanceLock: null,
        origin: { x: event.clientX, y: event.clientY },
        regionId: selectedRegion.id,
        startConfig: config,
        startRect: selectedRegion.geometry,
        type: axis === "x" ? "measure-x" : "measure-y"
      });
      setCanvasInteractionFeedback({
        constraintRect: constraintToRect(constraint),
        guides: [],
        rect: selectedRegion.geometry,
        type: axis === "x" ? "measure-x" : "measure-y"
      });
    },
    onZoomDelta,
    setDistanceLockArmed,
    setOverlayPreset,
    setTemporaryMeasureMode,
    temporaryMeasureMode,
    temporaryMeasureTargetRegionId,
    viewport,
    viewportControls
  };
}
