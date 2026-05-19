## Why

即使 card family 已經開始收斂，5 個 display 頁的 hero title group、eyebrow、subtitle、gold line、leaf ornament、slide counter、period chips、status/provenance block 等 page chrome 仍全部寫死在 page-local CSS 與 component 中。這讓整頁設計語言仍無法透過 editor 做細部校正，也讓非 card 區塊的視覺一致性完全依賴程式碼調整。

## What Changes

- 為 5 個 display 頁新增可持久化的 page chrome override contract，覆蓋 hero typography、emphasis styling、eyebrow/subtitle rhythm、ornament sizing/offset，以及 page-specific chrome modules。
- 讓 `Overview`、`Solar`、`FactoryCircuit`、`Images`、`Sustainability` 在 editor 中可分頁調整 title group 與非資料綁定的 chrome 模組，同時保留既有內容文案與故事資料來源。
- 讓 counter、arrow、period chip、status/provenance block 等 page-specific chrome 在 preview/runtime 共享同一份 persisted appearance config，而不是只在 page-local CSS 中硬編碼。
- 補上 validation 與 reset 行為，確保 chrome overrides 缺漏時能回退到 seed baseline。

## Non-Goals

- 不處理 KPI/info card 內的 typography 與 icon source。
- 不處理 hero/main-stage 大圖的 source mode 與 placement controls。
- 不改故事資料、playlist runtime、period data source、socket/live metrics 綁定。
- 不重排行內幾何、region tree 或 shell/publish 流程。

## Capabilities

### New Capabilities

- `display-editor-page-chrome-overrides`: 讓 display editor 可持久化調整 5 個 display 頁的 hero chrome、ornament 與 page-specific chrome module appearance。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-page-chrome-overrides`
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/Solar/displayPageConfig.ts
    - apps/web/src/pages/Solar/index.tsx
    - apps/web/src/pages/Solar/solar.css
    - apps/web/src/pages/FactoryCircuit/displayPageConfig.ts
    - apps/web/src/pages/FactoryCircuit/index.tsx
    - apps/web/src/pages/FactoryCircuit/factoryCircuit.css
    - apps/web/src/pages/Images/displayPageConfig.ts
    - apps/web/src/pages/Images/index.tsx
    - apps/web/src/pages/Images/images.css
    - apps/web/src/pages/Sustainability/displayPageConfig.ts
    - apps/web/src/pages/Sustainability/index.tsx
    - apps/web/src/pages/Sustainability/sustainability.css
  - New:
    - apps/web/src/pages/shared/displayPageChromeConfig.ts
  - Removed: (none)
