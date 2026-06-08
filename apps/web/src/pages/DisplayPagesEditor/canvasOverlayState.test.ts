import assert from "node:assert/strict";
import test from "node:test";
import type { ResolvedDisplayEditorRegion } from "./inspectorFields";
import {
  defaultDisplayEditorOverlayPreset,
  readStoredDisplayEditorOverlayPreset,
  resolveDisplayEditorOverlayState,
  writeStoredDisplayEditorOverlayPreset
} from "./canvasOverlayState";

function createRegion({
  geometry,
  geometryConstraint,
  id,
  label,
  parentId
}: {
  geometry?: ResolvedDisplayEditorRegion["geometry"];
  geometryConstraint?: ResolvedDisplayEditorRegion["geometryConstraint"];
  id: string;
  label: string;
  parentId?: string;
}): ResolvedDisplayEditorRegion {
  return {
    fields: [],
    geometry,
    geometryConstraint,
    id,
    label,
    nodeType: parentId ? "card-rail-card" : "region",
    parentId,
    schema: {
      fields: [],
      geometry: geometry
        ? {
            compatibilityKey: id,
            heightPath: ["height"],
            leftPath: ["left"],
            topPath: ["top"],
            widthPath: ["width"]
          }
        : undefined,
      id,
      label
    }
  };
}

test("readStoredDisplayEditorOverlayPreset falls back to default on malformed storage", () => {
  const removed: string[] = [];
  const storage = {
    getItem: () => "{bad json",
    removeItem: (key: string) => removed.push(key),
    setItem: () => {}
  };

  assert.equal(readStoredDisplayEditorOverlayPreset(storage), null);
  assert.equal(removed.length, 1);
});

test("writeStoredDisplayEditorOverlayPreset persists the current preset payload", () => {
  let savedKey = "";
  let savedValue = "";
  const storage = {
    getItem: () => null,
    removeItem: () => {},
    setItem: (key: string, value: string) => {
      savedKey = key;
      savedValue = value;
    }
  };

  writeStoredDisplayEditorOverlayPreset(
    {
      ...defaultDisplayEditorOverlayPreset,
      displayMode: "full-canvas",
      showCenterLines: true
    },
    storage
  );

  assert.match(savedKey, /display-editor-overlay/);
  assert.match(savedValue, /full-canvas/);
  assert.match(savedValue, /showCenterLines/);
});

test("resolveDisplayEditorOverlayState keeps selected-only framing focused on the active region", () => {
  const selectedRegion = createRegion({
    geometry: { height: 280, left: 160, top: 120, width: 640 },
    id: "overview-hero-media",
    label: "Overview Hero Media"
  });
  const passiveRegion = createRegion({
    geometry: { height: 180, left: 920, top: 132, width: 320 },
    id: "overview-hero-copy",
    label: "Overview Hero Copy"
  });

  const state = resolveDisplayEditorOverlayState({
    canvasHeight: 934,
    canvasWidth: 1920,
    lockedRegionIds: [],
    overlayPreset: defaultDisplayEditorOverlayPreset,
    regions: [selectedRegion, passiveRegion],
    selectedRegion
  });

  assert.equal(state.designSpace.width, 1920);
  assert.equal(state.designSpace.height, 1080);
  assert.equal(state.frames.filter((frame) => frame.visible).length, 1);
  assert.equal(state.frames.find((frame) => frame.regionId === selectedRegion.id)?.tone, "primary");
  assert.equal(state.frames.find((frame) => frame.regionId === passiveRegion.id)?.visible, false);
  assert.equal(state.measurement?.distances.left, 160);
  assert.equal(state.measurement?.distances.top, Math.round(120 * (1080 / 934)));
  assert.ok(state.pageGuides.some((guide) => guide.axis === "x" && guide.designPosition === 160));
  assert.ok(state.axisTicks.length > 0);
});

