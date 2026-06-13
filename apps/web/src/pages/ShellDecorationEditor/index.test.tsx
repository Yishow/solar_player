import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { ImageAsset, ShellDecorationEnvelope } from "@solar-display/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  loadShellDecorationEditorData,
  publishShellDecorationEditorDraft,
  resolveShellDecorationAssetOptions,
  saveShellDecorationEditorDraft,
  ShellDecorationEditor
} from "./index";

function lineObject(id: string): ShellDecorationEnvelope["headerObjects"][number] {
  return {
    frame: { height: 2, left: 86, top: 24, width: 320 },
    id,
    locked: false,
    metadata: {},
    mount: "header",
    source: { kind: "line" },
    style: { color: "#d2b46a", thickness: 2 },
    type: "line",
    visible: true,
    zIndex: 1
  };
}

const routeMetaSource = readFileSync(path.join(import.meta.dirname, "../../app/routeMeta.ts"), "utf8");
const routerSource = readFileSync(path.join(import.meta.dirname, "../../app/router.tsx"), "utf8");
const runtimeSource = readFileSync(path.join(import.meta.dirname, "runtime.tsx"), "utf8");
const editorSource = readFileSync(path.join(import.meta.dirname, "index.tsx"), "utf8");
const previewCanvasSource = readFileSync(path.join(import.meta.dirname, "previewCanvas.tsx"), "utf8");

const initialDraft: ShellDecorationEnvelope = {
  footerObjects: [],
  headerObjects: [lineObject("header-line")],
  publishedAt: null,
  publishedBy: null,
  stage: "draft",
  updatedAt: "2026-05-26T00:00:00.000Z",
  version: 3
};

const initialAssets: ImageAsset[] = [
  {
    aspectRatio: 1.5,
    description: "shell ornament",
    displayDuration: 15,
    displayOrder: 1,
    fileSize: 1024,
    filename: "shell-ornament.png",
    height: 400,
    id: 7,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "shell-ornament.png",
    title: "殼層裝飾",
    usageScope: "shell-only",
    width: 600
  },
  {
    aspectRatio: 1.25,
    description: "page image",
    displayDuration: 15,
    displayOrder: 2,
    fileSize: 1024,
    filename: "page-only.png",
    height: 400,
    id: 8,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "page-only.png",
    title: "頁面專用",
    usageScope: "page-only",
    width: 500
  },
  {
    aspectRatio: 1.5,
    description: "missing file",
    displayDuration: 15,
    displayOrder: 3,
    fileSize: 1024,
    filename: null,
    height: 400,
    id: 9,
    includedInSlideshow: false,
    isCover: false,
    mimeType: "image/png",
    originalName: "draft-only.png",
    title: "沒有檔案",
    width: 600
  }
];

test("shell decoration editor exposes a dedicated authoring surface without display page selection", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/shell-decorations/editor"] },
      React.createElement(ShellDecorationEditor, {
        initialDraft,
        initialImages: initialAssets,
        renderPreview: false
      })
    )
  );

  assert.match(html, /共用殼層裝飾/);
  assert.match(html, /Shared Shell Decorations/);
  assert.match(html, /header-line/);
  assert.match(html, /頁首/);
  assert.match(html, /頁尾/);
  assert.match(html, /新增物件/);
  assert.match(html, /幾何/);
  assert.match(html, /厚度/);
  assert.doesNotMatch(html, /展示頁編輯/);
  assert.doesNotMatch(html, /切換五個展示頁畫布/);
});

test("shell decoration editor preview highlights the selected shell object at FHD geometry", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/shell-decorations/editor"] },
      React.createElement(ShellDecorationEditor, {
        initialDraft,
        initialImages: initialAssets,
        initialSelectedObjectId: "header-line"
      })
    )
  );

  assert.match(html, /data-shell-preview-surface="true"/);
  assert.match(html, /data-shell-band-guide="header"/);
  assert.match(html, /data-shell-band-guide="footer"/);
  assert.match(html, /data-shell-preview-selection="header-line"/);
  assert.match(html, /data-shell-measurement="header-line"/);
  assert.match(html, /W 320/);
  assert.match(html, /left:86px/);
  assert.match(html, /width:320px/);
});

test("resolveShellDecorationAssetOptions keeps asset-image picking typed and excludes unusable assets without files", () => {
  const options = resolveShellDecorationAssetOptions(initialAssets);

  assert.deepEqual(
    options.map((option) => option.assetId),
    [7]
  );
  assert.equal(options[0]?.fallbackSrc, "http://localhost:3000/uploads/images/shell-ornament.png");
  assert.equal(options[0]?.usageScope, "shell-only");
});

test("shell decoration editor asset picker renders gallery cards and preserves workspace context", () => {
  const draft: ShellDecorationEnvelope = {
    ...initialDraft,
    headerObjects: [
      {
        frame: { height: 40, left: 120, top: 12, width: 120 },
        id: "header-logo",
        locked: false,
        metadata: {},
        mount: "header",
        source: {
          assetId: 7,
          fallbackSrc: "http://localhost:3000/uploads/images/shell-ornament.png",
          kind: "asset-image"
        },
        style: {},
        type: "asset-image",
        visible: true,
        zIndex: 1
      }
    ]
  };
  const openedContexts: Array<string | null> = [];
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=shell"] },
      React.createElement(ShellDecorationEditor, {
        embedded: true,
        initialDraft: draft,
        initialImages: initialAssets,
        initialSelectedObjectId: "header-logo",
        onOpenAssetWorkspace: (context) => openedContexts.push(context),
        renderPreview: false
      })
    )
  );

  assert.match(html, /data-asset-picker-card="7"/);
  assert.doesNotMatch(html, /data-asset-picker-card="8"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /搜尋素材/);
  assert.match(html, /開啟資產庫/);
});

