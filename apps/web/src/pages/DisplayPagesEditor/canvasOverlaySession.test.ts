import assert from "node:assert/strict";
import test from "node:test";
import { createPerformanceRegions } from "./uiPerformanceFixtures";
import {
  defaultDisplayEditorOverlayPreset,
  resolveDisplayEditorOverlayState,
  type DisplayEditorOverlayPreset
} from "./canvasOverlayState";
import { createCanvasOverlaySession } from "./canvasOverlaySession";

test("drag-static-preparation-once: 100 pointermove events in one drag session run static preparation exactly once", () => {
  const regions = createPerformanceRegions();
  const session = createCanvasOverlaySession();
  const selectedRegion = regions[0]!;
  const lockedRegionIds: string[] = [];
  const preset: DisplayEditorOverlayPreset = {
    ...defaultDisplayEditorOverlayPreset,
    displayMode: "full-canvas"
  };

  const initialGeneration = session.getGeneration();
  assert.equal(session.getPreparationCount(), 0, "No preparation before first resolve");

  // Simulate 100 pointermove events in a continuous drag interaction
  for (let i = 1; i <= 100; i++) {
    const dragRect = {
      height: 40,
      left: 20 + i,
      top: 20 + i * 2,
      width: 80
    };

    const overlay = session.resolve({
      activeInteraction: {
        boundaryClamped: false,
        constraintRect: { height: 934, left: 0, top: 0, width: 1920 },
        guides: [],
        rect: dragRect,
        regionId: selectedRegion.id,
        type: "drag"
      },
      canvasHeight: 934,
      canvasWidth: 1920,
      lockedRegionIds,
      overlayPreset: preset,
      regions,
      selectedRegion,
      selectedRegionIds: [selectedRegion.id]
    });

    // Verify preparation count remains exactly 1 across all 100 moves
    assert.equal(session.getPreparationCount(), 1, `Preparation count remains 1 at move ${i}`);
    assert.equal(session.getGeneration(), initialGeneration + 1, "Generation unchanged during stable moves");

    // Verify active frame was correctly updated with the latest coordinates
    assert.equal(overlay.frames.length, 100);
    const activeFrame = overlay.frames.find((f) => f.regionId === selectedRegion.id);
    assert.deepEqual(activeFrame?.rect, dragRect);

    // Verify frame lookup map is available and matches
    assert.ok(overlay.framesById);
    assert.deepEqual(overlay.framesById.get(selectedRegion.id)?.rect, dragRect);
  }

  assert.equal(session.getPreparationCount(), 1, "Static preparation ran exactly once for the entire 100-move drag session");
});

test("drag-preparation-invalidated: input changes invalidate static preparation and increment generation", () => {
  const regions = createPerformanceRegions();
  const session = createCanvasOverlaySession();
  const preset: DisplayEditorOverlayPreset = {
    ...defaultDisplayEditorOverlayPreset,
    displayMode: "full-canvas"
  };

  const baseParams = {
    canvasHeight: 934,
    canvasWidth: 1920,
    lockedRegionIds: [] as string[],
    overlayPreset: preset,
    regions,
    selectedRegion: regions[0]!,
    selectedRegionIds: [regions[0]!.id]
  };

  // 1. Initial resolve -> preparation 1
  session.resolve(baseParams);
  assert.equal(session.getPreparationCount(), 1);
  const gen1 = session.getGeneration();

  // 2. Same inputs -> cache hit, count unchanged
  session.resolve(baseParams);
  assert.equal(session.getPreparationCount(), 1);
  assert.equal(session.getGeneration(), gen1);

  // 3. Invalidation: lockedRegionIds change -> preparation 2
  session.resolve({
    ...baseParams,
    lockedRegionIds: [regions[1]!.id]
  });
  assert.equal(session.getPreparationCount(), 2);
  const gen2 = session.getGeneration();
  assert.ok(gen2 > gen1, "Generation increments on lock change");

  // 4. Invalidation: selection change -> preparation 3
  session.resolve({
    ...baseParams,
    selectedRegion: regions[2]!,
    selectedRegionIds: [regions[2]!.id]
  });
  assert.equal(session.getPreparationCount(), 3);
  const gen3 = session.getGeneration();
  assert.ok(gen3 > gen2, "Generation increments on selection change");

  // 5. Invalidation: overlay preset change -> preparation 4
  session.resolve({
    ...baseParams,
    overlayPreset: { ...preset, showAxes: !preset.showAxes }
  });
  assert.equal(session.getPreparationCount(), 4);
  const gen4 = session.getGeneration();
  assert.ok(gen4 > gen3, "Generation increments on preset change");

  // 6. Invalidation: viewport / canvas dimensions change -> preparation 5
  session.resolve({
    ...baseParams,
    canvasWidth: 1280
  });
  assert.equal(session.getPreparationCount(), 5);
  const gen5 = session.getGeneration();
  assert.ok(gen5 > gen4, "Generation increments on canvas width change");

  // 6.5 Invalidation: viewport zoom/pan change -> preparation 6
  session.resolve({
    ...baseParams,
    canvasWidth: 1280,
    viewport: { zoom: 1.5, offsetX: 10, offsetY: 20 }
  });
  assert.equal(session.getPreparationCount(), 6);
  const gen6 = session.getGeneration();
  assert.ok(gen6 > gen5, "Generation increments on viewport zoom/pan change");

  // 7. Invalidation: regions geometry change -> preparation 7
  const modifiedRegions = regions.map((r, index) =>
    index === 0
      ? { ...r, geometry: { ...r.geometry!, left: r.geometry!.left + 50 } }
      : r
  );
  session.resolve({
    ...baseParams,
    canvasWidth: 1280,
    viewport: { zoom: 1.5, offsetX: 10, offsetY: 20 },
    regions: modifiedRegions
  });
  assert.equal(session.getPreparationCount(), 7);
  const gen7 = session.getGeneration();
  assert.ok(gen7 > gen6, "Generation increments on region geometry change");

  // 8. Manual invalidate() -> preparation 8
  session.invalidate();
  session.resolve(baseParams);
  assert.equal(session.getPreparationCount(), 8);
  assert.ok(session.getGeneration() > gen7, "Generation increments on manual invalidation");
});

