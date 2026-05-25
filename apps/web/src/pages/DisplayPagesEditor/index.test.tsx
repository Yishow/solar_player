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

function withMockWindow<T>(windowValue: Window & typeof globalThis, callback: () => T) {
  const target = globalThis as typeof globalThis & { window?: Window & typeof globalThis };
  const previousWindow = target.window;

  target.window = windowValue;
  try {
    return callback();
  } finally {
    target.window = previousWindow;
  }
}

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

  assert.match(html, />總覽</);
  assert.match(html, />太陽能</);
  assert.match(html, />工廠迴路</);
  assert.match(html, />展示圖像</);
  assert.match(html, />永續成果</);
  assert.match(html, /編輯模式關閉/);
  assert.ok(html.indexOf("編輯模式關閉") < html.indexOf(">總覽<"));
  assert.match(html, /按 E 啟用編輯模式/);
});

test("display page editor hides the page title block while edit mode is active", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialEditorState: {
          editMode: true
        },
        renderPreview: false
      })
    )
  );

  assert.doesNotMatch(html, /展示頁編輯/);
  assert.doesNotMatch(html, /切換五個展示頁畫布，並在同一頁完成區域選取、屬性調整與草稿發布。/);
  assert.match(html, /data-shell-primitive="management-scaffold"[^>]*class="[^"]*gap-4[^"]*pt-4[^"]*pb-5[^"]*h-full/);
  assert.doesNotMatch(html, /data-shell-primitive="management-scaffold"[^>]*class="[^"]*py-page-y/);
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

  assert.match(html, /區域樹/);
  assert.match(html, /主視覺圖片/);
  assert.match(html, />主視覺文案</);
  assert.match(html, /素材來源/);
  assert.match(html, /替代文字/);
  assert.match(html, /填滿模式/);
  assert.match(html, /複製幾何/);
  assert.match(html, /貼上位置/);
  assert.match(html, /貼上尺寸/);
  assert.match(html, /貼上完整框/);
  assert.match(html, /方向鍵 8px \/ Alt \+ 方向鍵 1px \/ Shift \+ 方向鍵 24px/);
  assert.match(html, /復原/);
  assert.match(html, /重做/);
  assert.match(html, /點中區域/);
  assert.match(html, /全畫參考/);
  assert.match(html, /吸附/);
  assert.match(html, /Guide/);
  assert.match(html, /邊界/);
  assert.match(html, /中心/);
  assert.match(html, /頁心線/);
  assert.match(html, /鎖定間距/);
  assert.match(html, /暫時量測/);
  assert.match(html, /左對齊/);
  assert.match(html, /右對齊/);
  assert.match(html, /上對齊/);
  assert.match(html, /下對齊/);
  assert.match(html, /水平分布/);
  assert.match(html, /垂直分布/);
  assert.match(html, /設計尺寸/);
  assert.doesNotMatch(html, /區域預設/);
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

  assert.match(html, /重點卡片列/);
  assert.doesNotMatch(html, /永續成果 重點卡片列/);
  assert.match(html, /今日綠電效益/);
  assert.match(html, /累積綠能成果/);
  assert.match(html, /新增卡片/);
  assert.match(html, /複製卡片/);
  assert.match(html, /刪除卡片/);
  assert.match(html, /卡片模板/);
  assert.match(html, /補充說明/);
  assert.match(html, /免責說明/);
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
  assert.doesNotMatch(html, /已鎖定區域無法直接修改/);
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

  assert.match(html, />總覽</);
  assert.match(html, />工廠迴路</);
  assert.match(html, /data-shell-primitive="app-header"/);
  assert.match(html, /data-shell-primitive="footer-nav"/);
  assert.doesNotMatch(html, /畫布預覽/);
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

  assert.match(html, /min-height:1080px/);
  assert.match(html, /min-width:1920px/);
});

test("display page editor restores the stored overlay preset when the editor opens again", () => {
  const html = withMockWindow(
    {
      localStorage: {
        getItem: () =>
          JSON.stringify({
            customHeight: 900,
            customWidth: 1600,
            designPreset: "custom",
            displayMode: "full-canvas",
            frameDensity: "strong",
            showAxes: false,
            showCenterLines: true,
            showRegionLabels: true
          }),
        removeItem: () => {},
        setItem: () => {}
      }
    } as unknown as Window & typeof globalThis,
    () =>
      renderToStaticMarkup(
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
      )
  );

  assert.match(html, /value="1600"/);
  assert.match(html, /value="900"/);
  assert.match(html, /全畫參考/);
  assert.match(html, /區域標籤/);
});

test("display page editor falls back to the default overlay preset when stored state is malformed", () => {
  const html = withMockWindow(
    {
      localStorage: {
        getItem: () => "{broken",
        removeItem: () => {},
        setItem: () => {}
      }
    } as unknown as Window & typeof globalThis,
    () =>
      renderToStaticMarkup(
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
      )
  );

  assert.match(html, /1920 × 1080/);
  assert.match(html, /點中區域/);
});

test("display page editor enables multi-select tools only when the initial selection contains enough regions", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      {
        initialEntries: ["/display-pages/editor?page=overview"]
      },
      React.createElement(DisplayPagesEditor, {
        initialEditorState: {
          editMode: true,
          selectedRegionId: "overview-hero-media",
          selectedRegionIds: ["overview-hero-media", "overview-hero-copy", "overview-summary"]
        },
        renderPreview: false
      })
    )
  );

  assert.match(html, /多選 3 區/);
  assert.match(html, /左對齊/);
  assert.match(html, /水平分布/);
  assert.doesNotMatch(html, /disabled=""[^>]*>左對齊</);
  assert.doesNotMatch(html, /disabled=""[^>]*>水平分布</);
});