test("shell decoration editor can render inside an integrated editor workspace", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/display-pages/editor?workspace=shell"] },
      React.createElement(ShellDecorationEditor, {
        embedded: true,
        initialDraft,
        initialImages: initialAssets,
        renderPreview: false
      })
    )
  );

  assert.doesNotMatch(html, /data-shell-primitive="shell-decoration-editor"/);
  assert.match(html, /data-workspace-surface="shell-object-list"/);
  assert.match(html, /data-workspace-surface="shell-preview-context"/);
  assert.match(html, /data-workspace-surface="selection-board"/);
  assert.match(html, /header-line/);
  assert.match(html, /圖層順序/);
  assert.match(html, /移到最下層/);
  assert.match(html, /移到最上層/);
  assert.match(html, /共用殼層草稿已同步。/);
  assert.doesNotMatch(html, /正在同步共用殼層草稿/);
  assert.match(html, /儲存殼層草稿/);
  assert.match(html, /發布殼層正式版/);
});

test("shell decoration editor route remains as compatibility entry to the editor workspace", () => {
  assert.match(routeMetaSource, /path: "\/shell-decorations\/editor"/);
  assert.match(routeMetaSource, /navLabel: "殼層裝飾"/);
  assert.match(routerSource, /path: "shell-decorations\/editor"/);
  assert.match(routerSource, /<Navigate to="\/display-pages\/editor\?workspace=shell" replace \/>/);
  assert.match(runtimeSource, /ManagementShellFrame hideChrome/);
});

test("shell decoration editor workflow stays on shell draft services instead of display page draft services", () => {
  assert.match(editorSource, /getShellDecorationDraft/);
  assert.match(editorSource, /saveShellDecorationDraft/);
  assert.match(editorSource, /publishShellDecorations/);
  assert.doesNotMatch(editorSource, /useDisplayPageConfig/);
  assert.doesNotMatch(editorSource, /publishDisplayPageDraft/);
});

test("shell decoration preview drag syncs frame updates during pointermove instead of waiting for pointerup", () => {
  assert.match(
    previewCanvasSource,
    /const handlePointerMove = \(event: PointerEvent\) => \{[\s\S]*onUpdateObjectFrame\(interaction\.object\.id, nextObject\.frame\);/
  );
  assert.doesNotMatch(
    previewCanvasSource,
    /const handlePointerUp = \(\) => \{[\s\S]*onUpdateObjectFrame\(pending\.objectId, pending\.frame\);/
  );
});

test("shell decoration editor only syncs parent workspace state after initial data hydration", () => {
  assert.match(editorSource, /const \[hasHydratedInitialData, setHasHydratedInitialData\] = useState/);
  assert.match(editorSource, /if \(!hasHydratedInitialData\) \{\s+return;\s+\}\s+\n\s+onDraftChange\?\.\(draft\);/);
  assert.match(editorSource, /if \(!hasHydratedInitialData\) \{\s+return;\s+\}\s+\n\s+onImagesChange\?\.\(images\);/);
  assert.match(editorSource, /if \(!hasHydratedInitialData\) \{\s+return;\s+\}\s+\n\s+onSelectedObjectIdChange\?\.\(selectedObjectId\);/);
});

test("shell decoration editor load, save, and publish helpers stay scoped to shared shell draft services", async () => {
  const calls: string[] = [];
  const loaded = await loadShellDecorationEditorData(
    async () => {
      calls.push("load-draft");
      return initialDraft;
    },
    async () => {
      calls.push("load-images");
      return initialAssets;
    }
  );

  assert.deepEqual(calls, ["load-draft", "load-images"]);
  assert.equal(loaded.draft.version, 3);
  assert.equal(loaded.images.length, 3);

  const saved = await saveShellDecorationEditorDraft(initialDraft, async (channel, baseVersion) => {
    calls.push(`save:${baseVersion}:${channel.headerObjects.length}:${channel.footerObjects.length}`);
    return {
      ...initialDraft,
      version: baseVersion + 1
    };
  });

  assert.equal(saved.version, 4);

  const published = await publishShellDecorationEditorDraft(
    async () => {
      calls.push("publish");
      return {
        config: initialDraft,
        validation: { canPublish: true, findings: [] }
      };
    },
    async () => {
      calls.push("reload-draft");
      return {
        ...initialDraft,
        publishedAt: "2026-05-26T01:00:00.000Z",
        version: 5
      };
    }
  );

  assert.deepEqual(calls, [
    "load-draft",
    "load-images",
    "save:3:1:0",
    "publish",
    "reload-draft"
  ]);
  assert.equal(published.draft.version, 5);
  assert.equal(published.validation.canPublish, true);
});
