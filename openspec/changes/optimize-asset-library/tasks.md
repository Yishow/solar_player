## 1. 樣式與視覺重構 (Styles & Visuals)

- [x] [P] 1.1 建立全新的 CSS 樣式檔案，以實作 `Decision: 導入 `assetLibrary.css` 進行客製化磨砂玻璃與微動效處理`，定義玻璃擬態的磨砂背景類別以及卡片 Hover 特效。驗證：在 `apps/web/src/pages/AssetLibrary` 目錄下成功建立並寫入 `assetLibrary.css`，並可透過內容審查確認樣式表結構完整。
- [x] 1.2 在 `index.tsx` 中載入樣式，並重構資產展示卡片結構以落實 `Interactive Glassmorphism UI and Micro-animations`，使卡片獲得滑順的 Hover 縮放與陰影漸變。驗證：在瀏覽器中啟動開發伺服器，手動懸停卡片，檢視動態 scale 與邊框漸層過渡動畫是否順暢。
- [x] 1.3 新增 Skeleton Card 元件並在資產同步載入時實作 `Skeleton Loading Indicators` 預留位置。驗證：在 `index.test.tsx` 中模擬資料正在同步載入的狀態（`isLoading: true`），並斷言畫面上成功渲染指定數量的 Pulsing 骨架屏卡片。

## 2. 交互控制與上傳體驗 (Interactive Controls & Upload)

- [x] 2.1 重構控制列以實作 `Unified Control Bar with Search Clear Action`。驗證：在搜尋框輸入文字時顯示 inline 的清除 X 按鈕，點擊該按鈕後清空搜尋內容並即時重整過濾結果。此行為應在 `index.test.tsx` 撰寫單元測試進行點擊事件模擬與斷言。
- [x] 2.2 在 `index.tsx` 中綁定 HTML5 原生拖曳事件，以實作 `Decision: 使用 HTML5 Drag and Drop API 實作全版拖曳上傳` 並滿足 `Drag and Drop File Upload` 要求。驗證：將圖片拖曳至資產庫時顯示帶虛線邊框的 Drag Overlay 提示，放開滑鼠後成功發起 `uploadManagedAsset` API 請求。

## 3. 媒體預覽與引用視覺化 (Media Preview & Visualization)

- [x] 3.1 實作預覽燈箱，以落實 `Decision: 實作輕量級 React Lightbox Modal 進行大圖檢視與鍵盤監聽` 並且實作 `Lightbox Modal and Hover Details`。驗證：點擊右側預覽圖彈出全螢幕遮罩大圖 Overlay，且點擊 close 按鈕或按 ESC 鍵可關閉；當滑鼠懸停於圖片上時，Tooltip 顯示 W x H 解析度與檔案大小。
- [x] 3.2 優化右側的引用與健康檢測資訊，實作 HSL 色彩 Badge，以滿足 `Color-Coded Health and Reference Badging`。驗證：在 `index.test.tsx` 或手動斷言當有 Live 或 Draft 引用時，對應的 `span` 帶有指定的 HSL 顏色樣式類別（如逆轉色彩、藍色），且有 blocker時顯示紅色邊框。

## 4. 批次操作功能 (Batch Actions)

- [x] 4.1 實作資產多選與批次刪除，以落實 `Decision: 引入 `isBatchMode` 狀態與選取集合以支援批次刪除` 並滿足 `Batch Action Mode` 的規範。驗證：進入批次模式後，卡片可多選勾選，並在底部滑出批次 Floating Action Bar。點擊批次刪除並在 Confirmatory Alert 確認後，循序調用 `deleteImageAsset` API 刪除所有選中的資產，並在 `index.test.tsx` 中加入對應 Mock API 被呼叫次數的斷言。

## 5. 操作流程與防呆優化 (Operational & UX Polish)

- [x] [P] 5.1 實作卡片雙擊行為，以滿足 `Double-Click Quick Apply` 規範，在嵌入模式下雙擊即可套用選中素材並返回。驗證：在 `index.test.tsx` 中模擬對 `AssetLibraryCard` 進行 `doubleClick` 事件，斷言觸發了 `onApplySelection` 回呼。
- [x] 5.2 實作懸浮快捷刪除垃圾桶與引用鎖頭圖示，點選垃圾桶時跳出自定義的毛玻璃確認 Dialog 以取代 `window.confirm`。驗證：滑鼠懸停於無引用的卡片時出現垃圾桶，點擊觸發自訂彈窗；若有引用則顯示鎖頭，且點擊垃圾桶不觸發選中事件（阻斷事件冒泡）。
- [x] [P] 5.3 實作引用來源 Action Links 跳轉，落實 `Color-Coded Health and Reference Badging with Actionable Redirects`。驗證：右側引用卡片中渲染出可點擊的 `Link` 或 `a`，在 `index.test.tsx` 斷言其包含正確的 `href` 並在新分頁打開。
- [x] 5.4 修改 API 型別以滿足 `Decision: 實作 Inline 編輯狀態與 API 更新對接`，並實作 `Inline Metadata and Attribute Editing` 包含標題、描述、分類與使用範圍的即時切換。驗證：在 `index.test.tsx` 中模擬點擊右側面板的 Title，進入編輯狀態輸入新文字並失焦，斷言觸發 `updateImageAsset` 呼叫；修改 Category 下拉選單後斷言即時觸發 API 傳送。
- [x] 5.5 實作上傳前的圖片規格智慧分析，落實 `Decision: 實作 HTML5 Drag and Drop API 與圖片異步預載機制` 及 `Smart Category Auto-Detection`。驗證：在 `index.test.tsx` 中模擬上傳尺寸為 128x128 像素的圖片，斷言預設分類狀態自動切換為 icon。
- [x] 5.6 在批次管理模式下加入防呆機制，以滿足 `Batch Action Mode with Preventative Disabling` 的要求。驗證：在批次選取模式下，已被引用的卡片 checkbox 會被設為 `disabled` 且卡片透明度降低，在 `index.test.tsx` 中對被引用卡片斷言 checkbox 有 `disabled=""` 屬性。
- [x] [P] 5.7 實作全局鍵盤事件監聽，落實 `Keyboard shortcuts for search query` 快捷鍵機制。驗證：在 `index.test.tsx` 模擬按下 `/` 鍵，斷言搜尋 input 成功 focus；搜尋框 focus 時模擬按 `Escape` 鍵，斷言 input 被 clear 並 blur。
- [x] [P] 5.8 重構無資料狀態，落實 `Empty State Upload Trigger` 一鍵觸發上傳檔案。驗證：模擬沒有素材的狀態，點擊 Empty State Board 虛線卡片，斷言成功觸發 `fileInput.current.click()`。
- [x] [P] 5.9 修正往下捲動時 ActionBar 的透明穿透缺陷，落實 `Scroll Overlay Protection and Unified Button Aesthetics` 與 `Decision: 實作獨立滾動區與毛玻璃粘滯 ActionBar 遮蔽設計`。驗證：在 `index.test.tsx` 中斷言 `WorkspaceActionBar` 不再使用透明無框的 class，且控制按鈕套用了新的 `.asset-btn-primary` 和 `.asset-btn-secondary` 類別，單元測試正常通過。
