## 0. Design / spec traceability

對照 design.md decisions 與 spec requirements，確認 tasks 涵蓋無遺漏：

- Decision「Commit DisplayPagesEditor drag on pointer release」→ tasks 1.1 / 1.2。
- Decision「Hold regions and config in refs during pointer move」→ task 1.3。
- Decision「Commit ShellDecorationEditor drag on pointer release」→ tasks 2.1 / 2.2。
- Decision「Memoize editor subtrees and stabilize handlers」→ tasks 3.1 / 3.2 / 3.3。
- Decision「Cache overlay snap targets and geometry per drag session」→ task 1.4。
- Decision「Render the active dragged object from local rect during drag」→ tasks 1.5 / 2.3。
- Requirement「Canvas drag commits to main state only on pointer release」→ tasks 1.1 / 2.1，驗於 4.2。
- Requirement「Drag produces a single undo history entry」→ task 1.2，驗於 4.3。
- Requirement「Final drag landing matches pre-change behavior」→ tasks 1.1 / 1.5 / 2.1 / 2.3，驗於 4.2。
- Requirement「Active object follows the pointer during drag without per-frame main-state writes」→ tasks 1.5 / 2.3，驗於 4.2。
- Requirement「Non-drag editor interactions remain correct after subtree memoization」→ tasks 3.1–3.3，驗於 4.1 / 4.2。

## 1. DisplayPagesEditor drag commit-on-release

- [x] 1.1 在 `apps/web/src/pages/DisplayPagesEditor/useDisplayEditorCanvasWorkflow.ts` 移除 pointermove handler 中對 `applyConfigUpdate` 的每 frame 呼叫，改為僅更新 local interaction/overlay feedback 呈現即時矩形。完成標準：拖曳中主 config state 不再每 frame 變動（React DevTools Profiler 確認），畫面即時跟隨指標。
- [x] 1.2 在同檔的 pointerup 路徑以拖曳最終 rect 做單次 `applyConfigUpdate` 並記入 history（沿用既有 `applyRegionRect` 計算）。完成標準：放開後物件停在與優化前相同的最終落點，且單次拖曳僅產生一筆 undo history。
- [x] 1.3 將 pointermove effect 改以 `useRef` 持有 regions/config/snap 來源，使 effect dependency 不含每 render 變動的 `regions`，避免拖曳期間反覆 add/removeEventListener。完成標準：拖曳中 effect 不重新註冊，pointermove handler 使用最新 region/config 值。
- [x] 1.4 在單次拖曳 session 內以 ref/memo 快取 overlay 的 snap targets 與 region frames/guides 幾何（因 regions 在拖曳中不變）。完成標準：拖曳中不再每 frame 重新 iterate 全部 region 計算 snap/overlay。
- [x] 1.5 驗證 spec requirement「Active object follows the pointer during drag without per-frame main-state writes」：讓拖曳中的 active region box 以 local feedback rect 即時渲染（取代 task 1.1 移除每 frame config 寫入後失去的即時跟隨）：在 `apps/web/src/pages/DisplayPagesEditor/canvasOverlayState.ts` 讓 overlay state 攜帶被拖曳的 active `regionId`（或等效識別），並在 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` 的 region box 渲染對該 active region 改讀 local feedback rect 的 `left/top/width/height`，其餘 region 仍讀 `region.geometry`。完成標準：拖曳中被拖曳的 box 即時跟隨指標、放開後不跳位、最終位置與優化前相同；非 active region 渲染不變。

## 2. ShellDecorationEditor drag commit-on-release

- [x] 2.1 在 `apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx` 將 pointermove 改為僅更新 local frame state 驅動 preview，pointerup 才呼叫 `onUpdateObjectFrame(...)` 提交最終 frame。完成標準：拖曳中 `setDraft` 不被每 frame 觸發，放開後 frame 與優化前一致。
- [x] 2.2 在 `apps/web/src/pages/ShellDecorationEditor/index.tsx` 確認 `applyChannel`/`setDraft` 僅於 pointerup 收到一次最終 frame；如需，提供穩定的 commit handler。完成標準：單次拖曳對 draft 僅一次更新，undo 行為與現狀一致。
- [x] 2.3 在 `apps/web/src/pages/ShellDecorationEditor/previewCanvas.tsx` 讓拖曳中的 active preview 物件以 task 2.1 的 local frame state 渲染其位置（而非讀 `channel`/draft），其餘物件仍讀 `channel`。完成標準：拖曳中被拖曳的 preview 物件即時跟隨指標、放開後不跳位、最終 frame 與優化前一致。

## 3. Editor subtree memoization and handler stabilization

- [x] 3.1 為 `apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx` 的 object list 與 `apps/web/src/pages/ShellDecorationEditor/objectList.tsx` 加 `React.memo`，並把父層傳入的 row handler 以 `useCallback` 穩定化。完成標準：選取/切換可見/鎖定/刪除/重排行為不變，且非該列的列不重繪。
- [x] 3.2 為 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx` 的 inspector 與 overlay 子元件加 `React.memo`，並穩定其 props/handler。完成標準：編輯一個欄位只重繪受影響子樹，欄位值更新行為與現狀一致。
- [x] 3.3 在 `apps/web/src/pages/DisplayPagesEditor/index.tsx` 與 `apps/web/src/pages/ShellDecorationEditor/index.tsx` 將傳給上述 memo 化子元件的 handler（add/delete/duplicate/move/align/distribute 等）以 `useCallback` 穩定化。完成標準：父層非相關 state 變動時，memo 化子元件不重繪。

## 4. Verification

- [x] 4.1 執行 `pnpm --filter @solar-display/web test`，確認 editor 既有測試（含 `useDisplayEditor`、shell decoration 相關）全綠且未修改既有斷言。驗證 spec requirement「Non-drag editor interactions remain correct after subtree memoization」。
- [ ] 4.2 以 `agent-browser` 在 `/display-pages/editor` 與 shell decoration 編輯介面拖曳 region/object：確認最終落點與選取/欄位編輯與現狀一致（spec requirement「Canvas drag commits to main state only on pointer release」「Final drag landing matches pre-change behavior」），並以 Profiler 確認拖曳中不再每 frame commit。
- [ ] 4.3 驗證 spec requirement「Drag produces a single undo history entry」：完成一次拖曳後 undo 一次回到拖曳前狀態，無中間 per-frame 筆數。
