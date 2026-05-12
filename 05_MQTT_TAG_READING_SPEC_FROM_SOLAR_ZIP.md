# MQTT Tag 讀取與設定規格 — 根據上傳 solar.zip 補齊

本文件依據上傳的 `solar.zip` 內 MQTT 發送程式分析後整理。新系統必須能讀取這些 topic，並在 MQTT Settings 頁面提供可設定的 tag mapping。

## 來源程式分析摘要

`solar.zip` 內的 Python 程式使用下列邏輯發送 MQTT：

- MQTT 預設 host：`localhost`
- MQTT 預設 port：`1883`
- MQTT 預設 prefix：`solar`
- 預設 factory_id：`KN`
- summary 由 `api/s_json.ashx` 的 `00_00` 取得
- zones 由 `api/s_json.ashx` 的 `00_02` 取得
- MQTT payload 使用 JSON 字串
- scalar topic 多數使用 `{ "value": ... }`
- summary / zone topic 使用完整 object
- 發送 QoS 多為 1
- retain 可依設定控制

## 預設設定

```json
{
  "mqttHost": "localhost",
  "mqttPort": 1883,
  "mqttPrefix": "solar",
  "factoryId": "KN",
  "clientId": "kuozui-green-display-reader",
  "mode": "mqtt",
  "reconnectIntervalSec": 30,
  "messageTimeoutSec": 90
}
```

## Topic Pattern

### Summary Topics

| Topic | Payload | 說明 | 內部對應 |
|---|---|---|---|
| `{prefix}/{factoryId}/summary` | object | 發電摘要完整資料 | liveMetrics summary |
| `{prefix}/{factoryId}/total_power_kw` | `{ value }` | 即時總發電功率 kW | `realTimePowerKw` |
| `{prefix}/{factoryId}/today_mwh` | `{ value }` | 今日發電量 MWh | `todayGenerationKwh = value * 1000` |
| `{prefix}/{factoryId}/month_mwh` | `{ value }` | 本月發電量 MWh | `monthGenerationKwh = value * 1000` |

### Zone Topics

| Topic | Payload | 說明 | 內部對應 |
|---|---|---|---|
| `{prefix}/{factoryId}/zone/{zoneId}` | object | 單一 zone 完整資料 | zone metrics |
| `{prefix}/{factoryId}/zone/{zoneId}/power_kw` | `{ value }` | zone 即時功率 kW | `zone.powerKw` |
| `{prefix}/{factoryId}/zone/{zoneId}/today_kwh` | `{ value }` | zone 今日發電 kWh | `zone.todayKwh` |
| `{prefix}/{factoryId}/zone/{zoneId}/month_mwh` | `{ value }` | zone 本月發電 MWh | `zone.monthKwh = value * 1000` |
| `{prefix}/{factoryId}/zone/{zoneId}/total_mwh` | `{ value }` | zone 累積發電 MWh | `zone.totalKwh = value * 1000` |
| `{prefix}/{factoryId}/zone/{zoneId}/capacity_kwp` | `{ value }` | zone 裝置容量 kWp | `zone.capacityKwp` |
| `{prefix}/{factoryId}/zone/{zoneId}/today_hours` | `{ value }` | 今日等效日照時數 | `zone.todayHours` |

### System Topics

| Topic | Payload | 說明 | 用途 |
|---|---|---|---|
| `{prefix}/{factoryId}/status` | object | 發送端狀態 | MQTT / data source status |
| `{prefix}/{factoryId}/alert` | object | 異常告警 | system logs / alert display |
| `{prefix}/{factoryId}/config` | object | 發送端目前設定 | MQTT Settings 參考，不直接覆蓋本系統設定 |
| `{prefix}/{factoryId}/heartbeat` | object | 心跳 | 判斷發送端存活 |

## Command Topics，讀取系統預設不主動使用

上傳程式會訂閱：

```txt
{prefix}/{factoryId}/set
{prefix}/{factoryId}/config
```

本展示系統是讀取端，預設不主動發送 `set` 或 `config` 指令，避免修改既有發送端設定。未來如要支援遠端控制，必須另外開啟明確的 advanced setting。

## Payload 範例

### scalar payload

```json
{ "value": 586 }
```

也必須支援：

```json
586
```

```json
"586"
```

### summary payload

```json
{
  "total_power_kw": 586,
  "today_mwh": 3.842,
  "month_mwh": 84.5,
  "factory": "KN",
  "timestamp": "2025-05-26T09:42:18"
}
```

### zone payload

```json
{
  "zone_id": 1,
  "serial": "INV-001",
  "position": 1,
  "name": "PV Zone 1",
  "power_kw": 120.5,
  "today_kwh": 820.3,
  "month_mwh": 18.2,
  "total_mwh": 1240.5,
  "capacity_kwp": 500,
  "today_hours": 1.64,
  "factory": "KN",
  "timestamp": "2025-05-26T09:42:18"
}
```

### status payload

```json
{
  "status": "running",
  "message": "",
  "timestamp": "2025-05-26T09:42:18"
}
```

### heartbeat payload

```json
{
  "ts": "2025-05-26T09:42:18",
  "boot": "2025-05-13T03:15:00",
  "factory": "KN"
}
```

