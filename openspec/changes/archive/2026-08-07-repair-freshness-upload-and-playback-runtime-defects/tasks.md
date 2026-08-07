## 1. 指標時間戳解析（在儲存讀取邊界統一正規化指標時間戳）

- [x] 1.1 [P] 提供指標時間戳正規化函式，滿足 `Timestamp normalization is idempotent and non-throwing`：對「UTC 牆鐘、無時區標記」形式補上時區標記，對已帶時區標記者原樣通過，對無法辨識的輸入原樣回傳且不拋錯，重複套用結果不變。驗證：新增 apps/server/src/metrics/metricTimestamp.test.ts，涵蓋三種輸入形式與冪等性斷言，先寫成紅燈再實作至通過。
- [x] 1.2 讓 live 指標快照讀取路徑輸出已正規化的時間戳，滿足 `Metric age is independent of the server time zone`：以 SQLite `CURRENT_TIMESTAMP` 剛寫入的指標，其 freshness 年齡近乎零且狀態為 `live`，且在 `TZ=UTC` 與 `TZ=Asia/Taipei` 兩種環境下結果一致；既有 ISO 時間戳指標的結果不變。驗證：擴充 apps/server/src/metrics/liveMetrics.test.ts，以實際 `CURRENT_TIMESTAMP` 寫入而非 ISO 字串構造 fixture，並加入跨時區斷言；先確認該測試在修復前失敗。

- [x] 1.3 讓所有儲存層讀取邊界滿足 `Stored metric timestamps are normalized at every read boundary`：`/api/settings/mqtt/topics` 的 `lastReceivedAt` 與 live 指標快照輸出同一正規化形式；snapshot 的 `latestTimestamp` 以 instant 而非字串排序決定，無法解析的列不取代可解析的列且不拋錯。驗證：擴充 apps/server/src/routes/settings-mqtt.test.ts 斷言兩個介面對同一筆讀值給出相同形式，並擴充 apps/server/src/metrics/liveMetrics.test.ts 涵蓋混合時區形式的排序與無法解析列的情境。

## 2. 指標彙總保真度（區分零值與未知值並讓單位比對大小寫無關）

- [x] 2.1 [P] 讓即時用電彙總滿足 `Distinguish a measured zero from an absent aggregate`：有觀測來源且總和為零時回報 `0`，僅在無觀測來源時回報 `null`。驗證：擴充 apps/server/src/services/MetricsAccumulatorService.test.ts，分別斷言零值與無來源兩種情境的回傳值，先寫成紅燈再實作。
- [x] 2.2 讓功率加總滿足 `Match power units without case sensitivity`：單位標籤僅大小寫不同的讀數一律納入加總，非功率單位仍排除。驗證：於同一測試檔以 `kW`、`kw`、`KW`、`kWh` 四種標籤斷言納入與排除結果。

## 3. 上傳資產服務防禦（以 response header 中和上傳資產的 script 執行能力）

- [x] 3.1 [P] 讓 uploads 路徑下所有回應滿足 `Served upload responses cannot execute script`：回應帶有 `X-Content-Type-Options: nosniff` 與含 `sandbox` 指令（不含 `allow-scripts`）的 `Content-Security-Policy`，既有已上傳資產同樣涵蓋，且資產以圖片元素內嵌時仍正常顯示。驗證：新增 apps/server/src/routes/uploadsSecurityHeaders.test.ts 斷言兩個 header 存在；內嵌顯示以手動確認一張既有 SVG 品牌資產仍正常渲染。
- [x] 3.2 [P] 讓 images 上傳拒絕訊息滿足 `Upload rejection messages match the accepted extension list`：訊息列舉的副檔名與路由實際接受的清單完全一致，不多列也不漏列。驗證：擴充 apps/server/src/routes/images.test.ts，由允許清單推導期望訊息並斷言相符，使兩者日後再度漂移時測試失敗。

## 4. 離線 App Shell cache 回收（Service Worker 在啟用新 cache 時回收非現役 cache）

- [x] 4.1 [P] 讓 Service Worker 滿足 `Reclaim App Shell caches that are no longer in use`：候選 cache 成功提交為現役後，刪除本專案前綴下既非現役亦非當前候選的 cache；提交失敗時不回收；回收失敗不影響提交結果且現役 cache 保持完整可用。驗證：新增 apps/web/src/sw.test.ts（Service Worker 目前無任何測試覆蓋），以 Cache Storage 替身斷言升級後舊 release cache 已刪除、現役與候選 cache 留存、提交失敗情境不觸發回收。

## 5. 播放 runtime 同步修復（以穩定的 reload reference 修復 display sync 合併契約）

- [x] 5.1 [P] 讓播放控制器對外的 reload 進入點在 render 之間維持穩定 identity，使 `Sync coalescing survives client re-renders` 成立：事件突發期間即使元件持續 re-render，仍至多觸發一次額外 reload，且落在 debounce 視窗內的事件不被丟棄。驗證：新增 apps/web/src/hooks/usePageRotation.test.ts。此 repo 無 React hook renderer（僅 react-dom/server，不執行 effect），因此以兩層驗證取代實機 re-render：(a) 行為層 — 以最小的 React effect 相依語意模擬器，證明「相依每次 render 變動」會 dispose 協調器並遺失 debounce 視窗內的事件，而穩定相依不會；(b) 結構層 — 斷言 usePlaybackController 對外的 reload 以 useCallback 穩定化，使其不再是每次 render 的新 reference。先確認兩層在修復前皆失敗。
- [x] 5.2 讓排程刷新滿足 `Runtime refresh reconciles against the current route`：刷新執行時的 route 調和使用當下 route，而非輪詢迴圈建立時捕捉的 route。驗證：擴充播放控制器既有測試，於迴圈建立後變更 route 再觸發刷新，斷言未回退到建立時的 route。

## 6. 交付驗證

- [x] 6.1 執行 `pnpm verify` 並確認 build、server、web、deploy、server-runner 五個 stage 全數通過，貼出實際輸出而非推測；同時確認本次未觸及 playback 五頁視覺，因此不需要 fresh FHD witness batch。
