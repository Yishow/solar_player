import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  createSustainabilityDisplayPageSeedConfig,
  sustainabilityDisplayPageEditorRegions
} from "../Sustainability/displayPageConfig";
import { CardRailInspectorActions } from "./cardRailInspectorActions";
import { DisplayPagesEditor, type DisplayEditorPageDefinition } from "./index";
import { DisplayEditorInspectorFields, resolveDisplayEditorRegions } from "./inspectorFields";
import { DisplayEditorLeftPanel } from "./regionTree";

test("display page editor shell exposes the full rollout page switcher and idle inspector guidance", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(DisplayPagesEditor, {
        renderPreview: false
      })
    )
  );

  assert.match(html, />Overview</);
  assert.match(html, />Solar</);
  assert.match(html, />Factory Circuit</);
  assert.match(html, />Images</);
  assert.match(html, />Sustainability</);
  assert.match(html, /按 E 啟用編輯模式/);
});

test("display page editor shows blocking validation and fallback publishing status for the selected page", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialPublishingStateByPage: {
          overview: {
            fallback: {
              isFallbackActive: true,
              items: [
                { active: false, key: "staleData", mode: "show-placeholder" },
                { active: true, key: "emptyContent", mode: "hide" },
                { active: false, key: "missingAsset", mode: "show-seed" }
              ],
              pageId: "overview",
              stage: "live"
            },
            validation: {
              canPublish: false,
              findings: [
                {
                  code: "GEOMETRY_OUT_OF_BOUNDS",
                  message: "heroCopyLayout 超出畫布右邊界",
                  regionId: "heroCopyLayout",
                  severity: "blocking"
                }
              ]
            }
          }
        },
        renderPreview: false
      })
    )
  );

  assert.doesNotMatch(html, /draft 有 1 項 blocking 問題/);
  assert.doesNotMatch(html, /heroCopyLayout/);
  assert.doesNotMatch(html, /目前 live 正在 fallback/);
  assert.doesNotMatch(html, /emptyContent/);
  assert.doesNotMatch(html, /發布草稿/);
});

test("display page editor keeps the region tree selection and inspector in sync", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialEditorState: {
          editMode: true,
          selectedRegionId: "overview-hero-media"
        },
        renderPreview: false
      })
    )
  );

  assert.match(html, /Region Tree/);
  assert.match(html, /Overview Hero Media/);
  assert.match(html, /Source Mode/);
  assert.match(html, /Image Alt/);
  assert.match(html, /Fit Mode/);
  assert.match(html, /Reset Region/);
  assert.match(html, /Copy Geometry/);
  assert.match(html, /Undo/);
  assert.match(html, /Redo/);
  assert.match(html, /Region Presets/);
});

test("display page editor renders rail card hierarchy and template-aware controls for sustainability cards", () => {
  const seedConfig = createSustainabilityDisplayPageSeedConfig();
  const regions = resolveDisplayEditorRegions(
    seedConfig as unknown as Record<string, unknown>,
    sustainabilityDisplayPageEditorRegions,
    seedConfig as unknown as Record<string, unknown>
  );
  const selectedCard = regions.find((region) => region.id === "sustainability-highlight-rail/household-today");
  assert.ok(selectedCard);

  const html = renderToStaticMarkup(
    React.createElement("div", {}, [
      React.createElement(DisplayEditorLeftPanel, {
        dirty: false,
        editMode: true,
        errorMessage: "",
        isLoading: false,
        isPublishing: false,
        isPublishBlocked: false,
        isSaving: false,
        key: "tree",
        lockedRegionIds: [],
        message: "展示頁設定已同步。",
        onPublish: () => {},
        onReload: () => {},
        onSave: () => {},
        onSelectRegion: () => {},
        onToggleRegionLock: () => {},
        regions,
        selectedRegionId: selectedCard.id
      }),
      React.createElement(CardRailInspectorActions, {
        key: "actions",
        onAddCard: () => {},
        onDeleteCard: () => {},
        onDuplicateCard: () => {},
        onMoveEarlier: () => {},
        onMoveLater: () => {},
        onSelectTemplate: () => {},
        onToggleVisibility: () => {},
        selectedRegion: selectedCard,
        selectedRegionLocked: false
      }),
      React.createElement(DisplayEditorInspectorFields, {
        fields: selectedCard.fields,
        key: "fields",
        onChange: () => {}
      })
    ])
  );

  assert.match(html, /Sustainability Highlight Rail/);
  assert.match(html, /今日綠電效益/);
  assert.match(html, /累積綠能成果/);
  assert.match(html, /Add Card/);
  assert.match(html, /Duplicate Card/);
  assert.match(html, /Delete Card/);
  assert.match(html, /Card Template/);
  assert.match(html, /Supporting Line/);
  assert.match(html, /Disclaimer/);
});

test("locked regions remain selectable but do not expose resize interaction handles", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialEditorState: {
          editMode: true,
          lockedRegionIds: ["overview-hero-media"],
          selectedRegionId: "overview-hero-media"
        },
        renderPreview: false
      })
    )
  );

  assert.match(html, /已鎖定/);
  assert.match(html, /data-locked="true"/);
  assert.doesNotMatch(html, /Overview Hero Media resize handle/);
  assert.match(html, /Locked regions 無法直接改動/);
});

test("display page editor falls back to built-in page definitions when a caller passes an empty set", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(DisplayPagesEditor, {
        pageDefinitions: [],
        renderPreview: false
      })
    )
  );

  assert.match(html, />Overview</);
  assert.match(html, />Factory Circuit</);
  assert.match(html, /Canvas Preview/);
});

test("display page editor preview surface keeps positive minimum dimensions for preview widgets", () => {
  const pageDefinitions: DisplayEditorPageDefinition[] = [
    {
      createSeedConfig: () => ({}),
      id: "overview",
      label: "Overview",
      templateKey: "overview"
    }
  ];
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor"]
      },
      React.createElement(DisplayPagesEditor, {
        pageDefinitions,
        renderPreview: false
      })
    )
  );

  assert.match(html, /min-height:934px/);
  assert.match(html, /min-width:1920px/);
});
