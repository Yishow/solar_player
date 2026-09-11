## Problem

目前幾個 management / runtime 設定入口仍有「前端送什麼，後端就盡量猜著吃」的舊行為，會讓錯誤資料進入正式設定，或在局部更新時意外改到沒有要求變更的欄位。

已確認的高風險行為有三組：

1. `PUT /api/settings/mqtt` 宣告為 partial update，但 `dataMode` 未提供時會落成 `mqtt`，所以原本的 `mock` 設定只改 host / timeout 也可能被意外切回真 MQTT；`reconnectInterval=0` 也可能在 omitted update 時被 `|| 5000` 蓋掉。
2. Playback page update body 允許省略 `enabled` / `displayOrder` / `durationSeconds`，但實作對未提供欄位會套預設值；呼叫端只想改 duration，其他欄位可能被一起重設。Playback settings 同樣缺完整 HTTP runtime validation。
3. MQTT settings 與 image playlist governance 仍缺完整 runtime validation。像 `1883abc` 可被前端 `parseInt` 成 1883；負 port、過大 port、負 reconnect、非法 playlist duration/order、未知 assetId 等資料也沒有一致的 server-side 拒絕邊界。

TDD 對照現行正式規格時另外確認：complete-but-stale playback **不是 bug**。`display-page-per-metric-freshness` 已明確要求 broker 暫時斷線時，只要 required metrics 都曾收到，就繼續輪播 last-known values；只有從未收齊 required metrics 才用 `stale-runtime` 跳過。因此本 change 不改 freshness rotation 行為。

## Root Cause

- 部分 API 的 `Partial<T>` 只有 TypeScript 開發期提示，沒有等價的 HTTP runtime validation。
- 舊 route / service 會用預設值「補」沒送的欄位，沒有清楚區分 omitted、invalid 與 intentional reset。
- 前端用 `parseInt` 幫使用者輸入做寬鬆轉換；後端又沒有第二道嚴格檢查，因此錯誤輸入可以被靜默改成另一個合法值。

## Proposed Solution

- Playback settings / pages 補 server runtime validation；page partial update 對 omitted 欄位保留原值，不再套 `0 / 15 / true` 之類預設值覆寫既有設定。
- MQTT settings 改成真正的 partial update：欄位未提供就保留 current value；`dataMode` 僅接受明確 `mqtt` / `mock`，invalid value 回 400。
- MQTT numeric settings 建立一致限制：port 為 1..65535 的整數；message timeout 為正整數；reconnect interval 為非負整數；host / clientId 等必要字串不得只有空白。前端改用完整數字檢查，不再接受 `1883abc` 這類 partial parse；環境變數解析也不接受帶尾碼的半合法數字。
- Image playlist entry / settings / reorder / duration-all mutation 在 persist 前驗證 body shape、duration、order、enum、asset existence 與 duplicate entry；invalid request 回 400 且不修改 DB、不 emit images/display-sync event。
- 優先使用共用 server validation 邊界，不讓 Playback、MQTT、playlist 各自長出另一套寬鬆規則。
- 保留 broker failure resilience：complete-but-stale + prior data 仍可播放，不改 `display-page-per-metric-freshness` 契約。

## Success Criteria

- MQTT 原本為 mock 時，僅更新 host / port / timeout 不會改變 dataMode；只有明確送 `dataMode:"mqtt"` 才切換；既有 `reconnectInterval=0` 在 omitted update 時仍為 0。
- `PUT /api/playback/pages` 只送 `{ id, durationSeconds }` 時，原本 enabled / displayOrder 保持不變。
- Playback settings 對 wrong-type boolean、invalid schedule、invalid repeatDays、invalid page id / duration 等回 400，且 prior settings 不變、無 socket side effect。
- MQTT 對 malformed string、0、負數、>65535 port、小數 port、負 reconnect、非法 timeout 回 400；不寫 DB、不觸發 reconnect。
- Image playlist 對 0 / 負數 / 小數 duration、不合法 order、未知 assetId、未知 fallback mode、duplicate / unknown reorder entry 回 400，整批無 side effect；valid-but-missing single entry 使用 404。
- 前端 MQTT payload builder 不再把 `1883abc` 靜默截成 1883，也不把 reconnect `0` 偷改成預設值。
- 既有 broker failure resilience 測試維持通過，確認本 change 沒有把 stale-with-prior-data 改成黑屏風險。
- 所有新增 bug 都先有可重現 regression test；受影響 tests 與最終 `pnpm verify` 通過後才算完整驗證完成。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- `management-api-input-validation`：把 runtime validation 從既有 Circuit / Image 基礎擴到 Playback、MQTT settings 與 image playlist governance，並固定 partial update 的 omitted-value 語意。

## Impact

預期受影響程式：

- `apps/server/src/routes/playback.ts` / playback persistence boundary
- `apps/server/src/routes/settings-mqtt.ts` 或共用 request validator
- `apps/server/src/mqtt/settings-source.ts`
- `apps/server/src/routes/image-playlist.ts` / playlist persistence boundary
- `apps/server/src/plugins/managementInputValidation.ts` 或等價共用 validator
- `apps/web/src/pages/MqttSettings/mqttSettingsRouteModel.ts`
- 對應 server / web regression tests

本 change 不改 freshness / broker resilience、不處理 CI / branch protection、不重做 offline cache 架構、不處理圖片刪除檔案一致性，也不改 DB schema。這些若要做，另開獨立 change，避免把這次 runtime correctness 修正膨脹成大包。