## 單位轉換規則

| 來源欄位 | 來源單位 | 內部儲存單位 | 轉換 |
|---|---:|---:|---:|
| total_power_kw | kW | kW | 不轉換 |
| today_mwh | MWh | kWh | `value * 1000` |
| month_mwh | MWh | kWh | `value * 1000` |
| zone.power_kw | kW | kW | 不轉換 |
| zone.today_kwh | kWh | kWh | 不轉換 |
| zone.month_mwh | MWh | kWh | `value * 1000` |
| zone.total_mwh | MWh | kWh | `value * 1000` |
| zone.capacity_kwp | kWp | kWp | 不轉換 |
| zone.today_hours | h | h | 不轉換 |

## 內部 Normalized Metrics

後端 MQTT service 收到資料後，必須轉換為以下內部模型：

```ts
export type LiveMetrics = {
  realTimePowerKw: number | null
  todayGenerationKwh: number | null
  monthGenerationKwh: number | null
  totalGenerationKwh: number | null
  todayCo2ReductionKg: number | null
  totalCo2ReductionKg: number | null
  selfConsumptionRatio: number | null
  systemEfficiency: number | null
  lastMessageAt: string | null
  source: 'mqtt' | 'mock'
}
```

若來源沒有直接提供 `totalGenerationKwh`：

1. 優先用所有 zone `total_mwh` 加總後轉 kWh。
2. 若 zone total 不可用，使用 SQLite cumulative counter。
3. 若 counter 也不可用，顯示 null 或 0，但不得假造累積值。

CO₂：

```txt
co2_kg = generation_kwh * co2FactorKgPerKwh
預設 co2FactorKgPerKwh = 0.495
```

## MQTT Settings 頁面必須提供的設定

### Broker Settings

- Data Mode：`mqtt` / `mock`
- Broker Host
- Port
- Username，可空
- Password，可空
- Client ID
- Reconnect Interval
- Message Timeout
- Connection Status
- Last Message Time

### Source Pattern Settings

- MQTT Prefix，預設 `solar`
- Factory ID，預設 `KN`
- 是否自動訂閱 zone wildcard，預設 true
- zone topic pattern：`{prefix}/{factoryId}/zone/+/+`

### Topic Mapping Settings

預設 mapping：

```json
{
  "realTimePowerKw": "{prefix}/{factoryId}/total_power_kw",
  "todayGenerationMwh": "{prefix}/{factoryId}/today_mwh",
  "monthGenerationMwh": "{prefix}/{factoryId}/month_mwh",
  "summary": "{prefix}/{factoryId}/summary",
  "zoneObject": "{prefix}/{factoryId}/zone/+",
  "zonePowerKw": "{prefix}/{factoryId}/zone/+/power_kw",
  "zoneTodayKwh": "{prefix}/{factoryId}/zone/+/today_kwh",
  "zoneMonthMwh": "{prefix}/{factoryId}/zone/+/month_mwh",
  "zoneTotalMwh": "{prefix}/{factoryId}/zone/+/total_mwh",
  "zoneCapacityKwp": "{prefix}/{factoryId}/zone/+/capacity_kwp",
  "zoneTodayHours": "{prefix}/{factoryId}/zone/+/today_hours",
  "status": "{prefix}/{factoryId}/status",
  "alert": "{prefix}/{factoryId}/alert",
  "config": "{prefix}/{factoryId}/config",
  "heartbeat": "{prefix}/{factoryId}/heartbeat"
}
```

## MQTT Parser 規則

Parser 必須：

- topic 不符合 mapping 時忽略但記錄 debug log
- payload 非 JSON 時嘗試 parse number string
- payload 是 `{ value }` 時取 value
- payload 是 number 時直接使用
- payload 是 string number 時轉 number
- payload 是 summary object 時解析 total_power_kw / today_mwh / month_mwh
- payload 是 zone object 時解析 zone_id / power_kw / today_kwh / total_mwh
- 缺欄位不得 crash
- 非數值不得覆蓋上一筆有效資料
- 每次成功解析都更新 `lastMessageAt`

## SQLite 儲存規則

- scalar live value 先更新 memory cache
- 每 30 秒或 60 秒寫入 `metric_snapshots`
- 累積值寫入 `cumulative_counters`
- 每日統計寫入 `daily_energy_summaries`
- alert 寫入 `device_logs`
- status / heartbeat 更新 device status cache

## Socket.IO 推送規則

收到 MQTT 有效資料後：

- 更新 `liveMetrics:update`
- 若 zone 變更，推送 `circuitMetrics:update`
- 若 status / heartbeat 變更，推送 `mqtt:status`
- 若 alert，推送 `system:error`

## MQTT 測試建議

可用 mosquitto_pub 測試：

```bash
mosquitto_pub -h localhost -t solar/KN/total_power_kw -m '{"value":586}'
mosquitto_pub -h localhost -t solar/KN/today_mwh -m '{"value":3.842}'
mosquitto_pub -h localhost -t solar/KN/zone/1/power_kw -m '{"value":120.5}'
mosquitto_pub -h localhost -t solar/KN/heartbeat -m '{"ts":"2025-05-26T09:42:18","factory":"KN"}'
```
