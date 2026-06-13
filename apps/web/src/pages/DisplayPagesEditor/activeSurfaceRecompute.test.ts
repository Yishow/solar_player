import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const editorSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const publishingSource = readFileSync(path.join(import.meta.dirname, "publishing.ts"), "utf8");
const assetHealthSource = readFileSync(
  path.join(import.meta.dirname, "../../hooks/useDisplayPageAssetHealth.ts"),
  "utf8"
);

test("display pages editor gates full region graph work to the active editor surface", () => {
  assert.match(editorSource, /const shouldResolveEditorRegions =\s*\n\s*selectedWorkspace === "editor"/);
  assert.match(editorSource, /shouldResolveEditorRegions\s*\?\s*resolveDisplayEditorRegions/);
  assert.match(editorSource, /shouldResolveEditorRegions \? resolveDisplayPageFreeformObjectRegions/);
  assert.match(editorSource, /const shouldRenderPreviewContent = renderPreview && selectedWorkspace === "editor"/);
});

test("display pages editor loads support panels only for the active panel tab", () => {
  assert.match(editorSource, /const shouldLoadAssetHealth = selectedWorkspace === "editor" && rightTab === "health"/);
  assert.match(editorSource, /const shouldLoadPublishingState = selectedWorkspace === "editor" && rightTab === "publish"/);
  assert.match(editorSource, /useDisplayPageAssetHealth\(\{ enabled: shouldLoadAssetHealth \}\)/);
  assert.match(editorSource, /useDisplayPagePublishingState\([\s\S]*\{ enabled: shouldLoadPublishingState \}/);
});

test("display pages editor support panel refresh failures preserve warm state lanes", () => {
  assert.match(publishingSource, /initialPublishingStateByPage \?\? \{\}/);
  assert.match(publishingSource, /setPublishingStateByPage\(\(current\) => \(\{ \.\.\.current, \[pageId\]: \{ fallback, validation \} \}\)\)/);
  assert.match(publishingSource, /catch\(\(error\) => \{\s*\n\s*if \(active\) setPublishingError/);
  assert.doesNotMatch(publishingSource, /catch\(\(error\) => \{[\s\S]*setPublishingStateByPage\(\{\}\)/);
  assert.match(assetHealthSource, /const \[report, setReport\] = useState<DisplayPageAssetHealthReport \| null>\(options\.initialReport \?\? null\)/);
  assert.match(assetHealthSource, /const hasInitialReport = options\.initialReport !== undefined/);
  assert.match(assetHealthSource, /setReport\(nextReport\)/);
  assert.match(assetHealthSource, /catch \(error\) \{\s*\n\s*setErrorMessage/);
  assert.doesNotMatch(assetHealthSource, /catch \(error\) \{[\s\S]*setReport\(null\)/);
});
