## Why

目前 display pages 的可發布內容仍以既有 hero、card、media、rail 等 seed-backed regions 為主，沒有正式的 page-level 自由物件層，因此無法把上傳圖、線條或 icon 當作獨立內容物件加入頁面。若不先建立 page freeform objects 的資料契約、播放 render 與 publish validation，後續 editor 即使能新增物件，也沒有穩定的 live runtime 可以對接。

## What Changes

- 新增 display page freeform object runtime contract，讓每個 display page 可在 page config 內保存獨立的 freeform object list。
- 第一波支援三種 page objects：line、asset-image、icon-asset；其中 asset-image 可承載上傳的圖片或 SVG 來源。
- 新增 content-surface object rendering layer，讓 Overview、Solar、FactoryCircuit、Images、Sustainability 都能在既有頁面內容區顯示自由物件。
- 新增 publish validation，阻擋超出 FHD content bounds、來源 payload 無效或 layer ordering 不穩定的 page objects。

## Capabilities

### New Capabilities

- `display-page-freeform-object-rendering`: 定義 display pages 的自由物件儲存、播放與 publish 驗證契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-page-freeform-object-rendering
- Affected code:
  - New: packages/shared/src/displayPageObjects.ts, apps/web/src/components/DisplayPageObjectLayer.tsx, apps/web/src/components/DisplayPageObjectLayer.test.tsx, apps/server/src/services/displayPageObjectValidation.ts, apps/server/src/services/displayPageObjectValidation.test.ts
  - Modified: packages/shared/src/displayEditorSchema.ts, packages/shared/src/index.ts, apps/server/src/services/displayPagePublishingService.ts, apps/web/src/pages/Overview/index.tsx, apps/web/src/pages/Solar/index.tsx, apps/web/src/pages/FactoryCircuit/index.tsx, apps/web/src/pages/Images/index.tsx, apps/web/src/pages/Sustainability/index.tsx
  - Removed: none
