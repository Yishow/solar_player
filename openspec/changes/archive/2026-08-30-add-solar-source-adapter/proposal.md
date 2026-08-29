## Why

Solar collector 的 MQTT contract 已由 `solar_mqtt` 固定產生 `solar/{factory}/summary` 與 `solar/{factory}/zone/{id}` 等 retained topics，CL/KN 也已內建於 topic 與 payload；若 Solar Player 仍要求管理員逐筆建立 exact topic mapping，不但重複描述已知 contract，也無法自然處理動態 zone。Solar source 應被視為受控資料來源 adapter，而不是一組散落的 raw MQTT rows。

## What Changes

- 新增 `Solar Source Adapter`，以既有中央 Mosquitto 連線消費標準 `solar/{SITE}/...` contract，不建立第二個 broker topology 或讓 Pi 參與 MQTT。
- Adapter 以 `solar/{SITE}/summary` 作為廠級發電資料的主要原子 payload，將 `total_power_kw`、`today_mwh`、`month_mwh`、`total_mwh` 轉為 scope-aware semantic metrics，並保留 source timestamp、quality 與 topic provenance。
- Adapter 支援 `solar/{SITE}/zone/{zone_id}` 的動態 zone discovery，從整包 zone payload 建立 zone identity、名稱、容量與 power/today/month/total/hours metrics；不要求管理員事先知道所有 zone ids。
- 標準 Solar fields 預設由 adapter 管理，不需要在 generic Topic Mapping UI 逐筆建立；非 Solar、非標準或 custom MQTT source 繼續使用 generic topic mappings。
- 避免同一 Solar value 同時從 summary scalar topic 與 aggregate payload 重複 ingest；廠級 canonical Solar metrics 以 `summary` 為單一來源，zone 以完整 zone payload 為單一來源，scalar topics 僅保留 collector backward compatibility，不作 Player canonical ingest。
- Adapter 的 site parsing 只接受已知 `CL` / `KN` contract 並正規化為 `cl` / `kn`；未知 site/topic 不得被猜測成另一個廠。
- Collector 的實作語言不在本 change 範圍；Python 或使用者另外重構的 Go binary 只要維持 MQTT data contract，Player adapter 行為相同。

## Capabilities

### New Capabilities

- `solar-collector-source-adapter`: 定義 Solar collector MQTT contract 的自動 discovery、scope normalization、semantic metric projection、provenance 與 health/freshness 行為。

### Modified Capabilities

- `multi-factory-generation-aggregation`: CL/KN generation aggregate 的 upstream readings 改由 site-scoped Solar adapter metrics 提供，仍維持完整兩廠資料才更新 global canonical aggregate 的完整性規則。

## Impact

- Affected server code: `apps/server/src/mqtt/MqttClientService.ts` 的 source dispatch seam、預計新增 Solar adapter/service、factory generation aggregate service 與 source diagnostics。
- Affected shared contracts: Solar source/zone identity、semantic metric keys 與 provenance metadata。
- Affected management behavior: 標準 Solar topics 後續可顯示為 managed source，而非要求 operator 手動建立每個 topic mapping；完整 Data Hub UI 另由 `improve-data-management-workflows` change 處理。
- Dependency: 本 change 以 `scope-live-metrics-by-site` 提供的 `MetricScope` 與 scoped metric persistence/resolver 為前置基礎。
- Non-impact: 不修改 collector HTTP scraping、polling、SQLite、Go port、Mosquitto deployment 或 Pi playback connection model。
