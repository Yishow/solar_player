## Why

目前 5 個 display 頁面（`/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability`）的文案、hero、卡片、節點、縮圖與版位參數都分散在 page-local `layout.ts`、`assets.ts`、`viewModel.ts` 與 CSS 常數中。每次調整 slogan、背景圖、位置或尺寸都必須改 code，對營運或設計維護者來說成本高，也不利於後續持續維護。

但這五頁的畫面結構差異很大，若一次性以單一 generic editor 直接全做完，風險過高，也很難在第一輪就把互動模型、儲存契約與 runtime 套用方式做穩。因此這個 change 需要把 5 頁全部納入規畫與 contract，但以分 phase 方式逐頁完成，先建立 editor foundation，再依頁面型態向外擴展。

## What Changes

- 新增一條獨立於系統設定的 display page editor 能力，覆蓋 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 五個 playback/display 頁面。
- 在 display page editor 內提供頁面畫布式可視化編輯模式：維護者可按 `E` 進入或退出 edit mode，並直接對頁面上的 hero、slogan 區塊、背景圖、cards、nodes、connectors、thumbs 等組件看到對應的選取與編輯 UI。
- 建立 display page persisted config model，讓 shared fields 與 page-specific layout、文案、資產設定可被儲存與回讀，而不是只能依賴 hardcoded `layout.ts` / `assets.ts` 常數。
- 保留既有 playback runtime 契約；正式 display routes 仍沿用既有播放、offline、live metric/fallback 行為，只改成可讀取 persisted page config。
- 把 5 頁編輯能力拆成明確 phase：foundation、overview、solar、factory-circuit、images、sustainability，避免一次把所有 page-specific editor 混在同一步實作。

## Non-Goals

- 不在同一個實作步驟中同時完成所有頁面的 page-specific editor。
- 不把所有 CSS 細節都暴露成無限制自由座標表單。
- 不重寫 playback shell、route rotation、offline redirect 或既有 live metric contract。
- 不把 display editor 能力混進 `settings/playback`、`settings/mqtt`、`settings/circuits` 等系統設定頁語意。

## Capabilities

### New Capabilities

- `display-page-editor-foundation`: 定義獨立 display editor 入口、`E` 鍵切換、editor overlay、頁面切換、選取狀態與 inspector 基礎互動契約。
- `display-page-component-editing`: 定義五個 display 頁面的 persisted config、shared editor fields、page-specific editable regions 與 runtime 套用契約，並要求以 phased rollout 方式逐頁落地。

### Modified Capabilities

- (none)

## Impact

- Affected code:
  - New:
    - `apps/server/src/routes/display-pages.ts`
    - `apps/server/src/services/displayPageConfigService.ts`
    - `packages/shared/src/displayPageConfig.ts`
    - `apps/web/src/pages/DisplayPagesEditor/`
    - `apps/web/src/components/displayEditor/`
    - `apps/web/src/hooks/useDisplayEditor.ts`
  - Modified:
    - `apps/web/src/app/router.tsx`
    - `apps/web/src/app/routeMeta.ts`
    - `apps/web/src/services/api.ts`
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Overview/layout.ts`
    - `apps/web/src/pages/Overview/assets.ts`
    - `apps/web/src/pages/Overview/viewModel.ts`
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/pages/Solar/layout.ts`
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/pages/FactoryCircuit/layout.ts`
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/Images/layout.ts`
    - `apps/web/src/pages/Sustainability/index.tsx`
    - `apps/web/src/pages/Sustainability/layout.ts`
    - `packages/shared/src/index.ts`
  - Removed:
    - (none)
- Affected systems:
  - management shell navigation and route coverage for the new editor entry
  - display runtime rendering pipeline for the five playback pages
  - product configuration storage for display page layouts, copy, and assets
