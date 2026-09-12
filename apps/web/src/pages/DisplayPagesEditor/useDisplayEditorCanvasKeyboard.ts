import { useEffect } from "react";
import { isDisplayEditorHistoryKey } from "../../hooks/useDisplayEditor";
import { applyCanvasNudge, resolveCanvasNudgeStep } from "./canvasInteractions";
import { applyRegionRect } from "./displayEditorGeometry";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import { resolveRegionConstraint } from "./canvasWorkflowConstraints";

export type UseDisplayEditorCanvasKeyboardParams = {
  applyConfigUpdate: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  editMode: boolean;
  redo: () => void;
  selectedRegion: ResolvedDisplayEditorRegion | null;
  selectedRegionLocked: boolean;
  undo: () => void;
};

export function useDisplayEditorCanvasKeyboard({
  applyConfigUpdate,
  editMode,
  redo,
  selectedRegion,
  selectedRegionLocked,
  undo
}: UseDisplayEditorCanvasKeyboardParams) {
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
}
