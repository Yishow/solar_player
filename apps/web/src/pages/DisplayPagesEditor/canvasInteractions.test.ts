import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCanvasDrag,
  applyCanvasNudge,
  applyCanvasResize,
  clampCanvasRect,
  mapCanvasPointToDesignPoint,
  mapDesignPointToCanvasPoint,
  panCanvasViewport,
  resolveRelationalMeasurements,
  resolveCanvasDesignMapping,
  applyMeasurementHandleDrag,
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

test("clampCanvasRect falls back to minimum dimensions when incoming geometry is incomplete", () => {
  const rect = clampCanvasRect(
    {
      height: undefined as unknown as number,
      left: 24,
      top: 18,
      width: 220
    },
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    }
  );

  assert.equal(rect.height, 80);
  assert.equal(rect.width, 220);
  assert.equal(rect.top, 18);
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

test("resolveCanvasDesignMapping compresses a larger design space into the editor surface", () => {
  const mapping = resolveCanvasDesignMapping(
    { height: 934, width: 1920 },
    { height: 1080, width: 1920 }
  );

  assert.equal(mapping.canvasHeight, 934);
  assert.equal(mapping.canvasWidth, 1920);
  assert.equal(mapping.designHeight, 1080);
  assert.equal(mapping.designWidth, 1920);
  assert.equal(mapping.scaleX, 1);
  assert.equal(mapping.scaleY, 934 / 1080);
});

test("canvas and design points round-trip through the current mapping", () => {
  const mapping = resolveCanvasDesignMapping(
    { height: 934, width: 1920 },
    { height: 1080, width: 1920 }
  );
  const designPoint = { x: 960, y: 540 };
  const canvasPoint = mapDesignPointToCanvasPoint(designPoint, mapping);

  assert.deepEqual(canvasPoint, {
    x: 960,
    y: Math.round(540 * (934 / 1080))
  });
  assert.deepEqual(mapCanvasPointToDesignPoint(canvasPoint, mapping), designPoint);
});

test("applyCanvasDrag clamps a rail card inside its parent rail bounds", () => {
  const moved = applyCanvasDrag(
    {
      height: 108,
      left: 309,
      top: 432,
      width: 229
    },
    { x: 80, y: 0 },
    {
      canvasHeight: 108,
      canvasWidth: 470,
      minHeight: 64,
      minWidth: 120,
      originLeft: 68,
      originTop: 432
    }
  );

  assert.equal(moved.rect.left, 309);
  assert.deepEqual(moved.guides, [
    { axis: "x", position: 538 },
    { axis: "y", position: 432 }
  ]);
});

test("resolveRelationalMeasurements reports design-space gaps between two editable regions", () => {
  const mapping = resolveCanvasDesignMapping(
    { height: 934, width: 1920 },
    { height: 1080, width: 1920 }
  );
  const measurements = resolveRelationalMeasurements(
    { height: 280, left: 920, top: 120, width: 320 },
    { height: 360, left: 160, top: 96, width: 620 },
    mapping
  );

  assert.deepEqual(measurements.map((measurement) => ({ axis: measurement.axis, distance: measurement.distance })), [
    { axis: "x", distance: 140 },
    { axis: "y", distance: 0 }
  ]);
});

test("applyMeasurementHandleDrag mutates only the selected region geometry", () => {
  const moved = applyMeasurementHandleDrag(
    { height: 180, left: 920, top: 132, width: 320 },
    "x",
    -12,
    {
      canvasHeight: 934,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    }
  );

  assert.equal(moved.rect.left, 908);
  assert.equal(moved.rect.top, 132);
  assert.equal(moved.rect.width, 320);
  assert.equal(moved.rect.height, 180);
});
