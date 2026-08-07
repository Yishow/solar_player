## Problem

未配對的瀏覽器開啟任一展示頁時，header 的時間永遠停在 `--:--` 與「等待同步」，且不會自行恢復。這不是「同步需要等一段時間」，而是永遠不會完成。

以 Playwright 對執行中的 dev stack 實測 `/overview` 重現：

- `GET /api/display-story/overview` 回 `401 device_unpaired`
- socket 收到 `44{"message":"Display client authentication failed"}` 後連線關閉
- header 呈現 `--:-- 伺服器時間 -- · 等待同步`

## Root Cause

HTTP 層與 Socket.IO 層的配對關卡精準度不一致。

HTTP 層是精準的：只有 `display-story`、`display-readiness`、`playback`、`sustainability-story` 四個 route 要求 Device Credential，因為它們回傳依 Site Scope（cl／kn）解析的資料。這符合 `device-context-site-scoped-playback` 的既有要求 — Site Scope 必須由 Device Credential 解析，且解析不到時必須 fail closed。天氣、品牌、頁面註冊表等與裝置身分無關的 route 本來就開放。

Socket.IO 層是一刀切的：`SocketService` 的 handshake middleware 對 `playback-safe` session 一旦解析不到 Device Credential，就以錯誤終止**整條連線**。

`server:time` 由 `serverTimeSignal` 依 server 本機時鐘產生並透過同一條連線廣播，內容只有 `instanceId`、`sequence`、`epochMs`、`timeZone` 與廣播間隔，與裝置身分、Site Scope 完全無關。連線被終止，這個訊號也一併送不到。

client 端 `appTime` 的 `accepted` 只有在收到合法 `server:time` 時才會設值；收不到就永遠回傳 `state: "waiting"`，於是 header 顯示「等待同步」。

## Proposed Solution

把 socket 層的關卡從「拒絕整條連線」改為「連線可建立，但只送與裝置身分無關的訊號」，使其與 HTTP 層一樣精準。

- 新增第三種 socket session 分級 `unidentified`：`playback-safe` 但解析不到有效 Device Credential 的連線歸於此類，連線得以建立。
- 對 `unidentified` 連線採**嚴格白名單**：目前只有 `server:time`。其餘所有既有廣播事件一律不送。白名單以外預設不送，新增事件不會意外外洩。
- 即時指標維持關住：`LiveMetricsSnapshot.metrics` 是未分廠區的全部電表 key，送給未配對 client 等同外洩兩個廠的即時電力資料。`circuitMetrics:update` 同理。
- `unidentified` 連線送出的 `client:heartbeat` 一律忽略，不建立也不更新 Device liveness registry，維持 `identity-aware-display-client-liveness` 既有要求。
- `unidentified` 連線永不被分類為 `management-trusted`，管理專屬事件不受影響。
- 取得有效 Device Credential 後重新連線者，回到既有的 `playback-safe` 行為，不受本次變更影響。

## Non-Goals

- 不放寬任何與裝置身分或 Site Scope 綁定的資料：`liveMetrics:update`、`circuitMetrics:update`、`display:sync`、`circuit:settingsUpdated`、`playback:settingsUpdated`、`images:updated` 一律維持只送給已識別連線。
- 不改動 HTTP 層的四個配對關卡；`/api/display-story/*` 等對未配對者維持 `401 device_unpaired`，這是正確的分界。
- 不改動 Device 配對機制、Pairing Token、Device Credential 的產生與撤銷。
- 不改動管理端的 socket 分級與管理專屬事件。
- 不把時間傳輸改到 MQTT。已評估但不採用：MQTT 在本系統是 server 訂閱電表指標的來源，未發佈任何 time topic；改用 MQTT 承載時間需要重建傳輸路徑、離線語意與序號契約，而現有 Socket.IO 路徑只差這一道誤傷。
- 不處理未配對時展示資料仍為 fallback 的呈現方式，該議題屬於另一個 change。

## Success Criteria

- 未配對的瀏覽器開啟展示頁時，header 於數秒內顯示實際的伺服器時間與「已同步」，不再停在「等待同步」。
- 未配對連線收不到 `liveMetrics:update`、`circuitMetrics:update`、`display:sync`、`circuit:settingsUpdated`、`playback:settingsUpdated`、`images:updated` 與任何管理專屬事件。
- 未配對連線送出的 `client:heartbeat` 不會使該 client 出現在 `GET /api/device/status` 的 `displayClients` 中。
- 已配對 client 的 socket 行為與本次變更前完全相同。
- 一條原始碼層級的迴歸測試確保新增的廣播事件不會預設送達未識別連線。

## Impact

- Affected specs: `server-authoritative-app-time`、`management-socket-session-boundaries`、`identity-aware-display-client-liveness`
- Affected code:
  - Modified:
    - apps/server/src/realtime/SocketService.ts
    - apps/server/src/realtime/SocketService.test.ts
    - packages/shared/src/managementAccess.ts
    - apps/server/src/routes/settings-mqtt.test.ts
    - tests/browser/critical-journeys.spec.ts
  - New:
    - apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts
- Affected APIs: Socket.IO handshake 對未配對 `playback-safe` 連線由拒絕改為接受並限制；`server:time` 的送達對象擴及未識別連線。無 HTTP API 變更。
