import assert from "node:assert/strict";
import test from "node:test";
import type { DisplayEditorFieldSchema } from "../../../../../packages/shared/src/displayEditorSchema";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  resolveSourceConnectionRegion,
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
    { label: "預設來源", value: "總覽 主視覺圖片預設素材" },
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
  assert.match(html, /回復預設素材來源/);
  assert.match(html, /呈現設定摘要/);
  assert.match(html, /填滿模式: cover/);
  assert.match(html, /模糊啟用: 啟用/);
  assert.doesNotMatch(html, /type="number"/);
});

test("SourceConnectionPanel summarizes composable effect layers without rendering editable effect controls", () => {
  const selectedRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Source Mode", options: [], path: ["heroMedia", "sourceMode"] }, "managed-asset")
  ]);
  selectedRegion.schema.mediaEffectSurface = {
    bindingPath: ["heroMedia"],
    status: "supported",
    support: {
      blur: {
        zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges", "full-frame"]
      },
      fade: {
        zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges"]
      },
      mist: {
        zones: ["top", "bottom", "left", "right", "top-bottom", "left-right", "all-edges"]
      },
      opacity: {
        zones: ["full-frame"]
      }
    }
  };

  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      availableRegions: [selectedRegion],
      config: {
        heroMedia: {
          effects: {
            layers: [
              { blur: 16, coverage: 0.3, feather: 0.58, kind: "mist", strength: 0.72, zone: "top" },
              { kind: "opacity", strength: 0.88, zone: "full-frame" }
            ]
          }
        }
      },
      editMode: true,
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion
    })
  );

  assert.match(html, /效果摘要/);
  assert.match(html, /效果層 1/);
  assert.match(html, /霧化 \/ 上緣/);
  assert.match(html, /效果層 2/);
  assert.match(html, /透明度 \/ 全畫面/);
  assert.doesNotMatch(html, /新增效果層/);
});

test("SourceConnectionPanel keeps icon source selections replaceable when the schema supports managed assets", () => {
  const selectedRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Icon Source Mode", options: [], path: ["heroIcon", "mode"] }, "page-icon-key"),
    field({ fieldType: "select", id: "hero-icon-registry", label: "Icon Registry", options: [], path: ["heroIcon", "registry"] }, "factory-circuit"),
    field({ fieldType: "select", id: "hero-icon-key", label: "Page Icon Key", options: [], path: ["heroIcon", "iconKey"] }, "generation")
  ]);
  selectedRegion.schema.fields = [
    { fieldType: "select", id: "hero-source-mode", label: "Icon Source Mode", options: [
      { label: "Managed Asset", value: "managed-asset" },
      { label: "Page Icon Key", value: "page-icon-key" }
    ], path: ["heroIcon", "mode"] },
    { fieldType: "asset", id: "hero-icon-asset", label: "Managed Icon Asset", path: ["heroIcon", "assetId"] }
  ];

  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      editMode: true,
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion
    })
  );

  assert.match(html, /從圖庫替換 \/ 開啟資產庫/);
  assert.doesNotMatch(html, /此來源型別尚未支援管理素材替換/);
});

test("resolveSourceConnectionRegion links geometry-only container selections to the replaceable source region", () => {
  const containerRegion = region([
    field({ fieldType: "number", id: "hero-width", label: "Width", path: ["heroContainer", "width"] }, 640)
  ]);
  containerRegion.id = "overview-hero-container";
  containerRegion.label = "Overview Hero Container";
  containerRegion.schema = {
    ...containerRegion.schema,
    geometry: {
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"],
      resizeMode: "both"
    }
  };

  const mediaRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Source Mode", options: [], path: ["heroMedia", "sourceMode"] }, "seed-default")
  ]);
  mediaRegion.schema = {
    ...mediaRegion.schema,
    geometry: {
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"],
      resizeMode: "both"
    },
    fields: [
      {
        fieldType: "select",
        id: "hero-source-mode",
        label: "Source Mode",
        options: [
          { label: "Managed Asset", value: "managed-asset" },
          { label: "Seed Default", value: "seed-default" }
        ],
        path: ["heroMedia", "sourceMode"]
      }
    ]
  };

  assert.equal(
    resolveSourceConnectionRegion(containerRegion, [containerRegion, mediaRegion])?.id,
    "overview-hero-media"
  );
});

test("SourceConnectionPanel explains when the source settings are linked from a geometry container selection", () => {
  const containerRegion = region([
    field({ fieldType: "number", id: "hero-width", label: "Width", path: ["heroContainer", "width"] }, 640)
  ]);
  containerRegion.id = "overview-hero-container";
  containerRegion.label = "Overview Hero Container";
  containerRegion.schema = {
    ...containerRegion.schema,
    geometry: {
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"],
      resizeMode: "both"
    }
  };

  const mediaRegion = region([
    field({ fieldType: "select", id: "hero-source-mode", label: "Source Mode", options: [], path: ["heroMedia", "sourceMode"] }, "seed-default")
  ]);
  mediaRegion.schema = {
    ...mediaRegion.schema,
    geometry: {
      heightPath: ["heroContainer", "height"],
      leftPath: ["heroContainer", "left"],
      topPath: ["heroContainer", "top"],
      widthPath: ["heroContainer", "width"],
      resizeMode: "both"
    },
    fields: [
      {
        fieldType: "select",
        id: "hero-source-mode",
        label: "Source Mode",
        options: [
          { label: "Managed Asset", value: "managed-asset" },
          { label: "Seed Default", value: "seed-default" }
        ],
        path: ["heroMedia", "sourceMode"]
      }
    ]
  };

  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      availableRegions: [containerRegion, mediaRegion],
      editMode: true,
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion: containerRegion
    })
  );

  assert.match(html, /目前畫布選到的是版位容器/);
});

test("SourceConnectionPanel renders freeform object sources without requiring a selected region", () => {
  const html = renderToStaticMarkup(
    React.createElement(SourceConnectionPanel, {
      editMode: true,
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
      onJumpToProperties: () => {},
      onOpenAssetLibrary: () => {},
      onRestoreSeedDefault: () => {},
      selectedRegion: null
    })
  );

  assert.match(html, /自由圖示物件/);
  assert.match(html, /來源模式/);
  assert.match(html, /icon-asset/);
  assert.doesNotMatch(html, /請先選取畫布區域或自由物件/);
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
