## 1. 基線與量測

- [x] 1.1 完成「可重現效能證據」的前置基線：UI performance comparisons use reproducible isolated baselines；確認 fix-ui-draft-and-interaction-consistency 工程驗證及修正後 witness 可用，保留可重建的 source/worktree diff 與 fixture 身分，不新增 commit。核對現有 isolated browser smoke 入口、素材 fixture 與 editor/assets/shell cold/warm 資料契約；100 regions 為 overlay mounted/fake-RAF 合成輸入，browser 使用合法 template 並記錄實際 region 數。本步以來源快照、fixture 清單與 schema 檢查驗證，量測在 1.2 執行；無有效基線不得開始最佳化。
- [x] 1.2 [after: 1.1] 建立「可重現效能證據」的報告與 opt-in instrumentation：UI performance claims require bounded work and preserved behavior；延伸 displayEditorProfiler 並新增 tests/browser/ui-performance.spec.ts 的 ui-performance cases/JSON attachment，以 profiler-disabled/no-markup-change 及 missing-baseline/non-comparable tests 驗證輸出、entry cleanup 與誠實失敗。對基線與候選套用相同 test-only 觀測方式並記錄其身分，確保量測差異不來自 instrumentation。先在 1.1 的基線快照上完成各報告條件五次 raw runs，驗證保存的報告可讀且樣本完整，才開始 2–4 的最佳化。

## 2. 工作區載入

- [x] 2.1 [after: 1.2] 實作「工作區資料載入分流」：Display editor heavy work is staged by active workspace and tab；新增 workspaceLoadPlan，由 route 輕量返回、frame 內 mounted workspace data host 擁有 editor/assets/shell resource state 與單獨 retry，使 assets/shell 不等待不相關 page draft、image model 可用時不等 health。以 deferred request mounted tests workspace-assets-before-health、workspace-shell-without-page-draft、workspace-load-deduplicated 覆蓋錯誤、cache/generation 與 前案 cold draft gate 的無 mutation/dirty/history 契約，保留既有 editorStaging 及 active-surface 契約。
- [x] 2.2 [after: 2.1] 完成「管理路由等待與錯誤呈現」：Display editor route entry renders before deferred editor data；用 ManagementRouteState 接入 router fallback/error boundary 與 ManagementShell navigation pending，讓 cold entry/loading/error 有可用回饋及 retry。以 route-pending-visible、route-retry-keeps-dirty、route-pending-preserves-access-gate 的 router-level delayed/rejected request tests 驗證無空白入口、fallback 無 workspace 請求、既有 unlock/hidden-route 與 API 授權邊界，並重跑 router lazy/chunk-recovery/bundle-boundary 檢查。
- [x] 2.3 [after: 2.2] 驗證「工作區資料載入分流」的往返契約：workspace-return-keeps-dirty-history、late-workspace-response-ignored、deferred-surface-failure-retry mounted tests 證明素材回傳目標、warm page/shell baseline、undo 與 owner 隔離不退步；若失敗只修 loading integration，重跑前案 draft readiness 與 shell baseline tests。

## 3. Canvas 拖曳

- [x] 3.1 [after: 1.2] 完成「拖曳靜態資料重用與動畫幀合併」的靜態邊界：Drag feedback reuses stable overlay preparation within a session；加入 canvasOverlaySession 並拆分 canvasOverlayState 準備/feedback 組合，inspectorFields 使用 frame lookup。以 drag-static-preparation-once、drag-preparation-invalidated 與原 overlay fixture 差分驗證 100 regions 的一次準備、config/lock/selection/preset/viewport 失效及 geometry/measurement 輸出一致。
- [x] 3.2 [after: 3.1] 完成「拖曳靜態資料重用與動畫幀合併」的事件生命週期：Animation-frame feedback preserves the latest drag commit；useDisplayEditorCanvasWorkflow 以 ref 留最後合法 rect、rAF 合併 React feedback，release/teardown 清排程。以 fake-RAF 的 drag-100-moves-10-frames、drag-release-before-frame、drag-release-coordinate-differs-from-move 的完整事件序列基線差分、drag-session-teardown-no-late-update 驗證 feedback 上限、最後座標、一次 config commit/undo，並重跑 drag/resize/measure/lock/history tests。

## 4. 素材選取

- [x] 4.1 [after: 1.2] 完成「素材卡片 props 穩定化」：Asset selection rerenders only cards with changed observable props；抽出 AssetLibraryCard 並以 asset id 的穩定 handlers 接入 parent，保留最新 reference/version guard。以 asset-selection-renders-two、asset-batch-toggle-renders-one、asset-delete-uses-latest-reference 及同 fixture rendered output 比對驗證 1000 cards 的更新上限、callback 正確性、lazy images、CRUD 與素材回傳，既有 management invariance assertions 不得為了通過而放寬。

## 5. 整合與交接

- [x] 5.1 [after: 2.3, 3.2, 4.1] 執行「可重現效能證據」的 candidate 與基線比較：以 BROWSER_SMOKE_KEEP_SUCCESS_ARTIFACTS=1 BROWSER_SMOKE_GREP=ui-performance pnpm run browser:smoke 保留每條件五次 raw runs、JSON attachments、來源/fixture/環境身分與 DOM/行為核對。三個目標各證明指定等待或工作量減少，列出 timings 的改善/持平/退步；不可比較或缺數據判為未完成，不捏造毫秒與比例。
- [x] 5.2 [after: 5.1] 主代理回讀最後 diff、specs 與量測原始證據，檢查 loading/access/cache、overlay invalidation、stable callback freshness 及 render invariance；修正範圍內 findings 並重跑受影響 focused tests 與量測，確認未加入虛擬化、全域 store 或 FHD 版面改動。
- [x] 5.3 [after: 5.2] 以整合後最後版本跑 pnpm verify、git diff --check、spectra analyze optimize-ui-loading-and-render-work --json 與 spectra validate optimize-ui-loading-and-render-work，記錄 PASS/FAIL/NOT RUN；修正後重跑相關檢查與最終 gate，保留既有 management tests 的行為斷言。
- [x] 5.4 [after: 5.3] 依 docs/ops/fhd-closeout.md 在隔離 fixture runtime 執行 pnpm run fhd:witness -- --base-url <隔離測試服務網址>，取得 fresh witness batch、gap notes 與 evidence bundle；核對既有 successful-state FHD canonicals、載入/錯誤新狀態與前案 intentional differences，與本機效能 raw report 一起交接。
- [x] 5.5 [after: 5.4] 留下本案 diff/checkpoint、量測結論與未驗證 Pi/production 條件，將 FHD/操作 intentional differences 交由使用者決定 acceptance；必要 acceptance 未取得維持待驗收，不標成部署或硬體通過，不自行 commit。
