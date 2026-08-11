## Why

目前系統已經有 freshness、display readiness、MQTT status、device status 與多種 diagnostics，但 operator 仍要分散到不同頁面自行判斷「數值是不是卡住、是否突然重設、來源中斷多久、某段趨勢為什麼跳」。現有訊號缺少統一的 health event lifecycle，也沒有把重要事件放回能源趨勢時間軸。當現場資料不可信時，問題通常不是完全沒有資料，而是資料看起來還在動卻不合理，因此需要一個可解釋、可去重、可復原的資料健康與告警層。

## What Changes

- 新增 data health rule engine，先涵蓋 stale/missing、cumulative reset、異常跳變、可配置 stuck-value 等可解釋規則；不使用黑箱 ML。
- health finding 轉成有 lifecycle 的事件：open、ongoing、recovered，避免每次 polling 產生重複告警。
- 新增管理用 Alert Center，依 severity/domain/source 顯示 active/recent alerts，支援 acknowledge、暫時靜音與跳到原始診斷頁。
- 新增 monitoring event annotation contract，把 MQTT disconnect/recovery、metric reset、device reboot、health anomaly 等事件標在 Energy Trend/History 時間軸。
- 提供 outbound delivery adapter 邊界與 delivery preference model；第一階段以站內 Alert Center 為必做，Email/LINE 等外部 provider 可獨立接入，不在沒有憑證時假裝已送達。
- health 判斷使用 active-source provenance、freshness policy 與 server-authoritative timestamps，避免 mock/real source 混淆。

## Non-Goals

- 不建立泛用 APM/log aggregation 平台。
- 不用機器學習預測故障。
- 不在本 change 強制綁定特定 Email/LINE 供應商或要求外部雲服務。
- 不取代原本各頁 diagnostics；Alert Center 提供統一入口並連回來源。

## Capabilities

### New Capabilities

- `data-health-monitoring`: 對關鍵即時/累積資料產生可解釋、可恢復、可去重的 health findings/events。
- `operator-alert-center`: 統一呈現 active/recent alerts、acknowledge/mute 與來源導覽，並保留外部 delivery adapter 邊界。
- `monitoring-event-annotations`: 把系統/資料事件與能源趨勢同一時間軸對齊，協助解釋曲線異常。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `data-health-monitoring`, `operator-alert-center`, `monitoring-event-annotations`
- Affected code: server health-event service/storage/routes、Socket.IO event、management Alert Center、Energy Trend/History annotations、shared types與 tests。
- Affected data: 新增 bounded health/event history tables 與 retention/indexes。
- Dependency: 建議在 `harden-runtime-data-source-switching` 後完成，讓 event 可帶 truthful active-source provenance；與 `add-settings-audit-and-rollback` 可互相整合但不互相阻塞。
