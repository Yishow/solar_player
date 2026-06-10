import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const editorSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
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
  assert.match(editorSource, /if \(!shouldRenderPreviewContent \|\| !selectedPage\.renderPreview\) \{/);
  assert.match(editorSource, /selectedPage\.renderPreview as unknown as React\.ComponentType/);
});

test("display editor region resolution is skipped outside editor surfaces that need it", () => {
  assert.match(editorSource, /const shouldResolveEditorRegions =/);
  assert.match(editorSource, /selectedWorkspace === "editor" \|\|/);
  assert.match(editorSource, /selectedWorkspace === "assets" && assetReturnWorkspace === "editor" && Boolean\(assetContextId\)/);
  assert.match(editorSource, /shouldResolveEditorRegions[\s\S]*resolveDisplayEditorRegions/);
  assert.match(editorSource, /shouldResolveEditorRegions \? resolveDisplayPageFreeformObjectRegions/);
});
