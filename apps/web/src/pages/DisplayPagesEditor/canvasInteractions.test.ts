import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCanvasDrag,
  applyCanvasNudge,
  applyCanvasResize,
  clampCanvasRect,
  panCanvasViewport,
  resolveViewportAfterZoom
} from "./canvasInteractions";

test("applyCanvasDrag moves the selected region by the interaction delta", () => {
  const moved = applyCanvasDrag(
    {
      height: 244,
      left: 86,
      top: 26,
      width: 642
    },
    { x: 24, y: 0 },
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 40,
      minWidth: 40
    }
  );

  assert.equal(moved.rect.left, 110);
  assert.equal(moved.rect.top, 26);
});

test("applyCanvasResize expands geometry from the south-east handle", () => {
  const resized = applyCanvasResize(
    {
      height: 180,
      left: 640,
      top: 220,
      width: 320
    },
    "se",
    { x: 32, y: 18 },
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    }
  );

  assert.equal(resized.rect.width, 352);
  assert.equal(resized.rect.height, 198);
});

test("clampCanvasRect keeps geometry inside the FHD editor bounds", () => {
  assert.deepEqual(
    clampCanvasRect(
      {
        height: 240,
        left: 1850,
        top: -20,
        width: 160
      },
      {
        canvasHeight: 934,
        canvasWidth: 1920,
        minHeight: 80,
        minWidth: 120
      }
    ),
    {
      height: 240,
      left: 1760,
      top: 0,
      width: 160
    }
  );
});

test("resolveViewportAfterZoom keeps the focus point stable while zooming", () => {
  const next = resolveViewportAfterZoom(
    { offsetX: 0, offsetY: 0, zoom: 1 },
    1.25,
    { x: 200, y: 120 }
  );

  assert.equal(next.zoom, 1.25);
  assert.equal(next.offsetX, -50);
  assert.equal(next.offsetY, -30);
});

test("applyCanvasNudge moves the selected region by one configured step", () => {
  const nudged = applyCanvasNudge(
    {
      height: 120,
      left: 720,
      top: 248,
      width: 120
    },
    "right",
    1,
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 40,
      minWidth: 40
    }
  );

  assert.equal(nudged.rect.left, 721);
});

test("applyCanvasResize can pull geometry from the north-west handle without leaving the canvas", () => {
  const resized = applyCanvasResize(
    {
      height: 180,
      left: 20,
      top: 18,
      width: 320
    },
    "nw",
    { x: -48, y: -36 },
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    }
  );

  assert.equal(resized.rect.left, 0);
  assert.equal(resized.rect.top, 0);
  assert.equal(resized.rect.width, 368);
  assert.equal(resized.rect.height, 216);
});

test("panCanvasViewport offsets the preview without changing the zoom level", () => {
  const panned = panCanvasViewport(
    { offsetX: -20, offsetY: 32, zoom: 1.25 },
    { x: 40, y: -18 }
  );

  assert.deepEqual(panned, { offsetX: 20, offsetY: 14, zoom: 1.25 });
});
