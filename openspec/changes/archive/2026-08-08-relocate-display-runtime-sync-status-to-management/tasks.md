## 1. 共用型別與回報器

- [x] 1.1 依「Display clients emit periodic liveness heartbeats」，讓 `DisplayClientHeartbeat` 與 `DisplayClientLivenessEntry`／`DisplayClientLivenessSnapshot` 帶出 `runtimeSyncState`、`runtimeSyncPageKey`、`runtimeSyncResolvedAt`、`runtimeSyncError` 四個欄位，且 `buildDisplayClientLivenessSnapshot` 對未回報的 entry 產生 `"unknown"` 與三個 `null`。先在 `packages/shared/src/displayClientLiveness.test.ts` 補上會失敗的斷言（未回報預設值、已回報值原樣帶出），再修改 `packages/shared/src/displayClientLiveness.ts` 讓其通過；以 `pnpm --filter @solar-display/shared test` 驗證。
- [x] 1.2 [P] 依設計決策「以模組級回報器而非 React context 傳遞狀態到 heartbeat」，新增 `apps/web/src/services/displayRuntimeSyncReporter.ts`，匯出一個寫入函式與一個讀取快照函式：初始快照為 `runtimeSyncState: "unknown"` 且其餘三欄為 `null`；寫入 `synced` 時 `runtimeSyncError` 必為 `null`；寫入 `degraded` 時保留先前的 `runtimeSyncResolvedAt`。先寫 `apps/web/src/services/displayRuntimeSyncReporter.test.ts` 涵蓋這三種情形並確認失敗，再實作至通過。

## 2. 共用 runtime 生命週期

- [x] 2.1 依「Retry failed display runtime refresh with bounded backoff」與設計決策「有界指數退避重試取代永久停留 fallback」，讓 `useRuntimeRefreshLifecycle` 在啟用展示頁識別鍵時，於載入失敗後依 2/4/8/16/32 秒、之後固定 60 秒的序列自動重試，成功後重置序列，且任何新載入（display sync 事件、refreshKey 變更、手動 refresh）會先取消待觸發的重試。先在 `apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts` 以可注入的排程函式寫出退避序列、重置與取消三組失敗測試，再實作至通過。
- [x] 2.2 依設計決策「在共用 runtime 生命週期 hook 集中處理回報與重試」，讓 `useRuntimeRefreshLifecycle` 在啟用展示頁識別鍵時把每次載入結果寫入 `displayRuntimeSyncReporter`（載入中且無先前成功為 `loading`、成功為 `synced`、失敗為 `degraded`），未帶識別鍵時既不回報也不重試。在 `apps/web/src/hooks/useRuntimeRefreshLifecycle.test.ts` 補上「未帶識別鍵時不排程重試且不寫入回報器」的斷言後實作至通過。
- [x] 2.3 讓 `useDisplayStoryRuntime`、`useSustainabilityStoryRuntime`、`useImagePlaylistRuntime` 各自帶入其展示頁識別鍵以啟用回報與重試，而 `EnergyTrend` 與 `EnergyHistory` 使用的呼叫維持不帶識別鍵。以 `pnpm --filter @solar-display/web test` 執行既有的 `apps/web/src/pages/runtimeRefreshRegistry.test.ts` 與各 hook 測試，確認管理頁行為無回歸。

## 3. Heartbeat 與 server 端

