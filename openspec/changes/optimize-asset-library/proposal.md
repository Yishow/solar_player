## Why

現有的資產庫頁面（AssetLibrary）視覺風格較為單調，缺乏流暢的轉場動畫、拖曳上傳與批次管理功能，且在資料載入時缺乏骨架屏（Skeleton Loaders）等即時回饋，導致使用者體驗不佳。本變更旨在全面美化與優化資產庫的 UI/UX，特別是針對各項操作動線（如套用、刪除、屬性修改、引用排除與批次管理）進行深度體驗優化。

## What Changes

- **極致視覺優化**：導入磨砂玻璃擬態、微漸層與流暢的卡片 `hover` 微動畫（微幅放大、陰影加深與邊框漸層轉場）。
- **載入與上傳狀態回饋**：引入骨架屏載入效果（Skeleton Loaders）以及多檔案上傳時的進度條與狀態動畫。
- **整合式控制面板**：重構搜尋、分類、使用範圍與縮圖密度設定為一體化磨砂玻璃工具列，並在搜尋框加入清除按鈕與 SVG 圖示。
- **拖曳上傳 (Drag & Drop)**：新增拖曳圖片至列表中自動觸發上傳的互動體驗，上傳中顯示帶旋轉環與毛玻璃高光的虛擬進度卡片。
- **大圖燈箱預覽 (Lightbox)**：點擊圖片時可彈出大圖燈箱檢視，支援滑鼠拖曳、滾輪縮放與下載原圖。Hover 時提供詳細尺寸 Tooltip。
- **健康報告與引用視覺化**：將原本純文字的健康報告與引用資訊，以色彩編碼（安全綠、警告黃、錯誤紅）的精緻 Badge 與圖示重新設計。
- **雙擊與懸浮快捷操作**：支援雙擊卡片快速套用返回；安全素材 Hover 時可直接點擊垃圾桶刪除；有引用的鎖定素材 Hover 時顯示鎖頭防護。
- **一鍵直達引用跳轉**：將引用來源（References）卡片重構為 Action Links，點擊直接在新分頁打開編輯器定位至該引用組件。
- **資產屬性在線編輯**：右側詳情區支援標題/描述在線直接編輯（失焦自動存檔），分類與範圍可直接下拉切換同步更新後端 API。
- **批次選取操作防呆**：批次刪除模式下，自動禁用有引用的資產 checkbox，確保能勾選的皆可順利執行批次刪除。
- **全局鍵盤快速鍵**：支援 `/` 聚焦搜尋，`Esc` 清除搜尋與關閉燈箱。
- **空白狀態一鍵上傳**：當搜尋無結果或無素材時，展示虛線磨砂卡片，點擊直接喚起檔案上傳。
- **捲動遮罩與按鈕美化**：修正向下捲動時 ActionBar 的透明穿透缺陷，並全面提升按鈕的微陰影與按壓過渡動態質感。

## Capabilities

### New Capabilities

- `asset-library-enhancements`: 提供資產庫（Asset Library）的一系列 UI 美化、拖曳上傳、批次操作、大圖燈箱預覽與引用關係視覺化能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `asset-library-enhancements` (New)
- Affected code:
  - New:
    - `openspec/specs/asset-library-enhancements/spec.md`
    - `apps/web/src/pages/AssetLibrary/assetLibrary.css`
  - Modified:
    - `apps/web/src/pages/AssetLibrary/index.tsx`
    - `apps/web/src/pages/AssetLibrary/index.test.tsx`
    - `apps/web/src/styles/management.css`
