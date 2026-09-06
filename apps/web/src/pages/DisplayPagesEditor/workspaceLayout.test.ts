import assert from "node:assert/strict";
import test from "node:test";
import {
  afterPageSave,
  applyAssetPickerSession,
  cancelAssetPickerSession,
  DEFAULT_LEFT_PANEL_WIDTH,
  DEFAULT_RIGHT_PANEL_WIDTH,
  inspectorPrimarySections,
  openAssetPickerSession,
  preserveStoredGeometry,
  remoteRevisionAction,
  resolveEditorWorkspaceLayout
} from "./workspaceLayout";

test("U3-R1 layout uses page-width defaults 240/320 and not the old 220/260 grid", () => {
  const layout = resolveEditorWorkspaceLayout({ viewportWidth: 1920 });
  assert.equal(layout.leftWidth, DEFAULT_LEFT_PANEL_WIDTH);
  assert.equal(layout.rightWidth, DEFAULT_RIGHT_PANEL_WIDTH);
  assert.equal(layout.canvasGridTemplate, "240px minmax(0, 1fr) 320px");
  assert.equal(layout.useDrawer, false);
});

test("U3-R3-S01 resizing the inspector does not mutate stored object geometry", () => {
  const stored = { height: 80, left: 24, top: 40, width: 160 };
  const before = resolveEditorWorkspaceLayout({ viewportWidth: 1920, rightWidth: 320 });
  const after = resolveEditorWorkspaceLayout({ viewportWidth: 1920, rightWidth: 400 });
  assert.notEqual(before.rightWidth, after.rightWidth);
  assert.deepEqual(preserveStoredGeometry(stored, after), stored);
});

test("U3-R3-S02 1366 collapses the left panel into a drawer while keeping the canvas", () => {
  const layout = resolveEditorWorkspaceLayout({ viewportWidth: 1366 });
  assert.equal(layout.useDrawer, true);
  assert.equal(layout.leftCollapsed, true);
  assert.match(layout.canvasGridTemplate, /minmax\(0, 1fr\)/);
});

test("U3-R4 canceling the asset picker restores page, item, zoom and dirty", () => {
  const opened = openAssetPickerSession({
    dirty: true,
    pageId: "overview",
    selectedItemId: "overview-hero-media",
    zoom: 1.2
  });
  const cancelled = cancelAssetPickerSession(opened);
  assert.equal(cancelled.open, false);
  assert.equal(cancelled.pageId, "overview");
  assert.equal(cancelled.selectedItemId, "overview-hero-media");
  assert.equal(cancelled.zoom, 1.2);
  assert.equal(cancelled.dirty, true);
});

test("U3-R4-S02 applying an image stays on the same page and selected item", () => {
  const applied = applyAssetPickerSession(
    openAssetPickerSession({
      dirty: false,
      pageId: "overview",
      selectedItemId: "overview-hero-media",
      zoom: 1
    }),
    "overview-hero-media"
  );
  assert.equal(applied.pageId, "overview");
  assert.equal(applied.selectedItemId, "overview-hero-media");
  assert.equal(applied.dirty, true);
  assert.equal(applied.open, false);
});

test("U3-R5-S01 page save does not clear a dirty shared shell", () => {
  const next = afterPageSave({ pageDirty: true, shellDirty: true });
  assert.equal(next.pageDirty, false);
  assert.equal(next.shellDirty, true);
});

test("U3-R6-S02 remote revision while dirty prompts compare/reload instead of overwrite", () => {
  assert.equal(remoteRevisionAction(true, 8, 7), "prompt-compare-or-reload");
  assert.equal(remoteRevisionAction(false, 8, 7), "ignore");
});

test("U3-R2 image selection prefers asset controls over metric data", () => {
  assert.deepEqual(
    inspectorPrimarySections({ hasAssetFields: true, hasDataBinding: false, isFixedTemplate: true }),
    ["content", "appearance", "constraint"]
  );
  assert.deepEqual(
    inspectorPrimarySections({ hasAssetFields: false, hasDataBinding: true, isFixedTemplate: false }),
    ["content", "data", "appearance"]
  );
});
