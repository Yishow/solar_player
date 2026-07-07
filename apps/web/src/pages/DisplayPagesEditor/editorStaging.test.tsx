import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const editorSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const canvasPanePath = path.join(import.meta.dirname, "canvasPane.tsx");
const canvasPaneSource = existsSync(canvasPanePath) ? readFileSync(canvasPanePath, "utf8") : "";
const canvasWorkflowSource = readFileSync(path.join(import.meta.dirname, "useDisplayEditorCanvasWorkflow.ts"), "utf8");
const publishingSource = readFileSync(path.join(import.meta.dirname, "publishing.ts"), "utf8");
const runtimeSource = readFileSync(path.join(import.meta.dirname, "runtime.tsx"), "utf8");

test("display editor route builds a visible frame from fallback definitions before registry finishes", () => {
  assert.match(runtimeSource, /const registry = useDisplayPageRegistry\(\)/);
  assert.match(runtimeSource, /registry\.pages\.length > 0 \? buildRuntimePageDefinitions\(registry\.pages\) : runtimePageDefinitions/);
  assert.match(runtimeSource, /pageDefinitions=\{pageDefinitions\.length > 0 \? pageDefinitions : fallbackPageDefinitions\}/);
  assert.match(editorSource, /pageDefinitions = fallbackPageDefinitions/);
});

test("display editor route entry defers image list loading until asset options are needed", () => {
  assert.match(editorSource, /const shouldLoadEditorAssetOptions = Boolean\(/);
  assert.match(editorSource, /if \(initialImages \|\| !shouldLoadEditorAssetOptions\) \{/);
  assert.match(editorSource, /selectedWorkspace === "editor" && selectedFreeformObject && selectedFreeformObject\.type !== "line"/);
  assert.match(editorSource, /initialAssets=\{initialImages \? images : undefined\}/);
});

test("display editor route preloads workspace assets and shell data for deep links", () => {
  assert.match(runtimeSource, /loadImageManagementModel\(\)/);
  assert.match(runtimeSource, /readCachedImageManagementModel\(\)\?\.assets/);
  assert.match(runtimeSource, /loadShellDecorationEditorData\(\)/);
  assert.match(runtimeSource, /initialImages=\{initialImages\}/);
  assert.match(runtimeSource, /initialShellDecorationDraft=\{initialShellDecorationData\?\.draft\}/);
  assert.match(runtimeSource, /initialShellDecorationImages=\{initialShellDecorationData\?\.images\}/);
});

test("display editor diagnostics and publishing hooks are gated by active right tab", () => {
  assert.match(editorSource, /const shouldLoadAssetHealth = selectedWorkspace === "editor" && rightTab === "health"/);
  assert.match(editorSource, /const shouldLoadPublishingState = selectedWorkspace === "editor" && rightTab === "publish"/);
  assert.match(editorSource, /useDisplayPageAssetHealth\(\{\s*enabled:\s*shouldLoadAssetHealth\s*\}\)/);
  assert.match(editorSource, /enabled:\s*shouldLoadPublishingState/);
  assert.match(publishingSource, /options:\s*\{\s*enabled\?: boolean\s*\} = \{\}/);
  assert.match(publishingSource, /if \(!enabled && !refreshOptions\.force\) \{/);
  assert.match(publishingSource, /refreshOptions:\s*\{\s*force\?: boolean; isActive\?: \(\) => boolean\s*\}/);
  assert.match(publishingSource, /refresh\(\{\s*isActive:\s*\(\) => active\s*\}\)/);
  assert.match(publishingSource, /await refresh\(\{\s*force:\s*true\s*\}\)/);
});

test("display editor preview subtree creation is gated by editor workspace and renderPreview", () => {
  assert.match(editorSource, /const shouldRenderPreviewContent = renderPreview && selectedWorkspace === "editor"/);
  assert.match(editorSource, /renderPreview=\{shouldRenderPreviewContent\}/);
  assert.match(canvasPaneSource, /if \(!renderPreview \|\| !selectedPage\.renderPreview\) \{/);
  assert.match(canvasPaneSource, /selectedPage\.renderPreview as unknown as React\.ComponentType/);
});

test("display editor region resolution is skipped outside editor surfaces that need it", () => {
  assert.match(editorSource, /const shouldResolveEditorRegions =/);
  assert.match(editorSource, /selectedWorkspace === "editor" \|\|/);
  assert.match(editorSource, /selectedWorkspace === "assets" && assetReturnWorkspace === "editor" && Boolean\(assetContextId\)/);
  assert.match(editorSource, /shouldResolveEditorRegions[\s\S]*resolveDisplayEditorRegions/);
  assert.match(editorSource, /shouldResolveEditorRegions \? resolveDisplayPageFreeformObjectRegions/);
});

test("display editor profiling instruments region resolve, overlay resolve, and preview render boundaries", () => {
  assert.match(editorSource, /measureDisplayEditorScope/);
  assert.match(editorSource, /measureDisplayEditorScope\(\s*"region-resolve"[\s\S]*resolveDisplayEditorRegions/);
  assert.match(canvasWorkflowSource, /measureDisplayEditorScope\(\s*"overlay-resolve"[\s\S]*resolveDisplayEditorOverlayState/);
  assert.match(canvasPaneSource, /renderProfiledDisplayEditorPreview\(\s*selectedPage\.id/);
});

test("display editor canvas workflow is isolated from the route component", () => {
  assert.match(canvasPaneSource, /export const DisplayEditorCanvasPane = React\.memo/);
  assert.match(canvasPaneSource, /useDisplayEditorCanvasWorkflow\(/);
  assert.match(editorSource, /<DisplayEditorCanvasPane/);
  assert.doesNotMatch(editorSource, /useDisplayEditorCanvasWorkflow\(/);
});
