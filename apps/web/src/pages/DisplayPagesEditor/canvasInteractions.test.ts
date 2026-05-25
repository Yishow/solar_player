import assert from "node:assert/strict";
import test from "node:test";
import {
  alignCanvasSelections,
  applyCanvasDrag,
  applyCanvasNudge,
  applyCanvasResize,
  distributeCanvasSelections,
  clampCanvasRect,
  mapCanvasPointToDesignPoint,
  mapDesignPointToCanvasPoint,
  panCanvasViewport,
  resolveCanvasNudgeStep,
  resolveDistanceLockSession,
  resolveRelationalMeasurements,
  resolveCanvasDesignMapping,
  resolveSelectionBounds,
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
      canvasHeight: 898,
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
      canvasHeight: 898,
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
        canvasHeight: 898,
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
        canvasHeight: 898,
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
      canvasHeight: 898,
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
      canvasHeight: 898,
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
    { height: 898, width: 1920 },
    { height: 1080, width: 1920 }
  );

  assert.equal(mapping.canvasHeight, 898);
  assert.equal(mapping.canvasWidth, 1920);
  assert.equal(mapping.designHeight, 1080);
  assert.equal(mapping.designWidth, 1920);
  assert.equal(mapping.scaleX, 1);
  assert.equal(mapping.scaleY, 898 / 1080);
});