test("overlay-output-equivalence: session-composed overlay matches direct resolution exactly across 100 regions fixture", () => {
  const regions = createPerformanceRegions();
  const session = createCanvasOverlaySession();
  const preset: DisplayEditorOverlayPreset = {
    ...defaultDisplayEditorOverlayPreset,
    displayMode: "full-canvas",
    showAxes: true,
    showCenterLines: true,
    showRegionLabels: true
  };

  const activeInteraction = {
    boundaryClamped: false,
    constraintRect: { height: 934, left: 0, top: 0, width: 1920 },
    guides: [{ axis: "x" as const, position: 200, targetType: "region-edge" as const }],
    rect: { height: 40, left: 75, top: 85, width: 80 },
    regionId: regions[0]!.id,
    type: "drag" as const
  };

  const params = {
    activeInteraction,
    canvasHeight: 934,
    canvasWidth: 1920,
    contentOffsetTop: 110,
    lockedRegionIds: [regions[5]!.id],
    measurementTargetRegion: regions[1]!,
    overlayPreset: preset,
    regions,
    selectedRegion: regions[0]!,
    selectedRegionIds: [regions[0]!.id, regions[1]!.id],
    selectionFeedbackLabel: "已選 2 區",
    shellHeight: 1080
  };

  // Direct resolution without session
  const directOutput = resolveDisplayEditorOverlayState(params);

  // Session-based resolution
  const sessionOutput = session.resolve(params);

  // Deep comparison of all outputs
  assert.deepEqual(sessionOutput.frames, directOutput.frames, "Frames array matches exactly");
  assert.deepEqual(sessionOutput.axisTicks, directOutput.axisTicks, "Axis ticks match exactly");
  assert.deepEqual(sessionOutput.pageGuides, directOutput.pageGuides, "Page guides match exactly");
  assert.deepEqual(sessionOutput.shellBandGuides, directOutput.shellBandGuides, "Shell band guides match exactly");
  assert.deepEqual(sessionOutput.measurement, directOutput.measurement, "Measurement matches exactly");
  assert.deepEqual(sessionOutput.relationalRulers, directOutput.relationalRulers, "Relational rulers match exactly");
  assert.deepEqual(sessionOutput.selectionBounds, directOutput.selectionBounds, "Selection bounds match exactly");
  assert.deepEqual(sessionOutput.selectionLabel, directOutput.selectionLabel, "Selection label matches exactly");
  assert.deepEqual(sessionOutput.snapGuides, directOutput.snapGuides, "Snap guides match exactly");
  assert.deepEqual(sessionOutput.designMapping, directOutput.designMapping, "Design mapping matches exactly");

  // Verify framesById lookup index
  assert.ok(sessionOutput.framesById);
  for (const frame of directOutput.frames) {
    const indexedFrame = sessionOutput.framesById.get(frame.regionId);
    assert.deepEqual(indexedFrame, frame, `Indexed frame matches for region ${frame.regionId}`);
  }
});
