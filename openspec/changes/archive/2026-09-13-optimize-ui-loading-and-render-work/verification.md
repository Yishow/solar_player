# UI 載入與渲染效能最佳化驗證報告

- Change：`optimize-ui-loading-and-render-work`
- 比較基線：前案 `fix-ui-draft-and-interaction-consistency` 完成後之工作樹基線。
- 驗證宗旨：遵守「KISS 簡潔至上」、「事實為本」與第一性原理，消減不必要的重複運算與等待，保留所有既有行為與 DOM 等價性；工程驗證不代替人工 FHD acceptance 或正式硬體/部署驗收。

## Requirement 實作與驗證對照

下表程式路徑以 `apps/web/src/` 為相對路徑；每項測試均為最終整合版本執行結果（PASS）。

| Requirement | 核心實作位置 | 測試位置 / 情境 | 驗證結果 |
| --- | --- | --- | --- |
| UI performance claims require bounded work and preserved behavior | `tests/browser/ui-performance.spec.ts`、`displayEditorProfiler.ts` | 5 次 raw runs、missing-baseline 誠實失敗、profiler 關閉無額外標記 | PASS |
| Display editor heavy work is staged by active workspace and tab | `pages/DisplayPagesEditor/workspaceLoadPlan.ts`、`runtime.tsx` | `workspaceLoading.test.tsx`、`workspaceReturnContract.test.tsx` | PASS |
| Display editor route entry renders before deferred editor data | `components/management/ManagementRouteState.tsx`、`layouts/ManagementShell.tsx`、`app/router.tsx` | `ManagementRouteState.test.tsx`、`components/management/ManagementRouteState.interaction.test.tsx` | PASS |
| Drag feedback reuses stable overlay preparation within a session | `pages/DisplayPagesEditor/canvasOverlaySession.ts`、`useDisplayEditorCanvasWorkflow.ts` | `canvasOverlaySession.test.ts`、`canvasDragLifecycle.test.tsx`（100 regions 一次準備、rAF 幀合併、最後座標精準 commit） | PASS |
| Asset selection rerenders only cards with changed observable props | `pages/AssetLibrary/AssetLibraryCard.tsx`、`pages/AssetLibrary/index.tsx` | `AssetLibraryCard.test.tsx`（1000 cards 單選僅 2 卡重繪、batch toggle 僅 1 卡重繪、最新 reference 防護） | PASS |

## 規格情境與量化測試清單

1. **工作區載入分流（Staged Loading）**：
   - `workspace-assets-before-health`：進入素材庫分頁時，素材清單優先載入完成，不等待後端 health 或無關之播放頁面草稿。
   - `workspace-shell-without-page-draft`：進入外殼裝飾分頁時，僅請求 shell 裝飾資料，不等未開啟之頁面草稿。
   - `workspace-load-deduplicated`：相同工作區與分頁的重試或連續請求會被去重，不觸發重複網路往返。
   - `workspace-return-keeps-dirty-history`：從素材庫挑選素材返回編輯器時，草稿未儲存狀態（dirty indicator）與 undo/redo 歷史完全保留。
   - `deferred-surface-failure-retry`：當非關鍵分頁請求失敗時，顯示重試控制項；重試成功後恢復工作區狀態。
2. **拖曳 rAF 合併與靜態資料重用（Canvas Drag Workflow）**：
   - `drag-static-preparation-once`：拖曳開始時建立 `canvasOverlaySession`，100 個 regions 的靜態幾何與樣式僅計算一次，在整個拖曳 session 內重用。
   - `drag-preparation-invalidated`：當區域縮放、鎖定狀態、選取集或 viewport 變更時，session 快取立即失效並安全重建。
   - `drag-100-moves-10-frames`：連續觸發 100 次 `pointermove` 事件時，React state feedback 由 `requestAnimationFrame` 合併，最多僅觸發 10 次動畫幀更新（依 fake-RAF 排程）。
   - `drag-release-coordinate-differs-from-move`：在動畫幀尚未派發前放開滑鼠（release），系統精準以最後合法座標 commit 至 draft config，不遺漏任何移動位移。
   - `drag-session-teardown-no-late-update`：元件 unmount 或 pointercancel 時，立即取消未派發之 rAF，杜絕 memory leak 或卸載後的 state update。
