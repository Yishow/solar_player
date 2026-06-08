## Context

DisplayPagesEditor 與 ShellDecorationEditor 是 repo 中最複雜的兩個 editor 頁。canvas 拖曳是其最高頻互動，但兩者皆在 pointermove handler 中對主狀態做 per-frame 寫入。

DisplayPagesEditor：`useDisplayEditorCanvasWorkflow.ts` 的 pointermove effect（依賴含 `regions`，因 `regions` 每 render 為新 reference，effect 每 render 重新註冊）每 frame 執行 `setCanvasInteractionFeedback(...)` 與 `applyConfigUpdate((current) => applyRegionRect(...), { recordHistory: false })`。pointerup 時另有一次 `applyConfigUpdate((current) => current, ...)` 帶 history 的 commit。主 config 每 frame 變動，連帶 `index.tsx` 的 `editableRegions` / `editableFreeformObjects` / `selectedRegion` 等 derived 與 inspector、overlay 全數重算重繪。

ShellDecorationEditor：`previewCanvas.tsx` 的 pointermove 每 frame `onUpdateObjectFrame(...)`，於 `index.tsx` 經 `applyChannel` → `setDraft` 更新整個 draft envelope，無 commit-on-release。

兩 editor 子元件（object list、inspector、preview canvas、overlay）皆無 `React.memo`，handler 多為 inline。

## Goals / Non-Goals

**Goals:**

- 拖曳期間不再每 frame 寫主 config/draft state；以 local 視覺回饋呈現即時矩形，pointerup 才 commit 一次最終結果。
- 拖曳的最終落點、undo/redo 行為、選取與欄位編輯結果與現狀一致。
- 子樹 memo 化 + handler 穩定化，使選取/編輯等非拖曳互動也只重繪受影響子樹。

**Non-Goals:**

- 不改資料模型、config schema、API、儲存格式。
- 不改 `applyRegionRect` / snap / 對齊規則的結果。
- 不處理 playback / settings / management 頁。
- 不引入新狀態管理或渲染引擎。

## Decisions

### Commit DisplayPagesEditor drag on pointer release

拖曳期間僅更新 local interaction/overlay state 以呈現即時矩形回饋，移除 pointermove 中的 `applyConfigUpdate`；於 pointerup 以拖曳最終 rect 做單次 `applyConfigUpdate` 並記入 history。理由：主 config 每 frame 變動是 derived 重算與 inspector/overlay 重繪的根因；既有 pointerup 已有 history commit，改為「最終值才 commit」與該設計一致。替代方案（throttle 但仍寫主 state）已於 proposal 排除。

### Hold regions and config in refs during pointer move

pointermove effect 以 `useRef` 持有 regions/config/snap 來源，使 effect dependency 不含每 render 變動的 `regions`，避免拖曳期間 effect 反覆 add/removeEventListener 重新註冊。理由：減少每 render 的 effect 註冊開銷並穩定 handler。

### Commit ShellDecorationEditor drag on pointer release

`previewCanvas.tsx` 拖曳期間以 local frame state 驅動 preview，pointerup 才呼叫 `onUpdateObjectFrame(...)` 提交最終 frame 進 `setDraft`。理由：對齊 DisplayPagesEditor 的 commit-on-release 模式，消除每 frame 整個 draft envelope 重建。

### Memoize editor subtrees and stabilize handlers

為 object list（`freeformObjectList.tsx`、ShellDecoration `objectList.tsx`）、inspector（`inspectorFields.tsx`）、preview canvas 與 overlay 加 `React.memo`，並將父層傳入的 handler 以 `useCallback` 穩定化。理由：使選取、欄位編輯等非拖曳互動只重繪受影響子樹，而非整棵 editor。

### Cache overlay snap targets and geometry per drag session

overlay 的 snap targets 與 region frames/guides 幾何在單次拖曳 session 內以 ref/memo 快取，因 regions 在拖曳中不變。理由：避免每 frame 重新 iterate 所有 region 計算 snap 與 overlay 幾何。

### Render the active dragged object from local rect during drag

實作 commit-on-release 時發現的必要環節：DisplayPagesEditor 中可拖曳的 region box 是讀 `region.geometry`（來自 config）渲染其 `left/top/width/height` 的（在 `inspectorFields.tsx` 的 region frames 渲染段）。原本拖曳每 frame 寫 config，使 box 即時跟隨指標。移除每 frame config 寫入後，若不另行處理，被拖曳的 box 會停在原位、只有 overlay 的 `activeInteraction` guides/外框跟著動、放開才跳到終點——這是互動退化（即下方 Failure modes 的「放開後跳位」）。

