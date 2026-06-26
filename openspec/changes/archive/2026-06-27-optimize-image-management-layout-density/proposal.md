## Why

解決圖片管理頁面中 `im-card-library`（左側卡片）資訊過多，導致最底部的圖片縮圖區域被嚴重擠壓、甚至完全看不見的問題。

## What Changes

- **移除大型 Handoff 橫幅**：移除卡片內原有的 `.im-handoff` 區塊，將「前往展示頁編輯器」連結與說明字樣縮小，以 inline 方式放在卡片標題列的右側。
- **合併控制項**：將「隨機播放 (Switch)」與「全部播放時間 (Input + Button)」使用 Flexbox 左右並排在同一行，釋放一行垂直空間。
- **精簡上傳入口**：因為右上角已經有醒目的「上傳圖片」按鈕，直接移除庫內佔用大量高度的 `.im-uploader` 拖曳虛線框，釋放大量高度。
- **緊湊化統計資訊**：使用專案共用的緊湊型 `.mgmt-stat-strip` 與 `.mgmt-stat` 樣式並縮小 Margin。

## Non-Goals (optional)

- 不修改 API、資料模型、`viewModel.ts` 輸出語意。
- 不修改右側編輯面版的顯示邏輯與行為。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
    - apps/web/src/pages/ImageManagement/imageManagement.css
