## Why

解決圖片管理頁面在 FHD (1920×1080) 播放機下，雙卡片佈局導致縮圖區過小、資訊割裂且視覺重心分散的問題。透過滿版單卡與側邊控制欄的深度整合，釋放極致的縮圖展示空間，提升 FHD 收斂品質。

## What Changes

- **單卡滿版重構**：合併原本的左側 library 卡片與右側 editor 卡片，成為一個寬度 `1820px`、高度 `740px` 的單一卡片 `im-card-full`。
- **左側自適應網格**：左側縮圖網格區高度拉滿 `100%`。未選取圖片時寬度為 `100%`，展現完整網格；選取圖片時寬度自動調整為 `70%`，騰出右側空間。
- **右側動態側邊控制欄**：右側側邊欄寬度固定為 `30%` (約 `540px` 寬)，負責承接所有全域與局部設定：
  - **全域治理模式（未選取圖片時）**：顯示全域統計條、隨機播放開關、全部播放時間設定、素材健康報告。
  - **單圖編輯模式（選取圖片時）**：顯示選取圖片的詳細資訊（預覽、標題/描述、playlist 順序與時間等）與操作動作，頂部提供「返回全域設定」按鈕。
- **FHD 版面微調**：微調 `imageManagement.css` 中元件的 flex 伸縮與 padding，確保在 `1920×838` 的 FHD settings 內容區域內，不產生任何垂直溢出。

## Non-Goals (optional)

- 不修改 API、資料模型、`viewModel.ts` 輸出語意。
- 不變更設定值的保存、套用、設為封面與刪除邏輯。

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
