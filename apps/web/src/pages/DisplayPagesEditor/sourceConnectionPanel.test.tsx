import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayEditorFieldSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  resolveSourceConnectionRows,
  resolveSourcePresentationSummary,
  SourceConnectionPanel
} from "./sourceConnectionPanel";
import type { ResolvedDisplayEditorField, ResolvedDisplayEditorRegion } from "./inspectorFields";

function field(
  schema: DisplayEditorFieldSchema,
  value: unknown
): ResolvedDisplayEditorField {
  return {
    dirty: false,
    path: schema.path,
    schema,
    value
  };
}

function region(fields: ResolvedDisplayEditorField[]): ResolvedDisplayEditorRegion {
  return {
    fields,
    id: "overview-hero-media",
    label: "Overview Hero Media",
    nodeType: "region",
    schema: {
      fields: fields.map((entry) => entry.schema),
      id: "overview-hero-media",
      label: "Overview Hero Media"
    }
  };
}

test("resolveSourceConnectionRows summarizes media source fields", () => {
  const selectedRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Source Mode", options: [], path: ["heroMedia", "sourceMode"] }, "seed-default"),
    field({ fieldType: "asset", id: "hero-asset", label: "Managed Asset", path: ["heroMedia", "assetId"] }, 42),
    field({ fieldType: "text", id: "hero-src", label: "Direct Src", path: ["heroMedia", "src"] }, "/uploads/images/hero.png")
  ]);

  assert.deepEqual(resolveSourceConnectionRows({ selectedRegion }), [
    { label: "來源模式", value: "seed-default" },
    { label: "已管理素材", value: "42" },
    { label: "直接來源", value: "/uploads/images/hero.png" }
  ]);
});

test("resolveSourceConnectionRows summarizes freeform managed asset objects", () => {
  assert.deepEqual(
    resolveSourceConnectionRows({
      freeformObject: {
        frame: { height: 80, left: 10, top: 10, width: 80 },
        id: "freeform-icon",
        locked: false,
        metadata: {},
        mount: "content",
        source: { assetId: 7, fallbackSrc: "/uploads/images/icon.png", kind: "icon-asset" },
        style: {},
        type: "icon-asset",
        visible: true,
        zIndex: 1
      },
      selectedRegion: null
    }),
    [
      { label: "來源模式", value: "icon-asset" },
      { label: "已管理素材", value: "7" },
      { label: "備援來源", value: "/uploads/images/icon.png" }
    ]
  );
});

test("SourceConnectionPanel renders actions and read-only presentation summaries", () => {
  const selectedRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Source Mode", options: [], path: ["heroMedia", "sourceMode"] }, "managed-asset"),
    field({ fieldType: "asset", id: "hero-asset", label: "Managed Asset", path: ["heroMedia", "assetId"] }, 42),
    field({ fieldType: "select", id: "hero-fit", label: "Fit Mode", options: [], path: ["heroMedia", "fitMode"] }, "cover"),
    field({ fieldType: "toggle", id: "hero-blur", label: "Blur Enabled", path: ["heroMedia", "effects", "blur", "enabled"] }, true)
  ]);

  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      editMode: true,
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion
    })
  );

  assert.match(html, /來源模式/);
  assert.match(html, /managed-asset/);
  assert.match(html, /從圖庫替換 \/ 開啟資產庫/);
  assert.match(html, /回復 seed\/default source/);
  assert.match(html, /呈現設定摘要/);
  assert.match(html, /填滿模式: cover/);
  assert.match(html, /模糊啟用: 啟用/);
  assert.doesNotMatch(html, /type="number"/);
});

test("SourceConnectionPanel explains unsupported selections", () => {
  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      editMode: true,
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion: region([])
    })
  );

  assert.match(html, /沒有可辨識的來源欄位/);
});
