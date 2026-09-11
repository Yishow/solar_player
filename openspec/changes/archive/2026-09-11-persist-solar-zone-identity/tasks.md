## 1. 建立身份錯綁與 restart regression

- [x] 1.1 建立兩個獨立 store instance 等價的 restart fixture：第一次 A,B,C，第二次 C,A,B；斷言 serial numeric ID 不變。
- [x] 1.2 加入 B 消失／再出現與 D 新增，斷言 B 恢復原 ID、D 不重用任何已配置 ID。
- [x] 1.3 加入 serial-less zone warning fixture，明確固定它不屬 durable hardware identity guarantee。

## 2. Durable identity store

- [x] 2.1 新增 versioned `solar_zone_identities.json` store，實作 validate/load、restricted temp write + sync + rename、collision 檢查與 monotonic allocation。
- [x] 2.2 `ResolveZones` 採 batch allocation；新 mapping 先 persist，失敗 rollback 並不回 resolved zones。
- [x] 2.3 加入 corrupt JSON、unsupported version、duplicate key/id、private `0600` file mode、同輪 duplicate identity、invalid serial-less position 與 write failure rollback regression。

## 3. 升級 bootstrap

- [x] 3.1 新增 `LatestZoneIdentitySnapshot` 唯讀 helper，取最新單一 timestamp 的 non-empty serial/id 並計算 historical next floor；無 DB migration。
- [x] 3.2 sidecar factory 已存在時直接跳過 history；不存在才 bootstrap。SQLite disabled / 無 history 時由 first fetch 建立 sidecar。
- [x] 3.3 duplicate serial / invalid snapshot fail explicit，不用跨時間 majority 或 name/capacity 猜 identity。

## 4. Wiring、review 與驗證

- [x] 4.1 service 在 publish/record/anomaly/discovery 前解析 durable zone IDs；`once` 在 Record 前解析；新增 sidecar backup/runbook。
- [x] 4.2 code review 確認 MQTT `zone/{numericId}` shape 不變；修正 review findings：existing sidecar 必須完全優先於 conflicting history、write-failure 測試確實走 allocation rollback、runtime sidecar/tmp 加入 `.gitignore`。
- [x] 4.3 `gofmt` 完成；zoneidentity isolated `go test` 與 `go vet` PASS。完整 `cd solar_mqtt_go && go test ./...`、server Solar adapter tests、`pnpm verify` 與 Spectra validate 因目前工具無法 clone/取得完整 workspace，記錄為 NOT RUN，不宣稱通過。