test("canvas and design points round-trip through the current mapping", () => {
  const mapping = resolveCanvasDesignMapping(
    { height: 898, width: 1920 },
    { height: 1080, width: 1920 }
  );
  const designPoint = { x: 960, y: 540 };
  const canvasPoint = mapDesignPointToCanvasPoint(designPoint, mapping);

  assert.deepEqual(canvasPoint, {
    x: 960,
    y: Math.round(540 * (898 / 1080))
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
    { height: 898, width: 1920 },
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
      canvasHeight: 898,
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

test("applyCanvasDrag snaps to explicit guide, region edge, region center, and center-line targets", () => {
  const guideSnap = applyCanvasDrag(
    { height: 180, left: 148, top: 200, width: 120 },
    { x: 0, y: 0 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    {
      enabled: true,
      targets: [{ axis: "x", position: 160, type: "guide" }],
      threshold: 16
    }
  );
  const edgeSnap = applyCanvasDrag(
    { height: 180, left: 256, top: 200, width: 120 },
    { x: 0, y: 0 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    {
      enabled: true,
      targets: [{ axis: "x", position: 400, type: "region-edge" }],
      threshold: 30
    }
  );
  const centerSnap = applyCanvasDrag(
    { height: 180, left: 468, top: 200, width: 120 },
    { x: 0, y: 0 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    {
      enabled: true,
      targets: [{ axis: "x", position: 540, type: "region-center" }],
      threshold: 16
    }
  );
  const centerLineSnap = applyCanvasDrag(
    { height: 180, left: 892, top: 200, width: 120 },
    { x: 0, y: 0 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    {
      enabled: true,
      targets: [{ axis: "x", position: 960, type: "center-line" }],
      threshold: 16
    }
  );

  assert.equal(guideSnap.rect.left, 160);
  assert.equal(guideSnap.guides[0]?.targetType, "guide");
  assert.equal(edgeSnap.rect.left + edgeSnap.rect.width, 400);
  assert.equal(edgeSnap.guides[0]?.targetType, "region-edge");
  assert.equal(centerSnap.rect.left + centerSnap.rect.width / 2, 540);
  assert.equal(centerSnap.guides[0]?.targetType, "region-center");
  assert.equal(centerLineSnap.rect.left + centerLineSnap.rect.width / 2, 960);
  assert.equal(centerLineSnap.guides[0]?.targetType, "center-line");
});

test("distance lock is scoped to one interaction session and clamp wins when lock conflicts with bounds", () => {
  const session = resolveDistanceLockSession(
    { height: 180, left: 40, top: 240, width: 160 },
    { height: 180, left: 224, top: 240, width: 220 }
  );
  const locked = applyCanvasDrag(
    { height: 180, left: 40, top: 240, width: 160 },
    { x: 88, y: 32 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    undefined,
    session
  );
  const unlocked = applyCanvasDrag(
    { height: 180, left: 40, top: 240, width: 160 },
    { x: 88, y: 32 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    }
  );
  const clamped = applyCanvasDrag(
    { height: 180, left: 0, top: 240, width: 180 },
    { x: -20, y: 0 },
    {
      canvasHeight: 898,
      canvasWidth: 1920,
      minHeight: 80,
      minWidth: 120
    },
    undefined,
    {
      axis: "x",
      distance: 24,
      relation: "before",
      targetRect: { height: 180, left: 120, top: 240, width: 80 }
    }
  );

  assert.equal(locked.rect.left, 40);
  assert.equal(locked.rect.top, 272);
  assert.equal(unlocked.rect.left, 128);
  assert.equal(clamped.rect.left, 0);
  assert.equal(clamped.boundaryClamped, true);
});

test("alignCanvasSelections uses a stable selection bounds box for edge and center alignment", () => {
  const aligned = alignCanvasSelections(
    [
      { id: "a", rect: { height: 120, left: 120, top: 220, width: 180 } },
      { id: "b", rect: { height: 180, left: 240, top: 160, width: 220 } },
      { id: "c", rect: { height: 160, left: 420, top: 280, width: 200 } }
    ],
    "top"
  );
  const centered = alignCanvasSelections(
    [
      { id: "a", rect: { height: 120, left: 120, top: 220, width: 180 } },
      { id: "b", rect: { height: 180, left: 240, top: 160, width: 220 } }
    ],
    "h-center"
  );

  assert.deepEqual(aligned.map((selection) => selection.rect.top), [160, 160, 160]);
  assert.deepEqual(centered.map((selection) => selection.rect.left), [200, 180]);
});

test("distributeCanvasSelections keeps outer bounds anchored while equalizing interior gaps", () => {
  const distributed = distributeCanvasSelections(
    [
      { id: "a", rect: { height: 140, left: 120, top: 220, width: 120 } },
      { id: "b", rect: { height: 140, left: 320, top: 220, width: 140 } },
      { id: "c", rect: { height: 140, left: 560, top: 220, width: 120 } },
      { id: "d", rect: { height: 140, left: 820, top: 220, width: 100 } }
    ],
    "h-distribute"
  );
  const bounds = resolveSelectionBounds(distributed);
  const gaps = [
    distributed[1]!.rect.left - (distributed[0]!.rect.left + distributed[0]!.rect.width),
    distributed[2]!.rect.left - (distributed[1]!.rect.left + distributed[1]!.rect.width),
    distributed[3]!.rect.left - (distributed[2]!.rect.left + distributed[2]!.rect.width)
  ];

  assert.equal(distributed[0]!.rect.left, 120);
  assert.equal(distributed[3]!.rect.left + distributed[3]!.rect.width, 920);
  assert.deepEqual(gaps, [107, 106, 107]);
  assert.deepEqual(bounds, { height: 140, left: 120, top: 220, width: 800 });
});

test("resolveCanvasNudgeStep exposes fine, normal, and accelerated tiers with a safe fallback", () => {
  assert.deepEqual(resolveCanvasNudgeStep({ altKey: true, shiftKey: false }), {
    label: "fine",
    step: 1
  });
  assert.deepEqual(resolveCanvasNudgeStep({ altKey: false, shiftKey: false }), {
    label: "normal",
    step: 8
  });
  assert.deepEqual(resolveCanvasNudgeStep({ altKey: false, shiftKey: true }), {
    label: "accelerated",
    step: 24
  });
  assert.deepEqual(resolveCanvasNudgeStep({ altKey: true, shiftKey: true }), {
    label: "normal",
    step: 8
  });
});
