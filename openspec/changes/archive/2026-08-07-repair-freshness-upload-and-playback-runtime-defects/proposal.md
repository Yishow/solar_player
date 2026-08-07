## Why

一次深度靜態分析在 server、web、shared 三處找到 8 個既有缺陷，其中 4 個直接違反已歸檔 spec 的既有契約，2 個是安全與長期運行風險。最嚴重的一項已用 repo 內實際程式碼重現：`live_metric_values.timestamp` 由 SQLite `CURRENT_TIMESTAMP` 以 UTC 牆鐘寫入（無時區標記），讀取端卻直接以 `Date.parse` 解析而被當成本地時間，在部署地 Asia/Taipei 造成固定 8 小時偏差，使**剛寫入的即時指標恆被判定為 `historical`**。既有測試 fixture 一律用 ISO 字串灌資料，從未走過 `CURRENT_TIMESTAMP` 格式路徑，因此長期未被發現。

## What Changes

以下 8 項缺陷一併修復，每項都補上會在修復前失敗的迴歸測試。

**資料正確性**

- 統一 `live_metric_values.timestamp` 的解析契約：讀取端在單一入口正規化「UTC 牆鐘、無時區標記」格式，使 freshness 年齡計算不再受伺服器時區影響。同 repo 內 MetricsAccumulator 的時間戳解析已是正確作法，本次讓 freshness 路徑與之一致。
- 正規化套用在每一個儲存層讀取邊界，而非只在 freshness 評估路徑：`/api/settings/mqtt/topics` 的 `lastReceivedAt` 與 live metrics 走同一個正規化，兩個介面因此不會對同一筆讀值給出不同時間戳形式。
- snapshot 的 `latestTimestamp` 改以 instant 比較。正規化後欄位同時存在 `Z` 與數值 offset 兩種形式，字串排序不再等於時間排序；無法解析的列不會取代可解析的列。
- 修正即時用電彙總：真實的 0 kW 不再被回報成 `null`（未知）。
- 修正用電功率加總的單位比對大小寫敏感問題，避免 `kw` / `KW` 對應被靜默排除。

**資產安全**

- `/uploads/*` 一律加上 `X-Content-Type-Options: nosniff` 與 `Content-Security-Policy: sandbox`，使既有與未來上傳的 SVG 於直接瀏覽時不再於應用 origin 執行 script。上傳允許清單維持接受 `.svg`，既有品牌資產不受影響。
- 修正 images 上傳路由錯誤訊息與允許清單不一致的問題（訊息宣稱不接受 `.svg`，實際接受）。

**播放端 runtime**

- Service Worker 於啟用新 App Shell cache 後回收該 release 以外的過期 cache，終結 kiosk 裝置上單調成長的儲存占用。
- 修復 `display:sync` 合併契約的迴歸：播放控制器的 reload 函式每次 render 都是新 reference，導致協調器每次 render 被 dispose 並重建，落在 debounce 視窗內的事件會遺失、in-flight 合併狀態被清空。此行為違反 `playback-runtime-display-sync` 既有的 coalescing requirement。
- 修復 runtime 輪詢閉包鎖住掛載時 route 的問題，使刷新後的 route 調和使用當下 route。

## Non-Goals

- 不變更 `live_metric_values` 的儲存格式，也不做資料 migration：本次只修讀取端解析，既有資料列不需改寫。
- 不觸碰 `metric_snapshots.captured_at` 的解析路徑。該欄位存的是 local wall-clock 且已有明確註解說明，其不補時區標記的解析是刻意且正確的，本次不得順手改動。
- 不移除 `.svg` 上傳支援。已評估但不採用：移除會使既有 SVG 品牌 logo 失去往後可替換性，而 response header 防禦已能中和執行風險，且對既有已上傳資產同樣生效。
- 不新增完整 SVG sanitizer 或 DOM 解析管線。
- 不改變 Effective Rotation 快取的淘汰策略（現為 FIFO 而非 LRU）。該差異只影響命中率、不影響回傳內容，屬效能調校而非缺陷。
- 不擴大到管理端存取模型（same-host origin 信任）的重新設計。
- 不改動任何 playback 頁的視覺呈現，因此不需要 FHD witness 重新擷取。

## Capabilities

### New Capabilities

- `metrics-aggregate-fidelity`: 即時指標彙總的數值保真度 — 零值與未知值的區分，以及單位比對的大小寫無關性。

### Modified Capabilities

- `server-authoritative-freshness-policy`: 新增 Server 端 freshness 年齡計算與儲存層時間戳格式的解析契約，要求年齡不隨伺服器時區改變，並要求正規化套用在每一個讀取邊界、比較以 instant 而非字串進行。
- `image-upload-content-validation`: 新增未經內容驗證的上傳格式在被服務時的 response header 防禦要求，並要求拒絕訊息與允許清單一致。
- `offline-playback-cache-and-app-updates`: 新增 App Shell cache 的回收要求，使過期 release 的 cache 不無限累積。
- `playback-runtime-display-sync`: 強化 coalescing 與 route 調和要求，明確要求協調器存續不受 render 週期影響。

## Impact

- Affected specs: metrics-aggregate-fidelity、server-authoritative-freshness-policy、image-upload-content-validation、offline-playback-cache-and-app-updates、playback-runtime-display-sync
- Affected code:
  - Modified:
    - apps/server/src/metrics/liveMetrics.ts
    - apps/server/src/services/MetricsAccumulatorService.ts
    - apps/server/src/routes/images.ts
    - apps/server/src/routes/imagesSupport.ts
    - apps/server/src/routes/settings-mqtt.ts
    - apps/server/src/app.ts
    - apps/web/src/sw.ts
    - apps/web/src/hooks/usePlaybackController.ts
  - New:
    - apps/server/src/metrics/metricTimestamp.ts
    - apps/server/src/metrics/metricTimestamp.test.ts
    - apps/server/src/routes/uploadsSecurityHeaders.test.ts
    - apps/web/src/sw.test.ts
  - Modified tests:
    - apps/server/src/metrics/liveMetrics.test.ts
    - apps/server/src/services/MetricsAccumulatorService.test.ts
    - apps/server/src/routes/images.test.ts
    - apps/server/src/routes/settings-mqtt.test.ts
    - apps/web/src/hooks/usePageRotation.test.ts
    - apps/web/src/hooks/usePlaybackController.test.ts
  - Removed: (none)
- 驗證 gate：pnpm verify。不影響 playback 五頁視覺，因此不需要 fresh FHD witness batch。

Service Worker 目前沒有任何測試覆蓋，因此 apps/web/src/sw.test.ts 為新建檔案而非既有測試的擴充。

`apps/web/src/hooks/usePageRotation.ts` 未被改動：route 調和的修復落在 `usePlaybackController.ts` 的 `currentPathRef`，`usePageRotation.test.ts` 則是既有測試檔的擴充。