test("resolveDisplayEditorOverlayState exposes passive full-canvas frames and parent-bound rail measurements", () => {
  const railRegion = createRegion({
    geometry: { height: 108, left: 68, top: 432, width: 470 },
    id: "sustainability-highlight-rail",
    label: "Sustainability Highlight Rail"
  });
  const cardRegion = createRegion({
    geometry: { height: 108, left: 309, top: 432, width: 229 },
    geometryConstraint: { height: 108, left: 68, top: 432, width: 470 },
    id: "sustainability-highlight-rail/household-today",
    label: "Household Today",
    parentId: railRegion.id
  });
  const passiveRegion = createRegion({
    geometry: { height: 180, left: 920, top: 132, width: 320 },
    id: "overview-hero-copy",
    label: "Overview Hero Copy"
  });

  const state = resolveDisplayEditorOverlayState({
    activeInteraction: {
      constraintRect: { height: 108, left: 68, top: 432, width: 470 },
      guides: [{ axis: "x", position: 538 }],
      rect: { height: 108, left: 309, top: 432, width: 229 },
      type: "drag"
    },
    canvasHeight: 934,
    canvasWidth: 1920,
    lockedRegionIds: [],
    overlayPreset: {
      ...defaultDisplayEditorOverlayPreset,
      displayMode: "full-canvas",
      frameDensity: "strong",
      showCenterLines: true,
      showRegionLabels: true
    },
    regions: [railRegion, cardRegion, passiveRegion],
    selectedRegion: cardRegion
  });

  assert.equal(state.frames.filter((frame) => frame.visible).length, 3);
  assert.equal(state.frames.find((frame) => frame.regionId === passiveRegion.id)?.tone, "secondary");
  assert.deepEqual(state.measurement?.rect, { height: 108, left: 309, top: 432, width: 229 });
  assert.equal(state.measurement?.distances.left, Math.round((309 - 68) * (1920 / 1920)));
  assert.equal(state.measurement?.distances.right, 0);
  assert.equal(state.activeInteraction.type, "drag");
  assert.ok(state.pageGuides.some((guide) => guide.kind === "center"));
  assert.ok(state.frames.every((frame) => frame.label !== null));
});

test("resolveDisplayEditorOverlayState exposes shell band guides in shell coordinates", () => {
  const state = resolveDisplayEditorOverlayState({
    canvasHeight: 898,
    canvasWidth: 1920,
    contentOffsetTop: 110,
    lockedRegionIds: [],
    overlayPreset: defaultDisplayEditorOverlayPreset,
    regions: [],
    selectedRegion: null,
    shellHeight: 1080
  });

  assert.deepEqual(
    state.shellBandGuides.map((guide) => ({
      canvasPosition: guide.canvasPosition,
      designPosition: guide.designPosition,
      id: guide.id
    })),
    [
      { canvasPosition: 0, designPosition: 0, id: "shell-top" },
      { canvasPosition: 110, designPosition: 110, id: "header-content" },
      { canvasPosition: 1008, designPosition: 1008, id: "content-footer" },
      { canvasPosition: 1080, designPosition: 1080, id: "shell-bottom" }
    ]
  );
});

test("resolveDisplayEditorOverlayState uses the active interaction rect for selection bounds and relational rulers", () => {
  const selectedRegion = createRegion({
    geometry: { height: 100, left: 100, top: 100, width: 100 },
    id: "overview-hero-media",
    label: "Overview Hero Media"
  });
  const peerSelection = createRegion({
    geometry: { height: 100, left: 300, top: 100, width: 100 },
    id: "overview-hero-copy",
    label: "Overview Hero Copy"
  });
  const measureTarget = createRegion({
    geometry: { height: 100, left: 500, top: 100, width: 100 },
    id: "overview-kpi-row",
    label: "Overview KPI Row"
  });

  const state = resolveDisplayEditorOverlayState({
    activeInteraction: {
      constraintRect: { height: 898, left: 0, top: 0, width: 1920 },
      guides: [],
      rect: { height: 100, left: 200, top: 100, width: 100 },
      regionId: selectedRegion.id,
      type: "drag"
    },
    canvasHeight: 898,
    canvasWidth: 1920,
    lockedRegionIds: [],
    measurementTargetRegion: measureTarget,
    overlayPreset: defaultDisplayEditorOverlayPreset,
    regions: [selectedRegion, peerSelection, measureTarget],
    selectedRegion,
    selectedRegionIds: [selectedRegion.id, peerSelection.id]
  });

  assert.deepEqual(state.selectionBounds, {
    height: 100,
    left: 200,
    top: 100,
    width: 200
  });
  assert.equal(state.relationalRulers.find((ruler) => ruler.axis === "x")?.distance, 200);
});
