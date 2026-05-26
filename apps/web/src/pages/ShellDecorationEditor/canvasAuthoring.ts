import type { ShellDecorationMount, ShellDecorationObject } from "@solar-display/shared";
import {
  applyCanvasDrag,
  applyCanvasResize,
  type CanvasDelta,
  type CanvasResizeHandle
} from "../DisplayPagesEditor/canvasInteractions";

export const SHELL_CANVAS_SURFACE_WIDTH = 1920;
export const SHELL_CANVAS_SURFACE_HEIGHT = 1080;
export const SHELL_CANVAS_HEADER_HEIGHT = 110;
export const SHELL_CANVAS_FOOTER_HEIGHT = 72;

export type ShellCanvasMeasurement = {
  bottom: number;
  height: number;
  left: number;
  mount: ShellDecorationMount;
  right: number;
  top: number;
  width: number;
};

function resolveBandHeight(mount: ShellDecorationMount) {
  return mount === "header" ? SHELL_CANVAS_HEADER_HEIGHT : SHELL_CANVAS_FOOTER_HEIGHT;
}

function resolveObjectMinSize(object: ShellDecorationObject) {
  return object.type === "line"
    ? { minHeight: 1, minWidth: 8 }
    : { minHeight: 16, minWidth: 16 };
}

function applyFrame(object: ShellDecorationObject, frame: ShellDecorationObject["frame"]): ShellDecorationObject {
  return {
    ...object,
    frame
  };
}

export function applyShellCanvasDrag(object: ShellDecorationObject, delta: CanvasDelta): ShellDecorationObject {
  if (object.locked) {
    return object;
  }

  const minSize = resolveObjectMinSize(object);
  const result = applyCanvasDrag(object.frame, delta, {
    canvasHeight: resolveBandHeight(object.mount),
    canvasWidth: SHELL_CANVAS_SURFACE_WIDTH,
    minHeight: minSize.minHeight,
    minWidth: minSize.minWidth
  });

  return applyFrame(object, result.rect);
}

export function applyShellCanvasResize(
  object: ShellDecorationObject,
  handle: CanvasResizeHandle,
  delta: CanvasDelta
): ShellDecorationObject {
  if (object.locked) {
    return object;
  }

  const minSize = resolveObjectMinSize(object);
  const result = applyCanvasResize(object.frame, handle, delta, {
    canvasHeight: resolveBandHeight(object.mount),
    canvasWidth: SHELL_CANVAS_SURFACE_WIDTH,
    minHeight: minSize.minHeight,
    minWidth: minSize.minWidth
  });

  return applyFrame(object, result.rect);
}

export function resolveShellCanvasMeasurements(
  frame: ShellDecorationObject["frame"],
  mount: ShellDecorationMount
): ShellCanvasMeasurement {
  const bandHeight = resolveBandHeight(mount);

  return {
    bottom: Math.max(0, bandHeight - frame.top - frame.height),
    height: frame.height,
    left: frame.left,
    mount,
    right: Math.max(0, SHELL_CANVAS_SURFACE_WIDTH - frame.left - frame.width),
    top: frame.top,
    width: frame.width
  };
}
