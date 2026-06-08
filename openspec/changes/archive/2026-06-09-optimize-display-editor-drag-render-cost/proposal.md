## Summary

降低 DisplayPagesEditor 與 ShellDecorationEditor 在 canvas 拖曳期間的 render 成本：拖曳進行中改以 local 視覺回饋驅動，僅在 pointerup 時將最終結果 commit 進主 config/draft state，避免每 pointermove（約 60fps）觸發整個 editor 樹（左側 object list、右側 inspector、overlay）重繪。

## Motivation

兩個 editor 在拖曳時都對主狀態做 per-frame 寫入：

- `apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts` 的 pointermove handler 每一 frame 同時 `setCanvasInteractionFeedback(...)` 與 `applyConfigUpdate((current) => applyRegionRect(...), { recordHistory: false })`。後者每秒約 60 次更新主 config state，連帶觸發 `index.tsx` 內 `editableRegions` / `editableFreeformObjects` / `selectedRegion` 等 derived 計算與整棵 editor 樹（含 inspector 與 overlay）重繪。pointerup 已有一次帶 history 的 commit（同檔），代表「最終值才需進 history」的概念已存在，缺的是「拖曳中不寫主 config」。
- `apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx` 的 pointermove handler 每一 frame 呼叫 `onUpdateObjectFrame(...)`，於 `apps/web/src/pages/ShellDecorationEditor/index.tsx` 透過 `applyChannel` → `setDraft` 更新整個 draft envelope，使整個 editor 重繪；此處目前完全沒有「pointerup 才提交」的機制。

此外兩個 editor 的子元件（object list、inspector、preview canvas、overlay）皆無 `React.memo`，且大量 handler 為 inline 重建，使父層任一 state 變動即 cascade 重繪。拖曳是 editor 互動中最高頻的事件，per-frame 主狀態寫入是目前最明顯的卡頓來源。

## Proposed Solution

1. **DisplayPagesEditor 拖曳改為 commit-on-release**：拖曳期間僅以 local interaction/overlay state 呈現即時矩形回饋，不再每 frame 呼叫 `applyConfigUpdate`；於 pointerup 時做單次 `applyConfigUpdate` 並記入 history。pointermove effect 以 ref 持有 regions/config，避免 `regions` 變動造成 effect 重新註冊。
2. **ShellDecorationEditor 拖曳改為 commit-on-release**：拖曳期間以 local frame state 驅動 preview，pointerup 才 `onUpdateObjectFrame` → `setDraft` 提交一次最終 frame。
3. **Editor 子樹 memo 化與 handler 穩定化**：為 object list、inspector fields、preview canvas、overlay 等子元件加 `React.memo`，並將傳入的 handler 以 `useCallback` 穩定化，使非拖曳互動（選取、欄位編輯）也只重繪受影響子樹。
4. overlay 重型計算（snap targets、frames/guides）在單次拖曳 session 內以 ref/memo 快取，避免每 frame 重算 region 幾何。

驗證以 editor 既有 web tests 全綠為基準,並以手動/瀏覽器 witness 確認拖曳結果、undo/redo、選取與欄位編輯行為與現狀一致。

## Non-Goals

- 不改 editor 的資料模型、config schema、API 或儲存格式。
- 不改拖曳「最終落點」的計算邏輯（`applyRegionRect`、snap、對齊規則結果不變）；只改「何時 commit 到主 state」。
- 不處理 playback、settings、management 頁的效能（各自獨立 change）。
- 不引入新的狀態管理函式庫或 canvas 渲染引擎。

## Alternatives Considered

- **維持每 frame commit，只加 `React.memo`**：memo 無法阻止主 config state 每 frame 變動所觸發的 derived 重算與 inspector 重繪；治標不治本。
- **以 throttle/requestAnimationFrame 降低 commit 頻率但仍寫主 state**：能減少次數，但拖曳中仍反覆灌 derived 計算與（即使 `recordHistory:false`）狀態流動；commit-on-release 更徹底且與既有 pointerup commit 概念一致。

## Capabilities

### New Capabilities

- `display-editor-drag-commit-on-release`: 定義 canvas 拖曳互動的 commit 時機契約——拖曳進行中以 local 視覺回饋呈現，主 config/draft state 與 undo/redo history 僅在 pointerup 提交一次最終結果；拖曳的最終落點、選取與後續欄位編輯行為與現狀一致。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-drag-commit-on-release`（新增；定義拖曳 commit 時機行為，不改既有 editor capability 的落點/對齊規則）。
- Affected code:
  - Modified:
    - apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts
    - apps/web/src/pages/DisplayPagesEditor/index.tsx
    - apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
    - apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx
    - apps/web/src/pages/ShellDecorationEditor/index.tsx
    - apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx
    - apps/web/src/pages/ShellDecorationEditor/objectList.tsx
  - New: 無
  - Removed: 無
