## Context

現有的資產庫管理頁面（AssetLibrary）雖然具備基本的篩選與單檔刪除功能，但在實際的「展示編輯/媒體管理」操作動線上存在許多阻礙與斷點。本設計旨在徹底重構操作邏輯，提升管理效率，加強操作防呆，並在視覺上以極致的細節打磨，帶來一流的操作體驗。

## Goals / Non-Goals

**Goals:**
- **操作動線閉環**：實作雙擊快速套用、被引用位置「一鍵直達」跳轉編輯，消除無效的頁面返回與手動搜尋路徑。
- **動態懸浮快捷操作**：Hover 素材時顯示直接刪除或鎖定防護，省去跨面板的繁雜操作。
- **在線屬性直接編輯**：在右側面板提供 inline 標題/描述編輯與類別/範圍即時切換，避免因配置錯誤需刪除重傳。
- **智慧預判與防呆**：上傳時自動分析圖片尺寸與檔名以預測分類；批次模式下自動禁用有引用的 checkbox 以防操作失敗。
- **全局快捷鍵支持**：引入鍵盤快速鍵以加速搜尋與視窗清除/關閉。
- **視覺整合**：在無資料時提供一鍵觸發檔案選擇器的空白狀態面板。

**Non-Goals:**
- 不改變後端 API 的路由架構與通訊協定，完全使用現有的 SQLite 資料庫讀寫邏輯。
- 不更動前端核心的 Layout 路由外層。

## Decisions

### Decision: 導入 `assetLibrary.css` 進行客製化磨砂玻璃與微動效處理
- **說明**：建立專屬樣式表定義 `.asset-library-card` (包含 transition 動態 hover 縮放縮小效果)、`.asset-library-glass` (玻璃擬態控制列)、`.asset-batch-bar` (批次操作列) 以及 `.asset-drag-overlay` (流動虛線框)，避免行內樣式凌亂，便於視覺微調。
- **替代方案**：使用 Tailwind 輔助類。但 Tailwind 對複雜的 CSS 動畫與 HSL 特效定義較繁雜，抽離成獨立的 CSS 更易於維護與調整。

### Decision: 實作 HTML5 Drag and Drop API 與圖片異步預載機制
- **說明**：當檔案拖曳至面板時顯示 overlay 提示。圖片被選取上傳時，使用瀏覽器的 `Image` 對象異步載入，取得圖片真正的 `naturalWidth` 與 `naturalHeight`，以便進行智慧分類檢測。
- **替代方案**：完全交由使用者手動設定分類。但這在實際操作中容易因忘記而產生大量錯誤歸類，自動預判是更好的 UX 選擇。

### Decision: 實作輕量級 React Lightbox Modal 進行大圖檢視與鍵盤監聽
- **說明**：點擊預覽圖打開 lightbox。在 React 層面使用全局鍵盤事件監聽 `keydown`，若 `e.key === 'Escape'` 且燈箱開啟時自動關閉燈箱。
- **替代方案**：使用第三方 React 燈箱套件。但為維持 KISS 原則與專案的輕量化，手寫 modal 具有極高的客製彈性與低依賴性。

### Decision: 引入 `isBatchMode` 狀態與選取集合以支援批次刪除
- **說明**：在 `AssetLibrary` 元件內維護 `isBatchMode: boolean` 與 `batchSelectedIds: Set<number>`。當開啟批次管理時，遍歷資產清單，若資產 `usageSummary.referenceCount > 0` 則 checkbox 強制設為 `disabled` 並顯示鎖定提示，確保使用者能勾選的皆為安全素材，實現真正的「防呆機制」。
- **替代方案**：允許勾選所有資產，並在執行刪除時遇到錯誤才進行提示。但這會導致使用者需要手動篩選除錯，體驗極差。

### Decision: 實作 Inline 編輯狀態與 API 更新對接
- **說明**：將右側選中資產的 Title 區塊改造為具有編輯狀態的元件。雙擊或點擊編輯按鈕後進入 `isEditingTitle: boolean` 狀態，利用 `<input>` 對接。在失焦（`onBlur`）或按 `Enter` 鍵時，立即觸發 `updateImageAsset(id, { title })` API，並重新執行同步更新。
- **替代方案**：提供一個「編輯」彈窗。但這會打斷使用者的檢視焦點，採用 inline 編輯更能融入原有的面板排版。

### Decision: 實作獨立滾動區與毛玻璃粘滯 ActionBar 遮蔽設計
- **說明**：為解決滾動穿透與文字重疊缺陷，將 `WorkspaceActionBar` 設為非透明背景且具有 `z-index: 20` 的毛玻璃遮蔽，或者在 `WorkspacePanel` 下引入獨立的滾動 content 包裹器，徹底隔絕 Header 與捲動內容的交叉重疊。同時，在 `assetLibrary.css` 中統一定義 `.asset-btn-primary` 和 `.asset-btn-secondary` 高級類別。
- **替代方案**：完全使用 static 排版。但這在圖片極多時會因往下滾動而看不見功能按鈕，影響操作便利性。

## Implementation Contract

- **行為 (Behavior)**：
  - **雙擊套用**：在嵌入模式下，雙擊卡片觸發 `onApplySelection` 並返回。
  - **懸浮刪除/鎖頭**：無引用的圖片 Hover 右上角顯示垃圾桶按鈕（阻止冒泡事件）；有引用的圖片 Hover 顯示鎖頭 Tooltip。
  - **引用 Action Links**：右側引用清單根據引用類型（`kind`）生成對應的新分頁超連結。
  - **在線屬性編輯**：雙擊右側詳情區的標題變編輯框，按 `Enter` / 失焦自動保存；Category / UsageScope 變更Dropdown時即刻呼叫 API。
  - **智慧規格檢測**：上傳小於 256x256 預選為 icon，大於 800px 且橫圖預選為 background。
  - **批次刪除防呆**：批次模式下，有引用的卡片 checkbox 設為 disabled 且降低透明度，防止點選。
  - **鍵盤快捷鍵**：按 `/` 聚焦搜尋，`Esc` 清除搜尋並 blur。
  - **空狀態點選上傳**：無資料時點選虛線框觸發上傳檔案。

- **資料結構與型別擴充**：
  - 在 `apps/web/src/services/api.ts` 的 `updateImageAsset` 型別參數中，擴充型別以支援 `category` 與 `usageScope` 欄位。

- **驗證標準 (Acceptance criteria)**：
  - 單元測試必須撰寫並覆蓋上述所有新增的操作邏輯與狀態變更，包含雙擊事件、快捷鍵觸發、批次防呆 disabled 狀態以及 metadata 顯示。

- **範疇邊界 (Scope boundaries)**：
  - 僅修改 `apps/web/src/pages/AssetLibrary` 下的 React 元件與樣式表，以及 `apps/web/src/services/api.ts` 的型別定義。