- [x] 3.1 依「Display clients emit periodic liveness heartbeats」，讓 `buildDisplayClientHeartbeatPayload` 送出的 payload 帶出四個 runtime 同步欄位，值取自 `displayRuntimeSyncReporter` 快照，並由 `apps/web/src/layouts/LayoutShell.tsx` 於每次 heartbeat 送出當下讀取。在 `apps/web/src/hooks/useDisplayClientHeartbeat.test.ts` 補上驗證四欄存在且與回報器快照一致的測試後實作至通過。
- [x] 3.2 [P] 依「Invalid runtime sync state is treated as not reported」場景，讓 `apps/server/src/realtime/SocketService.ts` 對缺欄位或不合法的 `runtimeSyncState` 落回 `"unknown"` 與三個 `null`，且仍接受並處理該筆 heartbeat 的其餘欄位。在對應的 server 測試補上不合法值與缺欄位兩組案例後實作至通過。
- [x] 3.3 讓 `apps/server/src/services/deviceLivenessRegistry.ts` 為新註冊的 client 初始化四個欄位為未回報預設值、於收到 heartbeat 時更新，並在快照輸出中帶出。在 `apps/server/src/services/deviceLivenessRegistry.test.ts` 補上初始值與更新後值兩組斷言後實作至通過。
- [x] 3.4 依「Device Status exposes display client liveness to management」，讓 `GET /api/device/status` 的 `data.displayClients[]` 每筆帶出四個 runtime 同步欄位，既有欄位不變更、不重新命名，且未受信任請求仍被拒絕於回傳之前。以 `apps/server/src/routes/device.test.ts` 的受信任與未受信任兩條路徑驗證。

## 4. 管理端呈現

- [x] 4.1 依「Device Status exposes display client liveness to management」與設計決策「沿用 display client heartbeat 與 Device Status，不新增管理路由」，讓 `DeviceStatus` viewModel 為每個 client 產出展示同步狀態標籤與最後同步時間標籤，四種狀態分別對應「未回報／同步中／同步正常／同步異常」，且 `runtimeSyncResolvedAt` 為 `null` 時時間標籤顯示「未回報」而非空白。在 `apps/web/src/pages/DeviceStatus/viewModel.test.ts` 以 delta spec 的對照表為案例寫出失敗測試後實作至通過。
- [x] 4.2 讓 `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx` 的每一列 display client 在既有的 `App Time` 與 last seen 欄位旁呈現 4.1 產出的兩個標籤，不新增路由或頁面。以既有的 DeviceStatus 頁面測試驗證渲染輸出含這兩個標籤。
- [x] 4.3 依設計決策「heartbeat 通道的涵蓋邊界必須在管理端被顯式標示」，在 `DeviceStatusContent.tsx` 的 display client 區塊加上涵蓋範圍說明，明確指出此清單只涵蓋已配對且連線中的 client，使「清單中沒有這台」不被誤讀為「這台正常」。以該頁測試斷言此說明文字存在於渲染輸出中驗證。

## 5. 移除展示頁疊層

- [x] 5.1 依「Surface common stale and error semantics after runtime refresh failure」與設計決策「完全移除 playback surface 上的 fallback 疊層元件」，讓 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 五個展示頁在 runtime config 載入失敗或 runtime 同步失敗時皆不渲染任何提示框或疊層，僅維持既有 fallback-safe 內容：移除五個頁面對 `RuntimeConfigFallbackBanner` 與 `resolveRuntimeFallbackBannerState` 的匯入與呼叫。
- [x] 5.2 刪除 `apps/web/src/pages/runtimeConfigHydration.tsx` 與 `apps/web/src/pages/runtimeConfigHydration.test.ts`，並以 `grep -rn "RuntimeConfigFallbackBanner\|resolveRuntimeFallbackBannerState" apps packages docs openspec` 確認 repo 內除本 change 的說明文字外不再有任何引用。
- [x] 5.3 在 `apps/web/src/pages/displaySurfaceVisualGuardrails.test.ts` 補上一條斷言，確認五個展示頁的原始碼不再匯入任何 runtime fallback 疊層元件，避免日後回歸；以 `pnpm --filter @solar-display/web test` 驗證。

## 6. 驗證與交付

- [x] 6.1 執行 `pnpm verify` 並確認全數通過；若有失敗，修正後重跑至通過並保留實際輸出作為佐證。
- [x] 6.2 依 `docs/ops/fhd-closeout.md` 與 `docs/reference-match/fhd-workflow-entrypoints.md`，對五個 playback 頁執行 `pnpm run fhd:witness` 產生 fresh witness batch 與 evidence bundle，依 `docs/fhd-witness/evidence-template.md` 整理後交由使用者進行人工 acceptance。
