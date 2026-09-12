import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorToolbar } from "./EditorToolbar";

function renderToolbar(overrides: Partial<React.ComponentProps<typeof EditorToolbar>> = {}) {
  return renderToStaticMarkup(
    <EditorToolbar
      canEdit={true}
      isLoading={false}
      onReload={() => undefined}
      canRedo={false}
      canUndo={true}
      dirty={true}
      errorMessage=""
      isPublishing={false}
      isSaving={false}
      onPreview={() => undefined}
      onPublishCheck={() => undefined}
      onRedo={() => undefined}
      onSave={() => undefined}
      onUndo={() => undefined}
      pageLabel="總覽"
      publishBlocked={false}
      {...overrides}
    />
  );
}

test("U3-R1-S01 save remains on the toolbar while inspecting data", () => {
  const html = renderToolbar();
  assert.match(html, /data-editor-toolbar/);
  assert.match(html, /data-editor-toolbar-save/);
  assert.match(html, /儲存草稿/);
  assert.match(html, /檢查並發布/);
  assert.match(html, /有未儲存的草稿/);
  assert.doesNotMatch(html, /操作 tab|left actions/);
});

test("U5 dirty draft keeps publish action enabled for automatic persistence and preflight", () => {
  const dirtyToolbar = renderToolbar({ dirty: true, publishBlocked: false });
  assert.doesNotMatch(dirtyToolbar, /data-editor-toolbar-publish[^>]*disabled/);
  const savedToolbar = renderToolbar({ dirty: false, publishBlocked: false });
  assert.doesNotMatch(savedToolbar, /data-editor-toolbar-publish[^>]*disabled/);
});

test("U3-R1-S02 save failure keeps the error and unsaved state", () => {
  const html = renderToolbar({
    dirty: true,
    errorMessage: "儲存失敗，保留未儲存變更。"
  });
  assert.match(html, /儲存失敗，保留未儲存變更/);
  assert.match(html, /data-editor-toolbar-dirty="true"/);
  assert.doesNotMatch(html, /草稿已同步/);
});

test("U5 isSavingAndChecking displays saving-and-checking label and disables publish button", () => {
  const html = renderToolbar({ isSavingAndChecking: true });
  assert.match(html, /儲存並檢查中\.\.\./);
  assert.match(html, /data-editor-toolbar-publish[^>]*disabled/);
});