因此 commit-on-release 必須額外涵蓋：拖曳期間，正在被拖曳的 active region 以「local feedback rect」渲染其 box（而非 config geometry），其餘 region 仍讀 config。這只動 overlay/渲染層，不寫 config。具體做法：在 `canvasOverlayState.ts` 讓 `activeInteraction` 帶上被拖曳的 `regionId`（或讓 frames 對 active region 改用 `activeInteraction.rect`），並在 `inspectorFields.tsx` 的 region box 渲染對 active region 改讀該 local rect。ShellDecorationEditor 的 `previewCanvas.tsx` 有對應問題：拖曳中 preview 物件目前讀 `channel`（draft）渲染，commit-on-release 後須以 local frame state 驅動拖曳中的 preview 物件位置。理由：在不每 frame 寫主 state 的前提下，維持「拖曳中即時跟隨指標」的視覺，避免放開跳位。替代方案（接受拖曳中只有外框動、本體不動）已排除，因明顯改變互動體感。

## Implementation Contract

**Behavior（對使用者而言）：** 拖曳一個 region/object 時，被拖曳的物件本體即時跟隨指標移動（由 local feedback rect 驅動，非每 frame 寫 config）；放開滑鼠後，物件停在最終位置，該位置與優化前相同，且不發生「放開瞬間跳位」。undo 一次回到拖曳前狀態（拖曳期間不產生多筆 history）。選取、欄位編輯、對齊/分佈、鎖定/顯示切換等行為不變。拖曳期間 inspector 顯示的幾何值在 pointerup 後更新為最終值（與優化前每 frame 更新的差異屬本 change 有意的行為調整，且為 spec 明列）。

**Interface / data shape：** 不新增或變更 config schema、`ShellDecorationEnvelope` 形狀、API、儲存格式。`applyConfigUpdate` 與 `onUpdateObjectFrame` 的簽名維持不變；改變的是其「在拖曳生命週期中被呼叫的時機」（pointerup 單次，而非 pointermove 每 frame）。`canvasOverlayState.ts` 的 overlay state 形狀 MAY 擴充以攜帶被拖曳 region 的識別（如 active interaction 的 `regionId`），供渲染層判斷哪個 region box 在拖曳中改讀 local rect；此為 editor 內部 overlay state，不屬對外 API 或持久化資料。子元件 props 介面維持不變，僅以 `React.memo` 包裝並由父層以 `useCallback` 提供 handler。

**Failure modes：** 若 local 視覺回饋與最終 commit 的 rect 計算不一致，會表現為「放開後物件跳位」——須由手動/瀏覽器 witness 捕捉並修正。若 pointerup commit 漏接（例如指標移出視窗），須維持與現狀相同的收尾行為（既有 pointerup/cancel 路徑）。memo handler 若漏列 dependency，會表現為操作用到過期 closure；以既有測試與手動驗證把關。

**Acceptance criteria：**

- `pnpm --filter @solar-display/web test` 全綠;editor 既有測試（含 `useDisplayEditor`、shell decoration 相關）不需修改即通過。
- 手動/瀏覽器 witness：在 `/display-pages/editor` 與 shell decoration 編輯介面拖曳 region/object，確認最終落點、undo 一次回退、選取與欄位編輯與現狀一致；拖曳中以 React DevTools Profiler 確認不再每 frame 觸發整棵 editor commit。
- 拖曳產生的 undo history 筆數與優化前一致（單次拖曳一筆）。

**Scope boundaries：**

- In scope：上述兩 editor 的拖曳 commit 時機、pointermove effect 的 ref 化、拖曳中 active 物件以 local rect 即時渲染（`canvasOverlayState.ts` 攜帶 active regionId、`inspectorFields.tsx` region box 對 active region 改讀 local rect、`previewCanvas.tsx` 以 local frame state 驅動拖曳中 preview）、子樹 memo 化與 handler 穩定化、overlay 幾何/snap 的 per-session 快取。
- Out of scope：拖曳落點/對齊演算法、config schema、API、儲存、其他頁面、非拖曳的 editor 功能新增。

## Risks / Trade-offs

- [拖曳中 inspector 不再每 frame 更新數值] → 此為有意的行為調整，已於 spec 明列為 commit-on-release 的一部分；若產品要求拖曳中即時數值，可改為 local state 同步 inspector 顯示而不 commit 主 state（保留為實作選項，不擴張 scope）。
- [local 回饋與最終 commit rect 不一致導致跳位] → 兩者共用同一 `applyRegionRect`/frame 計算來源；以手動 witness 驗證放開後無跳位。
- [pointerup/cancel 邊界（移出視窗、Esc）收尾不一致] → 比照既有 cancel 路徑處理，witness 涵蓋這些路徑。
- [子元件加 memo 後父層仍傳入不穩定 handler 使 memo 失效] → 以 `useCallback` 穩定化為同一 task 的一部分，確保 memo 生效。
