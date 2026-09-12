import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CanvasDistanceLockSession,
  panCanvasViewport,
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
import { useDisplayEditorCanvasKeyboard } from "./useDisplayEditorCanvasKeyboard";
import { createCanvasOverlaySession, type CanvasOverlaySession } from "./canvasOverlaySession";
import { isDisplayEditorProfilingEnabled, measureDisplayEditorScope } from "./displayEditorProfiler";
import { applyRegionRect } from "./displayEditorGeometry";
import { isRegionLocked } from "./displayEditorRegionState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { localizeDisplayEditorLabel } from "./localization";

import {
  EDITOR_PREVIEW_CONTENT_TOP,
  EDITOR_PREVIEW_SCALE,
  EDITOR_PREVIEW_SHELL_HEIGHT,
  EDITOR_PREVIEW_SURFACE_HEIGHT,
  EDITOR_PREVIEW_SURFACE_WIDTH,
  EDITOR_PREVIEW_VIEWPORT_HEIGHT,
  EDITOR_PREVIEW_VIEWPORT_WIDTH,
  computeCanvasInteractionResult,
  constraintToRect,
  createInteractionFeedback,
  resolveRegionConstraint,
  resolveSnapOptions,
  type CanvasInteractionFeedback,
  type CanvasInteractionState
} from "./canvasWorkflowConstraints";

