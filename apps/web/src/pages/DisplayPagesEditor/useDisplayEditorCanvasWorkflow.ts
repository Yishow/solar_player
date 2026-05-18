import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { isDisplayEditorHistoryKey } from "../../hooks/useDisplayEditor";
import {
  applyCanvasDrag,
  applyCanvasNudge,
  applyCanvasResize,
  panCanvasViewport,
  resolveViewportAfterZoom,
  type CanvasRect,
  type CanvasResizeHandle
} from "./canvasInteractions";
import { applyRegionRect } from "./displayEditorGeometry";
import { isRegionLocked } from "./displayEditorRegionState";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

const EDITOR_PREVIEW_SCALE = 0.5;
const EDITOR_PREVIEW_SURFACE_HEIGHT = 934;
const EDITOR_PREVIEW_SURFACE_WIDTH = 1920;
const EDITOR_PREVIEW_VIEWPORT_HEIGHT = Math.round(EDITOR_PREVIEW_SURFACE_HEIGHT * EDITOR_PREVIEW_SCALE);
const EDITOR_PREVIEW_VIEWPORT_WIDTH = Math.round(EDITOR_PREVIEW_SURFACE_WIDTH * EDITOR_PREVIEW_SCALE);

export { EDITOR_PREVIEW_SURFACE_HEIGHT, EDITOR_PREVIEW_SURFACE_WIDTH, EDITOR_PREVIEW_VIEWPORT_HEIGHT, EDITOR_PREVIEW_VIEWPORT_WIDTH };

type CanvasInteractionState = {
  handle?: CanvasResizeHandle;
  origin: { x: number; y: number };
  regionId: string;
  startConfig: Record<string, unknown>;
  startRect: CanvasRect;
  type: "drag" | "resize";
};

export function useDisplayEditorCanvasWorkflow({
  applyConfigUpdate,
  canRedo,
  canUndo,
  config,
  editMode,
  lockedRegionIds,
  redo,
  selectedRegion,
  undo,
  regions
}: {
  applyConfigUpdate: (
    nextValue: Record<string, unknown> | ((current: Record<string, unknown>) => Record<string, unknown>),
    options?: { historyBase?: Record<string, unknown>; recordHistory?: boolean }
  ) => void;
  canRedo: boolean;
  canUndo: boolean;
  config: Record<string, unknown>;
  editMode: boolean;
  lockedRegionIds: string[];
  redo: () => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegion: ResolvedDisplayEditorRegion | null;
  undo: () => void;
}) {
  const [viewport, setViewport] = useState({ offsetX: 0, offsetY: 0, zoom: 1 });
  const [canvasInteraction, setCanvasInteraction] = useState<CanvasInteractionState | null>(null);
  const selectedRegionLocked = isRegionLocked(lockedRegionIds, selectedRegion?.id);

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
        event.altKey ||
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
      const result = applyCanvasNudge(
        selectedRegion.geometry,
        directionByKey[event.key as keyof typeof directionByKey],
        event.shiftKey ? 10 : 1,
        {
          canvasHeight: EDITOR_PREVIEW_SURFACE_HEIGHT,
          canvasWidth: EDITOR_PREVIEW_SURFACE_WIDTH,
          minHeight: selectedRegion.schema.geometry?.minHeight ?? 40,
          minWidth: selectedRegion.schema.geometry?.minWidth ?? 40
        }
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

      const delta = {
        x: Math.round((event.clientX - activeInteraction.origin.x) / EDITOR_PREVIEW_SCALE),
        y: Math.round((event.clientY - activeInteraction.origin.y) / EDITOR_PREVIEW_SCALE)
      };
      const constraint = {
        canvasHeight: EDITOR_PREVIEW_SURFACE_HEIGHT,
        canvasWidth: EDITOR_PREVIEW_SURFACE_WIDTH,
        minHeight: schema.minHeight ?? 40,
        minWidth: schema.minWidth ?? 40
      };
      const interactionResult =
        activeInteraction.type === "resize" && activeInteraction.handle
          ? applyCanvasResize(activeInteraction.startRect, activeInteraction.handle, delta, constraint)
          : applyCanvasDrag(activeInteraction.startRect, delta, constraint);

      applyConfigUpdate((current) => applyRegionRect(current, region, interactionResult.rect), {
        recordHistory: false
      });
    };

    const handlePointerUp = () => {
      applyConfigUpdate((current) => current, {
        historyBase: activeInteraction.startConfig
      });
      setCanvasInteraction(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [applyConfigUpdate, canvasInteraction, lockedRegionIds, regions]);

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
        label: "Zoom -"
      },
      {
        action: () =>
          setViewport((current) =>
            resolveViewportAfterZoom(current, current.zoom + 0.1, {
              x: EDITOR_PREVIEW_VIEWPORT_WIDTH / 2,
              y: EDITOR_PREVIEW_VIEWPORT_HEIGHT / 2
            })
          ),
        label: "Zoom +"
      },
      { action: () => setViewport({ offsetX: 0, offsetY: 0, zoom: 1 }), label: "Reset View" },
      { action: () => setViewport((current) => panCanvasViewport(current, { x: 40, y: 0 })), label: "Pan Left" },
      { action: () => setViewport((current) => panCanvasViewport(current, { x: -40, y: 0 })), label: "Pan Right" },
      { action: () => undo(), disabled: !canUndo, label: "Undo" },
      { action: () => redo(), disabled: !canRedo, label: "Redo" }
    ],
    [canRedo, canUndo, redo, undo]
  );

  return {
    onStartInteraction: (
      event: ReactPointerEvent<HTMLButtonElement>,
      region: ResolvedDisplayEditorRegion,
      type: "drag" | "resize"
    ) => {
      if (!region.geometry || isRegionLocked(lockedRegionIds, region.id)) {
        return;
      }

      setCanvasInteraction({
        handle: type === "resize" ? "se" : undefined,
        origin: { x: event.clientX, y: event.clientY },
        regionId: region.id,
        startConfig: config,
        startRect: region.geometry,
        type
      });
    },
    viewport,
    viewportControls
  };
}
