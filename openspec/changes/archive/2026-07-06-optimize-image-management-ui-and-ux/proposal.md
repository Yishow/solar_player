## Summary

優化並美化 `/settings/images` 圖片管理與輪播治理頁面，提供縮圖 Hover 動態、HSL 配色標籤、全域統計卡片美化、前端關鍵字與狀態過濾器、黃色草稿標記、迷你焦點準星預覽、Playlist Row 快捷 Switch，以及膠囊步進器長按微交互。

## Motivation

提升 Solar Player 內容管理看板的視覺品質與操作效率，減少切換圖片時生硬的彈窗打斷感，提供即時的前端搜尋與快捷操作，並以更契合 SCADA 工業風格的精緻視覺感呈現。

## Proposed Solution

1. **視覺美化 (CSS)**：
   - 實作縮圖卡片 hover 微微上移、縮圖 `scale(1.03)` 放大與綠色光暈效果。
   - 微調 "封面"、"輪播中" 等標籤為半透明的 HSL 配色。
   - 將全域統計卡片改為帶有輕微內陰影與等寬字型的精緻儀表樣式。
   - 在網格末端設計一個與縮圖等大的虛線「上傳拖放卡片」，作為直觀入口。
   - 有未儲存變更時，儲存按鈕加上淡淡的綠色外發光呼吸脈動特效。
2. **操作與邏輯優化 (TSX & React)**：
   - 頂部加入 Search & Filter 工具列，純前端 `filter()` 處理圖片名稱與狀態。
   - 放寬切換圖片的彈窗警告，改以圖片縮圖 corners 的小黃點標識有修改的草稿，使用者可隨意切換、最後一併儲存。
   - 側邊欄圖片預覽區上方以絕對定位疊加一個 Focal Point 十字準星，直觀顯示裁剪中心。
   - 在 Playlist Row 卡片右側加入快捷啟用/停用播放之微型開關，減少操作步驟。
   - 步進器 `+` `-` 按鈕按壓時加入彈性縮放，並支援長按連續數值增減。

## Capabilities

### New Capabilities

- `image-management-ui-ux-optimization`: 針對 `/settings/images` 圖片管理與輪播治理頁面進行輕量美化與操作優化。

### Modified Capabilities

(none)

## Impact

- Affected specs: `image-management-ui-ux-optimization`
- Affected code:
  - Modified:
    - `apps/web/src/pages/ImageManagement/ImageManagementContent.tsx`
    - `apps/web/src/pages/ImageManagement/imageManagement.css`
