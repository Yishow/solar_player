## Why

五個展示頁目前多數只儲存 `src` 與 `alt` 字串，素材是否存在、該裁成什麼焦點、失效時怎麼降級，都分散在頁面 seed 與 runtime fallback 內。只靠手填字串不夠支撐日常維護，且會讓 Overview、Solar、Images、Sustainability 的素材行為持續不一致。

## What Changes

- 建立展示頁共用的 asset reference model，讓 hero image、main stage、thumbnail 與其他媒體欄位改為綁定受管理的素材識別，而不是直接保存裸 `src` 字串。
- 在管理端 editor 提供素材挑選、素材存在性檢查、替代圖設定與失效警示，讓維運人員能看見目前頁面依賴的實體素材狀態。
- 為展示頁媒體欄位補上 placement controls，包括 focal point、cover/contain、對齊方式與裁切安全區，使同一張素材能穩定套用在不同頁面版位。
- 補上素材健康檢查與引用報告，讓管理端能查出哪些頁面在引用不存在、停用或不符合尺寸建議的素材。

## Capabilities

### New Capabilities

- `display-page-asset-library-binding`: 提供展示頁媒體欄位綁定受管理素材、查詢素材與保存引用關係的能力。
- `display-page-media-placement-controls`: 提供展示頁媒體欄位的 focal point、fit mode、對齊與裁切安全區配置能力。
- `display-page-asset-health-reporting`: 提供素材存在性、引用狀態與不健康素材警示報告。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-asset-library-binding`, `display-page-media-placement-controls`, `display-page-asset-health-reporting`
- Affected code:
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`, `apps/web/src/pages/Overview/index.tsx`, `apps/web/src/pages/Solar/index.tsx`, `apps/web/src/pages/Images/index.tsx`, `apps/web/src/pages/Sustainability/index.tsx`, `apps/web/src/hooks/useDisplayPageConfig.ts`, `apps/web/src/services/api.ts`, `apps/server/src/routes/display-pages.ts`, `packages/shared/src/displayPageConfig.ts`
  - New: `apps/server/src/routes/display-page-assets.ts`, `apps/server/src/services/displayPageAssetService.ts`, `apps/web/src/pages/DisplayPagesEditor/assetPicker.tsx`, `apps/web/src/pages/DisplayPagesEditor/assetHealth.ts`
  - Removed: none