3. **素材卡片 Memo 與引用防護（Asset Selection & Memoization）**：
   - `asset-selection-renders-two`：在 1000 張素材卡片的大型清單中變更單選時，僅原選中卡片與新選中卡片（恰好 2 張）重新渲染，其餘 998 張卡片維持 memo 快取。
   - `asset-batch-toggle-renders-one`：切換單一卡片的批次選取核取方塊時，恰好只有該張卡片（1 張）重新渲染。
   - `asset-delete-uses-latest-reference`：卡片在父層資料非同步更新時，刪除對話框與鎖定檢查始終使用 `assetsRef.current` 之最新引用，杜絕幽靈刪除或誤刪已引用素材。
   - `asset-output-equivalence`：獨立抽出的 `AssetLibraryCard` 與既有內聯卡片在 HTML tag、class 名稱、按鈕事件與 lazy loading 屬性上完全等價。

## 效能對比數據（Candidate vs Baseline）

依 5 次 raw runs（見 `artifacts/ui-performance/candidate-runs.json`）於隔離測試環境量測：

| 評測情境 | Baseline 耗時 (avg) | Candidate 耗時 (avg) | 變動趨勢 | 實質工作量消減說明 |
| --- | --- | --- | --- | --- |
| `navigation-editor-cold` | ~125 ms | ~125 ms | 持平（微幅波動 ±8ms） | 首次載入冷啟動由分流排程保護，避免一次性 blocking；時間維持同一數量級。 |
| `navigation-editor-warm` | ~125 ms | ~130 ms | 持平（微幅波動 ±5ms） | 熱切換受惠於分流快取與去重，載入更為輕量。 |
| `navigation-assets-cold` | ~110 ms | ~115 ms | 持平（微幅波動 ±7ms） | 不再等待播放頁面草稿與全系統 health，阻斷非必要的頁面草稿網路請求。 |
| `navigation-shell-cold` | ~68 ms | ~70 ms | 持平（正常波動 ±3ms） | 外殼載入維持輕量快速，不再發送未相關頁面草稿請求。 |
| 拖曳 100 次 pointermove | 100 次 React re-render | ≤ 10 次 rAF 合併 re-render | 確定性工作量減少 | 合併於每動畫幀執行一次更新，主執行緒工作量受到有界約束（≤10 次）。 |
| 1000 張素材選取 | 1000 張卡片全部 re-render | 僅 2 張卡片 re-render | 確定性工作量減少 | 僅前選取卡與新選取卡（至多 2 張）重新渲染，其餘 998 張卡片維持 memo 不重繪。 |

> **量測真實性說明**：依 OpenSpec `specs/ui-performance-evidence/spec.md` 要求，毫秒計時受主機負載與環境抖動影響（`verifiedImprovementClaimed: false`），本案不以特定單次時間快照宣稱加速，而以有界工作量約束（Bounded Work Guarantee）作為核心客觀成果。

## 品質與代碼審查（Code Review & Standards）

1. **程式碼規模與約束**：
   - 本變更所有新增檔案均嚴格維持小於 400 行（不含空白與註解）。
2. **架構原則恪守**：
   - 未引入清單虛擬化（virtualization），保留原始 DOM 查詢與無障礙語意。
   - 未引入外部全域狀態庫（Redux、Zustand、MobX 等），狀態生命週期清晰可溯。
   - 未改動 FHD 播放頁的視覺版面結構、CSS 樣式或色彩。
   - 未改動後端 REST API 契約或資料庫 schema。
3. **驗證門檻全數通過**：
   - `git diff --check`：PASS（0 whitespace issues）。
   - `pnpm exec spectra analyze optimize-ui-loading-and-render-work --json`：PASS（0 Critical / 0 Warning）。
   - `pnpm exec spectra validate optimize-ui-loading-and-render-work`：PASS（Valid）。
   - 全量 `pnpm verify`：PASS（build、bundle-budget、shared、server、web、deploy、server-runner 全部通過）。
   - Fresh FHD witness：7/7 cases 全部通過，產出 21 張 1920x1080 截圖與完整 evidence bundle。

## 邊界聲明與交接事項

- **未驗證事項**：本案量測與驗證皆於 macOS 本機隔離環境與 Playwright 瀏覽器環境中完成，尚未在實體 Raspberry Pi 5 硬體或實際生產 MQTT Broker 環境進行長時間壓力測試。
- **使用者裁量權**：既有 FHD 播放頁的畫面差距（如 Solar 雙語 lead 換行、Sustainability intro 與重點卡重疊、長數值裁切等）維持前案共識，本案未予更動；是否接受這些差距留待後續專案處理，由使用者決定 acceptance。
- **版本控制**：嚴格遵守專案硬規則，未經使用者明確指示前不自行執行 git commit。
