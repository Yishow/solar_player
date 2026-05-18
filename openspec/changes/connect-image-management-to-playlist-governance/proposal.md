## Why

一旦 `/images` 改吃 playlist runtime，`/settings/images` 若還只管理 raw image asset 而不管理 playlist entry metadata、fallback 與 display-facing ordering，操作員就無法完整控制實際播放內容。這會讓 MVP 落在「能播但不好管」的中間態。

## What Changes

- 讓 `Image Management` 同步讀取與更新 playlist-facing metadata，而不只管理 raw image asset 基本欄位。
- 明確區分 asset-level fields 與 playlist-level fields，避免管理頁把「檔案資訊」與「播放資訊」混成同一層語意。
- 在 destructive action 前同時考慮 live display references 與 playlist usage，避免移除圖片後才發現播放端還依賴該 entry。
- 補齊對應 UI、API client 與驗證，讓這個頁面成為 playlist domain 的正式治理入口之一。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `image-management-display-reference-integration`: 將 Image Management 從單純 asset library 管理，擴充為可治理 display-facing playlist reference 的管理面。

## Impact

- Affected specs: `image-management-display-reference-integration`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/ImageManagement/index.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`
  - Modified: `apps/web/src/pages/ImageManagement/viewModel.ts`
  - Modified: `apps/web/src/pages/ImageManagement/viewModel.test.ts`
