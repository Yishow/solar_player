## Why

Sustainability 目前的 highlight rail 仍是固定四格摘要資料結構，只能承載 value、unit、label，無法容納模板化敘事卡，也無法被其他 display page 重用。若直接為 4 口之家卡片做特例，後續會同時維護舊 highlight 特例與新卡片特例，讓 display config、runtime 與 publishing contract 更難維護。

## What Changes

- 將目前 Sustainability 專用的 highlight rail 設定抽象成可共用的 card rail schema，支援 rail 容器 geometry、卡片可見性、排序、模板鍵、內容來源與每卡 frame。
- 新增可共用的 card rail runtime rendering contract，讓 display page 依卡片模板渲染 rail 內容，而不是只渲染固定四格摘要。
- 讓現有四格 highlight 正式成為 metric-highlight 模板，避免舊資料結構繼續以特例存在。
- 將 card rail 設定納入 display page draft/live publishing 與 publish-time validation contract，確保新 schema 能被安全保存與發布。

## Capabilities

### New Capabilities

- display-page-card-rail-templates: 定義可共用的 display page card rail 與模板化卡片 contract，供 runtime、publishing 與後續 editor authoring 共用。

### Modified Capabilities

- display-page-draft-live-publishing: 共用 display page 設定需能保存與發布 card rail schema，而不只支援既有固定 highlight 結構。
- display-page-layout-safety-guards: 發布前檢查需理解 card rail 內卡片 frame 與必填模板欄位，避免 rail 內容超出版面或缺少必要資料。

## Impact

- Affected specs: display-page-card-rail-templates, display-page-draft-live-publishing, display-page-layout-safety-guards
- Affected code:
  - New: packages/shared/src/displayPageCardRail.ts, apps/web/src/pages/shared/displayPageCardRailRenderer.tsx
  - Modified: packages/shared/src/displayPageConfig.ts, packages/shared/src/index.ts, apps/server/src/routes/display-pages.ts, apps/server/src/routes/display-pages.test.ts, apps/web/src/pages/Sustainability/displayPageConfig.ts, apps/web/src/pages/Sustainability/index.tsx, apps/web/src/pages/Sustainability/configRender.test.ts, apps/web/src/hooks/useDisplayPageConfig.test.ts
  - Removed: none
