## 1. 固定目前已確認的錯誤行為

- [x] 1.1 加 MQTT partial update regression：既有 `dataMode=mock`，只改 host 後仍保持 mock，且 existing `reconnectInterval=0` 不被 omitted update 覆寫。
- [x] 1.2 加 Playback page partial update regression：只送 duration 時，existing enabled / displayOrder 保持不變。
- [x] 1.3 加 malformed management inputs table cases：Playback、MQTT、image playlist 的 wrong type、partial numeric parse、負數、小數、未知 enum / id 都拒絕且 state 不變。
- [x] 1.4 對照正式 `display-page-per-metric-freshness` spec 與既有 regression，確認 stale-with-prior-data 保持 playable 是刻意的 broker resilience，不納入本 change 修正。

## 2. 讓 Playback / MQTT partial update 真正保留 omitted 欄位

- [x] 2.1 Playback settings / pages 在 server 先驗證 request，再以 existing + provided fields 建 candidate；omitted 欄位不得套 route default 覆寫。
- [x] 2.2 MQTT settings 的 `dataMode`、host、port、timeout、reconnect、clientId 等依 existing + provided fields 合併；invalid supplied value 400，omitted value 保留。
- [x] 2.3 前端 MQTT 表單改用完整數字驗證，不再以 `parseInt(...) || default` 接受 `1883abc` 或偷偷套預設值。
- [x] 2.4 MQTT env numeric parser 不接受 trailing junk，並維持 reconnect interval 0 的合法語意。

## 3. 擴充共用 runtime validation

- [x] 3.1 Playback settings 驗證 boolean、page id、schedule `HH:mm`、repeatDays、idle/transition/brightness；invalid request 在 persist / socket event 前結束。
- [x] 3.2 Playback page mutation 驗證 id / order / duration / enabled，unknown id 拒絕，不做 silent no-op。
- [x] 3.3 MQTT settings 驗證 port 1..65535、positive timeout、non-negative reconnect、非空 host/clientId、合法 dataMode；invalid request 不 reconnect。
- [x] 3.4 Image playlist entry/settings/duration-all/reorder 驗證 duration/order/boolean/fallback/asset existence/entry existence/duplicate entry；bulk request 先完整 preflight 再寫 DB。

## 4. Side-effect 與相容性確認

- [x] 4.1 所有 invalid mutation 都有 regression 覆蓋 SQLite unchanged，且不 emit playback/images/display-sync、不觸發 MQTT connect/testConnection。
- [x] 4.2 code review 核對合法現行 web payload、password `****` mask、MQTT reconnectInterval=0、playlist nullable metadata、Playback transition normalization 均未被改寫；`username.trim()` 也是 main 原有行為，不屬於本 change 新增。
- [x] 4.3 review API error status：malformed/invalid=400、valid-but-missing single resource=404；不趁此 change 統一整站 response envelope。
- [x] 4.4 確認 existing broker failure resilience regression 未被本 change 改寫或移除，freshness 行為保持既有正式 spec。

## 5. Review 與驗證

- [x] 5.1 主代理完成最終 code review；確認沒有把 freshness behavior、CI、offline architecture、image delete consistency、MQTT initial-connect cleanup 偷帶進本 change，無剩餘 blocker finding。
- [ ] 5.2 受影響 server / web tests 與 root `pnpm verify`：NOT RUN。此執行環境無完整 workspace，且無法解析 `github.com` 取得 repo，因此不宣稱測試已通過。
- [ ] 5.3 Spectra validate：NOT RUN；待有完整 workspace 的環境執行後，再決定是否進 archive。
