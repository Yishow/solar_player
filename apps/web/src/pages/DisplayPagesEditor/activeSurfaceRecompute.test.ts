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
  assert.match(editorSource, /shouldResolveEditorRegions[\s\S]*resolveDisplayEditorRegions/);
  assert.match(editorSource, /shouldResolveEditorRegions \? resolveDisplayPageFreeformObjectRegions/);
  assert.match(editorSource, /const shouldRenderPreviewContent = renderPreview && selectedWorkspace === "editor"/);
});

test("display pages editor loads support panels only for the active panel tab", () => {
  assert.match(editorSource, /const shouldLoadAssetHealth = selectedWorkspace === "editor" && rightTab === "health"/);
  assert.match(editorSource, /const shouldLoadPublishingState = selectedWorkspace === "editor" && rightTab === "publish"/);
  assert.match(editorSource, /useDisplayPageAssetHealth\(\{ enabled: shouldLoadAssetHealth \}\)/);
  assert.match(editorSource, /useDisplayPagePublishingState\([\s\S]*\{ enabled: shouldLoadPublishingState/);
});

test("U5 toolbar publish check opens review without publishing", () => {
  assert.match(editorSource, /setRightTab\("publish"\);\s*\n\s*void refresh\(\);/);
  assert.doesNotMatch(editorSource, /onPublishCheck=\{\(\) => \{\s*\n\s*setRightTab\("publish"\);\s*\n\s*void publish\(\);/);
  assert.match(editorSource, /PublishReviewDrawer/);
  assert.match(editorSource, /onConfirmPublish=\{\(\) => \{ if \(canEdit && !dirty\) void publish\(\); \}\}/);
});

test("display pages editor support panel refresh failures preserve warm state lanes", () => {
  assert.match(publishingSource, /initialPublishingStateByPage \?\? \{\}/);
  assert.match(publishingSource, /setPublishingStateByPage\(\(current\) => \(\{ \.\.\.current, \[pageId\]: \{ fallback, validation: merged \} \}\)\)/);
  assert.match(publishingSource, /catch\(\(error\) => \{\s*\n\s*if \(active\) setPublishingError/);
  assert.doesNotMatch(publishingSource, /catch\(\(error\) => \{[\s\S]*setPublishingStateByPage\(\{\}\)/);
  assert.match(
    publishingSource,
    /publishDisplayPageDraft\(pageId, undefined, \{\s*\n\s*expectedVersion: preflight\?\.expectedVersion,\s*\n\s*preflightToken: preflight\?\.preflightToken,\s*\n\s*unsavedBindings/
  );
  assert.match(publishingSource, /validateDisplayPageDraft\(pageId, \{ unsavedBindings \}\)/);
  assert.match(assetHealthSource, /const \[report, setReport\] = useState<DisplayPageAssetHealthReport \| null>\(options\.initialReport \?\? null\)/);
  assert.match(assetHealthSource, /const hasInitialReport = options\.initialReport !== undefined/);
  assert.match(assetHealthSource, /setReport\(nextReport\)/);
  assert.match(assetHealthSource, /catch \(error\) \{\s*\n\s*setErrorMessage/);
  assert.doesNotMatch(assetHealthSource, /catch \(error\) \{[\s\S]*setReport\(null\)/);
});
