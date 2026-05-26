import React, { useEffect, useRef } from "react";
import type { ShellDecorationChannel, ShellDecorationObject } from "@solar-display/shared";
import { defaultBrandView } from "../../hooks/useBrandAssets";
import { AppFooterNav } from "../../components/AppFooterNav";
import { AppHeader } from "../../components/AppHeader";
import type { CanvasResizeHandle } from "../DisplayPagesEditor/canvasInteractions";
import {
  applyShellCanvasDrag,
  applyShellCanvasResize,
  resolveShellCanvasMeasurements,
  SHELL_CANVAS_FOOTER_HEIGHT,
  SHELL_CANVAS_HEADER_HEIGHT,
  SHELL_CANVAS_SURFACE_HEIGHT,
  SHELL_CANVAS_SURFACE_WIDTH
} from "./canvasAuthoring";

const PREVIEW_SCALE = 0.5;

function resolveObjectPreviewFrame(object: ShellDecorationObject) {
  const topOffset = object.mount === "footer" ? SHELL_CANVAS_SURFACE_HEIGHT - SHELL_CANVAS_FOOTER_HEIGHT : 0;

  return {
    height: object.frame.height * PREVIEW_SCALE,
    left: object.frame.left * PREVIEW_SCALE,
    top: (topOffset + object.frame.top) * PREVIEW_SCALE,
    width: object.frame.width * PREVIEW_SCALE
  };
}

type ShellCanvasInteraction = {
  handle?: CanvasResizeHandle;
  object: ShellDecorationObject;
  pointerX: number;
  pointerY: number;
};

export function ShellDecorationPreviewCanvas({
  channel,
  onSelectObject,
  onUpdateObjectFrame,
  selectedObjectId
}: {
  channel: ShellDecorationChannel;
  onSelectObject?: (objectId: string) => void;
  onUpdateObjectFrame?: (objectId: string, frame: ShellDecorationObject["frame"]) => void;
  selectedObjectId: string | null;
}) {
  const interactionRef = useRef<ShellCanvasInteraction | null>(null);
  const allObjects = [...channel.headerObjects, ...channel.footerObjects];
  const selectedObject = selectedObjectId
    ? allObjects.find((object) => object.id === selectedObjectId) ?? null
    : null;
  const selectedMeasurements = selectedObject
    ? resolveShellCanvasMeasurements(selectedObject.frame, selectedObject.mount)
    : null;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || !onUpdateObjectFrame) {
        return;
      }

      const delta = {
        x: (event.clientX - interaction.pointerX) / PREVIEW_SCALE,
        y: (event.clientY - interaction.pointerY) / PREVIEW_SCALE
      };
      const nextObject = interaction.handle
        ? applyShellCanvasResize(interaction.object, interaction.handle, delta)
        : applyShellCanvasDrag(interaction.object, delta);
      onUpdateObjectFrame(interaction.object.id, nextObject.frame);
    };

    const handlePointerUp = () => {
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onUpdateObjectFrame]);

  const beginInteraction = (
    event: React.PointerEvent,
    object: ShellDecorationObject,
    handle?: CanvasResizeHandle
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectObject?.(object.id);
    if (object.locked || !onUpdateObjectFrame) {
      return;
    }

    interactionRef.current = {
      handle,
      object,
      pointerX: event.clientX,
      pointerY: event.clientY
    };
  };

  return (
    <div
      data-shell-preview-surface="true"
      className="relative overflow-hidden rounded-[28px] border border-[var(--shell-divider)] bg-[#eef2e6]"
      style={{
        height: `${SHELL_CANVAS_SURFACE_HEIGHT * PREVIEW_SCALE}px`,
        width: `${SHELL_CANVAS_SURFACE_WIDTH * PREVIEW_SCALE}px`
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-[rgba(63,122,52,0.6)] bg-[rgba(95,140,80,0.05)]"
        data-shell-band-guide="header"
        style={{ height: `${SHELL_CANVAS_HEADER_HEIGHT * PREVIEW_SCALE}px` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-[rgba(63,122,52,0.6)] bg-[rgba(95,140,80,0.05)]"
        data-shell-band-guide="footer"
        style={{ height: `${SHELL_CANVAS_FOOTER_HEIGHT * PREVIEW_SCALE}px` }}
      />
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          height: `${SHELL_CANVAS_SURFACE_HEIGHT}px`,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
          width: `${SHELL_CANVAS_SURFACE_WIDTH}px`
        }}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--stage-bg)]">
          <AppHeader brandView={defaultBrandView} decorationObjects={channel.headerObjects} />
          <main className="flex-1 bg-[rgba(255,255,255,0.2)]" />
          <AppFooterNav brandView={defaultBrandView} decorationObjects={channel.footerObjects} />
        </div>
      </div>
      {allObjects.filter((object) => object.visible !== false).map((object) => (
        <button
          key={object.id}
          type="button"
          aria-label={`Select ${object.id}`}
          data-shell-preview-object={object.id}
          className="absolute rounded-[10px] border border-transparent bg-transparent"
          style={resolveObjectPreviewFrame(object)}
          onPointerDown={(event) => beginInteraction(event, object)}
        />
      ))}
      {selectedObject ? (
        <div
          data-shell-preview-selection={selectedObject.id}
          className="absolute rounded-[10px] border-2 border-[rgba(63,122,52,0.88)] bg-[rgba(95,140,80,0.08)]"
          style={resolveObjectPreviewFrame(selectedObject)}
          onPointerDown={(event) => beginInteraction(event, selectedObject)}
        >
          {(["nw", "ne", "sw", "se"] as const).map((handle) => (
            <button
              key={handle}
              type="button"
              aria-label={`Resize ${selectedObject.id} ${handle}`}
              className={[
                "pointer-events-auto absolute h-3 w-3 rounded-full border border-[rgba(63,122,52,0.88)] bg-white",
                handle.includes("n") ? "top-[-7px]" : "bottom-[-7px]",
                handle.includes("w") ? "left-[-7px]" : "right-[-7px]"
              ].join(" ")}
              onPointerDown={(event) => beginInteraction(event, selectedObject, handle)}
            />
          ))}
        </div>
      ) : null}
      {selectedObject && selectedMeasurements ? (
        <div
          data-shell-measurement={selectedObject.id}
          className="pointer-events-none absolute rounded-full bg-[rgba(52,56,58,0.86)] px-3 py-1 text-[12px] font-semibold text-white"
          style={{
            left: `${Math.max(8, resolveObjectPreviewFrame(selectedObject).left)}px`,
            top: `${Math.max(8, resolveObjectPreviewFrame(selectedObject).top - 30)}px`
          }}
        >
          {selectedMeasurements.mount.toUpperCase()} · W {selectedMeasurements.width} · H {selectedMeasurements.height} · L {selectedMeasurements.left} · R {selectedMeasurements.right} · T {selectedMeasurements.top} · B {selectedMeasurements.bottom}
        </div>
      ) : null}
    </div>
  );
}
