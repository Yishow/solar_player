## Context

優化 `/settings/images` 頁面（[ImageManagementContent.tsx](file:///Users/yishow/prj/solar_player/apps/web/src/pages/ImageManagement/ImageManagementContent.tsx)）的視覺美感與交互。當前頁面在圖片修改切換時會強行彈窗阻擋，且缺乏過濾與直觀預覽，操作體驗不佳。

## Goals / Non-Goals

**Goals:**
* 提升視覺品質（Hover 微動態、HSL 配色標籤、全域統計卡片儀表化）。
* 增強操作效率（網格拖放卡片、儲存按鈕草稿發光提示、Playlist Row 快捷 Switch、步進器長按微交互）。
* 提升過濾效率（純前端即時搜尋過濾）。
* 放寬切換防呆，改用黃點標示草稿。
* 在側邊欄直觀預覽 Focal Point 裁剪中心。

**Non-Goals:**
* 不修改後端 API 與資料庫模型。
* 不引入複雜的拖拽時間線或 MQTT 即時插播邏輯。

## Decisions

### 1. 純前端關鍵字搜尋與狀態過濾
*   **決策**：在 React 元件層使用 `useMemo` 進行純前端的圖片 filter。
*   **理由**：圖片庫通常不超過數百張，純前端 filter 效能極佳且不需要新增或修改後端 API。

### 2. 側邊欄圖片 Focal Point 十字準心預覽
*   **決策**：在預覽圖容器 `.im-preview__media` 疊加一個絕對定位的 SVG 十字準心，位置透過 CSS `left: ${focalPoint.x}%`, `top: ${focalPoint.y}%` 控制。
*   **理由**：避免為了預覽焦點而被迫導向外部編輯器，提供立即的視覺回饋。

### 3. Playlist Row 卡片內嵌快捷開關
*   **決策**：在 Row 卡片直接渲染一個 `Switch`，直接觸發 `updatePlaylistEntryField`，不再強迫點選進入編輯。
*   **理由**：將常用的啟/停用輪播操作步驟從 3 步縮減為 1 步。

## Implementation Contract

*   **視覺行為 (CSS)**：
    *   `.im-thumb` 及其縮圖支援 CSS hover transform & shadow 過渡。
    *   `.mgmt-chip` 狀態標籤更換為 HSL 柔和色調。
    *   右下角「儲存」按鈕在 `isDirty` 時加入 `glow-pulse` 綠色呼吸燈發光。
*   **過濾行為**：
    *   提供一個輸入框搜尋 `title` 與 `description`，以及篩選下拉選單。
*   **草稿標記**：
    *   縮圖卡片在 `isDirty` 時，右上角顯示一個黃色圓點 `#d4a373`。

## Risks / Trade-offs

*   **[Risk] 移除切換彈窗阻擋可能導致使用者忘記儲存就離開頁面**  
    *   *Mitigation*：保留全域的路由阻擋 (Router Guard / useDisplaySyncDraftGuard)，但取消單純在網格切換選取圖片時的阻擋，並在儲存按鈕加上呼吸發光提示。
