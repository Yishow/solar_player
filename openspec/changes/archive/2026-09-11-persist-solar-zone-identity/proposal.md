## Problem

`solar_mqtt_go/internal/scraper` 目前只在單一 process 內用 `zoneSerialMap` 維持 zone 編號。程式重啟後 mapping 重新從 1 開始；如果上游 API 的 zone 順序改變，相同 serial 可能改拿另一個 `zone_id`。Collector 又把 numeric zone id 放進 `solar/{factory}/zone/{id}` canonical MQTT topic，因此這會讓同一 topic 在重啟前後代表不同實體 zone，形成歷史與即時資料錯接風險。

正式 runtime 已是 `solar_mqtt_go`；已退役 Python collector 不在本 change 範圍。

## Proposed Solution

- 新增 collector-owned `solar_zone_identities.json` sidecar，與 authoritative `solar_config.json` 放在同一目錄，獨立於 `sqlite_enabled`。
- canonical data-plane 在 scraper fetch 後、任何 MQTT publish / SQLite record 前，依 `factory + trimmed non-empty serial` 解析 durable numeric alias；新 alias 必須整批原子寫入 sidecar 成功後才可使用。
- sidecar 已存在時它是 authority，不再讓 SQLite history 改寫或阻擋該 factory 的 mapping。
- sidecar 尚不存在時，若 SQLite history 可用，從該 factory 最新單一 timestamp 的一致 non-empty serial/zone_id snapshot bootstrap，並把歷史曾使用過的最大 ID + 1 當 allocation floor，避免新 serial 重用舊 ID。
- SQLite 關閉或沒有可用 history 時，第一次成功 fetch 依當次觀察配置 ID 並先持久化；第二次啟動起 API reorder 不再影響 serial-backed ID。
- serial-less zone 只保留 position fallback 並明確 warning；不使用名稱、容量等可變欄位猜 identity，也不宣稱它具 durable hardware identity。
- sidecar 損壞、version 不支援、ID collision 或新 mapping 無法寫入時 fail explicit，不自動 reset 後重新從 1 配號。

## Success Criteria

- 第一次 zones A,B,C，重啟後 API 順序 C,A,B，相同 serial 的 numeric zone id 不變。
- B 暫時消失再出現仍取回原 ID；新 D 取得未使用的新 ID，不回收 B 或歷史 ID。
- sidecar 不存在且 SQLite 最近 snapshot 可用時保留舊 mapping；SQLite disabled 時仍可由 sidecar 在第一次 fetch 後提供跨重啟穩定性。
- 新 mapping 寫入失敗時，該輪 resolved zones 不會回到 service，因此 canonical MQTT 與 history 不會先使用未持久化 ID。
- existing sidecar 優先於 history；history 後來即使有衝突，也不覆蓋已持久化 sidecar。
- corrupt / unsupported / colliding sidecar 不會被自動清空。
- serial-less zone 有明確 warning，且規格不把它列入 durable guarantee。

## Capabilities

### New Capabilities

- `solar-zone-identity-stability`：定義 serial-backed zone identity 的跨重啟持久化、history bootstrap、ID 不重用與 fail-safe 行為。

### Modified Capabilities

- （無；既有 MQTT `zone/{numericId}` shape 不變。）

## Impact

- New：`solar_mqtt_go/internal/zoneidentity/store.go` 與 tests。
- New：`solar_mqtt_go/internal/storage/zone_identity.go`，只提供 bootstrap read helper，不讓 identity durability 依賴 SQLite。
- New：service / CLI identity wiring helpers。
- Modified：`solar_mqtt_go/internal/service/service.go` 在 publish/record 前解析 durable zone IDs。
- Modified：`solar_mqtt_go/commands.go` 的 `once` 在寫 history 前解析 durable zone IDs。
- Modified：`.gitignore` 忽略 collector runtime sidecar 與 crash 遺留 temp files。
- New：`docs/runbooks/solar-zone-identity-state.md`。
- 不改 server Solar adapter、MQTT canonical topic shape、既有 server history，也不回寫曾經可能錯綁的歷史資料。
