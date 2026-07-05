## 1. 視覺與美學微調 CSS 實作

- [x] 1.1 實作縮圖卡片 hover 與標籤 HSL 配色 (對應 Interactive visual styling alignment)：修改 `imageManagement.css` 中的 `.im-thumb` 及 `.mgmt-chip`。滑鼠移入圖片時縮圖平滑放大 `1.03` 倍並伴隨綠色微光暈。驗證：手動在瀏覽器 hover 圖片縮圖確認 transition 動畫流暢，且 badge 轉為半透明 HSL 調色。
- [x] 1.2 統計卡片儀表化與網格拖放卡片樣式：修改 `imageManagement.css` 為 `.im-stats` 加入內陰影與等寬字型，並在縮圖網格最後一格渲染虛線「上傳拖放卡片」樣式。驗證：確認統計資訊小卡有精緻內陰影，且網格末端顯示拖放提示框。
- [x] 1.3 儲存按鈕草稿發光 (Glow Save Button) 特效：在 `imageManagement.css` 中實作當側邊欄有草稿變更時，儲存按鈕加上淡淡的綠色外發光呼吸脈動特效。驗證：在瀏覽器修改欄位後，確認儲存按鈕觸發呼吸發光，儲存後發光消失。

## 2. 搜尋、篩選與草稿流調整

- [x] 2.1 實作 1. 純前端關鍵字搜尋與狀態過濾 (對應 Real-time client-side filter)：在 `ImageManagementContent.tsx` 頂部渲染搜尋 input 與狀態 select，僅透過純前端 React 狀態過濾 `assets` 網格渲染。驗證：在搜尋框輸入名稱或篩選「僅封面」時，網格能即時且無 API 請求地顯示符合條件的圖片。
- [x] 2.2 放寬切換圖片警告並標記黃色草稿點 (對應 Real-time client-side filter)：在 `ImageManagementContent.tsx` 中取消在網格切換圖片選取時的彈窗警告阻擋，改在縮圖右上角若是 `isDirty` 狀態，顯示一個圓形黃色小草稿點。驗證：修改圖片標題後可直接點選其他圖片，原修改圖片右上角顯示黃點，點選「儲存」後黃點消失。

## 3. 側邊欄焦點預覽與 Playlist Row 快捷 Switch

- [x] 3.1 實作 2. 側邊欄圖片 Focal Point 十字準心預覽 (對應 Improved focal point visual indicator)：在 `ImageManagementContent.tsx` 的 `.im-preview__media` 預覽圖上方，利用絕對定位疊加半透明十字準星 SVG，其 top/left 位置由當前圖片的 `focalPoint` 數據驅動。驗證：點選不同焦點設定的圖片，側邊欄預覽圖上顯示正確比例的十字準心定位。
- [x] 3.3 實作 3. Playlist Row 卡片內嵌快捷開關 (對應 Playlist Row quick toggle)：在 `ImageManagementContent.tsx` 的 Playlist Row 清單小卡片右側，直接渲染一個微型開關，點擊時直接驅動 `updatePlaylistEntryField` 變更啟用狀態，並標記為 draft dirty。驗證：直接點擊 Playlist Row 小卡上的開關，確認該 row 狀態即時切換且觸發 dirty 標記。
- [x] 3.4 步進器長按微互動支援 (對應 Playlist Row quick toggle)：在步進器上新增 `onMouseDown` 與數值增減計時器，實現按壓縮小回饋與長按連續變更數值。驗證：按壓 `+` `-` 按鈕有物理縮小感，且長按時秒數會自動連續遞增或遞減。
