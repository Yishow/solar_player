# Acceptance Criteria

## 1. 系統啟動

- 後端啟動後自動建立 SQLite tables。
- 前端可透過 `/api/metrics/live` 取得初始資料。
- `/docs` 顯示 OpenAPI 文件。
- Socket.IO 可連線。

## 2. MQTT

- 可在 MQTT Settings 更新 broker 設定。
- 可測試連線。
- 可訂閱所有啟用中的 topic。
- 收到 MQTT message 後，前端 1 秒內更新。
- MQTT 斷線後 Header 狀態更新為 Offline / Reconnecting。

## 3. 累積值

- 累積發電量存在 SQLite。
- 系統重啟後累積值不可歸零。
- 若 MQTT 提供 total value，採用 MQTT value。
- 若只提供 power，使用 kWh 積分估算。
- 每日彙總可由 API 查詢。

## 4. 播放

- Overview / Solar / Factory Circuit / Images / Sustainability 可依序輪播。
- 每頁 duration 可設定。
- 支援 autoplay on/off。
- 支援 loop mode。
- 支援 transition type。
- 排程外進入 idle mode。

## 5. 圖片

- 可上傳 JPG / PNG / WebP。
- 可設定圖片標題與描述。
- 可設定是否加入輪播。
- 可調整圖片順序。
- 圖片刪除後檔案與 DB metadata 同步移除。

## 6. 迴路

- 可新增用電迴路。
- 可設定 MQTT topic。
- 可設定 normal / attention / warning threshold。
- Factory Circuit 頁顯示啟用中的迴路。
- 負載比例與狀態色正確。

## 7. 離線錯誤頁

- MQTT disconnected 超過 timeout 後顯示錯誤頁。
- 顯示最後更新時間。
- 顯示錯誤原因。
- 顯示 retry countdown。
- 連線恢復後可回到播放頁。

## 8. 裝置狀態

- 可顯示 uptime。
- 可顯示 CPU / memory / disk / temperature。
- 可顯示 IP / MAC。
- 可顯示 MQTT status。
- 可匯出 log。

## 9. 無權限模式

- 所有設定 API 不要求登入。
- 部署文件需註明僅建議內網使用。
- 若部署到公開網路，需另加 reverse proxy 或 network firewall。