export {
  EDITOR_PREVIEW_CONTENT_TOP,
  EDITOR_PREVIEW_SHELL_HEIGHT,
  EDITOR_PREVIEW_SURFACE_HEIGHT,
  EDITOR_PREVIEW_SURFACE_WIDTH,
  EDITOR_PREVIEW_VIEWPORT_HEIGHT,
  EDITOR_PREVIEW_VIEWPORT_WIDTH
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
  const displayEditorProfilingEnabled = useMemo(() => isDisplayEditorProfilingEnabled(), []);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const containerScaleRef = useRef(canvasContainerScale);
  containerScaleRef.current = canvasContainerScale;
  const regionsRef = useRef(regions);
  regionsRef.current = regions;
  const overlayPresetRef = useRef(overlayPreset);
  overlayPresetRef.current = overlayPreset;
  const lockedRegionIdsRef = useRef(lockedRegionIds);
  lockedRegionIdsRef.current = lockedRegionIds;
  const pendingDragCommitRef = useRef<{ region: ResolvedDisplayEditorRegion; rect: CanvasRect } | null>(null);
  const sessionSnapOptionsRef = useRef<CanvasSnapOptions | undefined>(undefined);
  const dragAnimationFrameRef = useRef<number | null>(null);
  const latestInteractionFeedbackRef = useRef<CanvasInteractionFeedback | null>(null);
  const dragSessionGenerationRef = useRef(0);
  const overlaySessionRef = useRef<CanvasOverlaySession | null>(null);
  if (!overlaySessionRef.current) {
    overlaySessionRef.current = createCanvasOverlaySession();
  }
  const applyConfigUpdateRef = useRef(applyConfigUpdate);
  applyConfigUpdateRef.current = applyConfigUpdate;
  const selectedRegionLocked = isRegionLocked(lockedRegionIds, selectedRegion?.id);
  const temporaryMeasureTargetRegion = useMemo(
    () => regions.find((region) => region.id === temporaryMeasureTargetRegionId) ?? null,
    [regions, temporaryMeasureTargetRegionId]
  );

  const resetPendingDragSchedule = useCallback(() => {
    dragSessionGenerationRef.current += 1;
    if (dragAnimationFrameRef.current !== null) {
      cancelAnimationFrame(dragAnimationFrameRef.current);
      dragAnimationFrameRef.current = null;
    }
    latestInteractionFeedbackRef.current = null;
    pendingDragCommitRef.current = null;
  }, []);

  useEffect(() => {
    writeStoredDisplayEditorOverlayPreset(overlayPreset);
  }, [overlayPreset]);

  useEffect(() => {
    if (!editMode) {
      resetPendingDragSchedule();
      overlaySessionRef.current?.invalidate();
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
      setDistanceLockArmed(false);
      setTemporaryMeasureMode(false);
      setTemporaryMeasureTargetRegionId(null);
    }
  }, [editMode, resetPendingDragSchedule]);

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

  useDisplayEditorCanvasKeyboard({
    applyConfigUpdate,
    editMode,
    redo,
    selectedRegion,
    selectedRegionLocked,
    undo
  });

  useEffect(() => {
    if (!canvasInteraction) {
      return;
    }

    const activeInteraction = canvasInteraction;
    resetPendingDragSchedule();
    sessionSnapOptionsRef.current = resolveSnapOptions(
      activeInteraction.regionId,
      regionsRef.current,
      overlayPresetRef.current
    );
    const handlePointerMove = (event: PointerEvent) => {
      const region = regionsRef.current.find((item) => item.id === activeInteraction.regionId);
      const schema = region?.schema.geometry;
      if (!region?.geometry || !schema || isRegionLocked(lockedRegionIdsRef.current, region.id)) {
        return;
      }

      const effectiveScale = EDITOR_PREVIEW_SCALE * viewportRef.current.zoom * containerScaleRef.current;
      const delta = {
        x: Math.round((event.clientX - activeInteraction.origin.x) / effectiveScale),
        y: Math.round((event.clientY - activeInteraction.origin.y) / effectiveScale)
      };
      const constraint = resolveRegionConstraint(region);
      const interactionResult = computeCanvasInteractionResult({
        activeInteraction,
        delta,
        constraint,
        snap: sessionSnapOptionsRef.current,
        schema
      });

      const nextFeedback = createInteractionFeedback(interactionResult, constraint, region.id, activeInteraction.type);
      latestInteractionFeedbackRef.current = nextFeedback;
      pendingDragCommitRef.current = { rect: interactionResult.rect, region };

      const currentGeneration = dragSessionGenerationRef.current;
      if (dragAnimationFrameRef.current === null) {
        dragAnimationFrameRef.current = requestAnimationFrame(() => {
          dragAnimationFrameRef.current = null;
          if (dragSessionGenerationRef.current === currentGeneration && latestInteractionFeedbackRef.current) {
            setCanvasInteractionFeedback(latestInteractionFeedbackRef.current);
          }
        });
      }
    };

    const handlePointerUp = () => {
      const pendingCommit = pendingDragCommitRef.current;
      resetPendingDragSchedule();

      if (pendingCommit) {
        applyConfigUpdateRef.current((current) => applyRegionRect(current, pendingCommit.region, pendingCommit.rect), {
          historyBase: activeInteraction.startConfig
        });
      }
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
      setDistanceLockArmed(false);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      resetPendingDragSchedule();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      sessionSnapOptionsRef.current = undefined;
    };
  }, [canvasInteraction, resetPendingDragSchedule]);

  useEffect(() => {
    if (!canvasInteraction) {
      return;
    }
    const targetRegion = regions.find((r) => r.id === canvasInteraction.regionId);
    if (!targetRegion || !targetRegion.geometry || isRegionLocked(lockedRegionIds, canvasInteraction.regionId)) {
      resetPendingDragSchedule();
      setCanvasInteraction(null);
      setCanvasInteractionFeedback(null);
    }
  }, [canvasInteraction, lockedRegionIds, regions, resetPendingDragSchedule]);

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
      measureDisplayEditorScope(
        "overlay-resolve",
        () =>
          resolveDisplayEditorOverlayState({
            activeInteraction: canvasInteractionFeedback,
            canvasHeight: EDITOR_PREVIEW_SURFACE_HEIGHT,
            canvasWidth: EDITOR_PREVIEW_SURFACE_WIDTH,
            contentOffsetTop: EDITOR_PREVIEW_CONTENT_TOP,
            distanceLockSession: canvasInteraction?.distanceLock ?? null,
            lockedRegionIds,
            measurementTargetRegion: temporaryMeasureTargetRegion,
            overlayPreset,
            regions,
            selectedRegion,
            selectedRegionIds,
            selectionFeedbackLabel,
            session: overlaySessionRef.current,
            shellHeight: EDITOR_PREVIEW_SHELL_HEIGHT,
            temporaryMeasureMode,
            viewport
          }),
        { enabled: displayEditorProfilingEnabled }
      ),
    [
      canvasInteraction?.distanceLock,
      canvasInteractionFeedback,
      displayEditorProfilingEnabled,
      lockedRegionIds,
      overlayPreset,
      regions,
      selectedRegion,
      selectedRegionIds,
      selectionFeedbackLabel,
      temporaryMeasureMode,
      temporaryMeasureTargetRegion,
      viewport
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
        regionId: region.id,
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
        regionId: selectedRegion.id,
        type: axis === "x" ? "measure-x" : "measure-y"
      });
    },
    onZoomDelta,
    setDistanceLockArmed, setOverlayPreset, setTemporaryMeasureMode,
    temporaryMeasureMode, temporaryMeasureTargetRegionId, viewport, viewportControls
  };
}
