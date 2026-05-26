import assert from "node:assert/strict";
import test from "node:test";
import type { ShellDecorationObject } from "@solar-display/shared";
import {
  applyShellCanvasDrag,
  applyShellCanvasResize,
  resolveShellCanvasMeasurements
} from "./canvasAuthoring";

function lineObject(overrides: Partial<ShellDecorationObject> = {}): ShellDecorationObject {
  return {
    frame: { height: 2, left: 86, top: 24, width: 320 },
    id: "header-line",
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#d2b46a", thickness: 2 },
    type: "line",
    visible: true,
    zIndex: 1,
    ...overrides
  } as ShellDecorationObject;
}

test("applyShellCanvasDrag clamps header objects inside the header band", () => {
  const moved = applyShellCanvasDrag(lineObject(), { x: 0, y: 400 });

  assert.equal(moved.frame.top, 108);
  assert.equal(moved.frame.left, 86);
});

test("applyShellCanvasResize keeps footer measurements relative to the footer band", () => {
  const resized = applyShellCanvasResize(
    lineObject({
      frame: { height: 32, left: 120, top: 12, width: 80 },
      id: "footer-ornament",
      mount: "footer",
      source: { kind: "ornament-image", ornamentKey: "leaf" },
      type: "ornament-image"
    }),
    "e",
    { x: 60, y: 0 }
  );
  const measurements = resolveShellCanvasMeasurements(resized.frame, "footer");

  assert.equal(resized.frame.width, 140);
  assert.deepEqual(measurements, {
    bottom: 28,
    height: 32,
    left: 120,
    mount: "footer",
    right: 1660,
    top: 12,
    width: 140
  });
});

test("applyShellCanvasDrag leaves locked objects selectable but unmoved", () => {
  const object = lineObject({ locked: true });
  const moved = applyShellCanvasDrag(object, { x: 80, y: 40 });

  assert.equal(moved.locked, true);
  assert.deepEqual(moved.frame, object.frame);
});
