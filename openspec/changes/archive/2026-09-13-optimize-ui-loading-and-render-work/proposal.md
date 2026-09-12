## Summary

改善展示編輯器工作區載入、拖曳 overlay 計算及 AssetLibrary 選取渲染成本，保留修正後的 UI 行為與 FHD 配置。以 fix-ui-draft-and-interaction-consistency 的已驗證結果作基線，先留下可重現量測，再交付可證明減少等待/重算的實作。

## Motivation

現行程式已有 route lazy loading、workspace gating、React.memo、圖片 lazy/async 與 displayEditorProfiler，不需要重做這些機制。回讀程式碼仍發現：
- loadDisplayPagesEditorRoute 在 assets/shell 工作區也先等待 registry 與頁面 draft，assets 又串行等待 image model 及 health。
- useDisplayEditorCanvasWorkflow 每次 pointermove 更新 feedback，resolveDisplayEditorOverlayState 會重建 frames/page guides，inspectorFields 的 overlay 逐 region 查找 frame。
- AssetLibraryCard 已 memo，但父層每次 render 建立 batch handler 與各卡 delete callback，使未變動卡片也取得新 props。

這些是 source-level 工作量證據；本提案尚無載入毫秒、CPU 或掉幀改善的實測數字，不預先聲稱效能提升百分比。

## Proposed Solution

- 依 editor/assets/shell 工作區啟動必要讀取，讓 frame、導覽及暖快取內容先顯示；診斷資料獨立載入，保留初始 draft gate、access gate、deep links 與錯誤回復。
- 拆分靜態 overlay 基礎與活動拖曳 feedback；session 內重用未變動 frames/guides，依動畫幀合併視覺更新，pointerup 仍提交最後事件的精確座標。
- 穩定 AssetLibrary 的 batch/delete callbacks，必要時只抽取 card 元件便於量測，讓未變動卡片的 memo 生效；保留 lazy thumbnails、DOM/樣式、批次刪除保護與素材回傳。
- 延伸既有 opt-in profiler 與 browser smoke fixture 產生前後量測報告，檢查事件/渲染次數、request counts、duration 與輸出等價；不新增全域遙測。

### New Capabilities

- `ui-performance-evidence`: 固定環境與資料的前後量測、可驗證工作量上限及誠實報告。

### Modified Capabilities

- `display-editor-staged-loading`: 工作區需要的讀取不阻塞首次 shell、診斷不阻塞可用內容。
- `display-editor-drag-commit-on-release`: overlay session 重用與動畫幀合併維持最終座標/undo。
- `management-surface-render-invariance`: AssetLibrary 選取時未變動 cards 避免重新渲染。

## Impact

- Affected specs: ui-performance-evidence, display-editor-staged-loading, display-editor-drag-commit-on-release, management-surface-render-invariance
- Affected code:
  - Modified: apps/web/src/app/router.tsx
  - Modified: apps/web/src/layouts/ManagementShell.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/runtime.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
  - Modified: apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
  - Modified: apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/displayEditorProfiler.tsx
  - Modified: apps/web/src/pages/AssetLibrary/index.tsx
  - New: apps/web/src/pages/DisplayPagesEditor/workspaceLoadPlan.ts
  - New: apps/web/src/pages/DisplayPagesEditor/canvasOverlaySession.ts
  - New: apps/web/src/components/management/ManagementRouteState.tsx
  - New: apps/web/src/pages/AssetLibrary/AssetLibraryCard.tsx
  - New: tests/browser/ui-performance.spec.ts
- Measurement: 使用現有 playwright.config.ts 與 scripts/run-browser-smoke.mjs 的隔離執行方式；新增測試及報告，不改 production data、配對或部署。
- Dependency: 先完成 fix-ui-draft-and-interaction-consistency 的工程驗證與基線 witness；本案不得以效能理由回退該案的草稿/鍵盤/圖表修正。
