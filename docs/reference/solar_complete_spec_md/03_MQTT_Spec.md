# MQTT Spec — MQTT.js

## 1. MQTT 連線設定

```ts
interface MqttConfig {
  enabled: boolean;
  brokerUrl: string;
  port?: number;
  username?: string;
  password?: string;
  clientId: string;
  reconnectIntervalMs: number;
  messageTimeoutSec: number;
}
```

## 2. 預設 Topic 清單

| 指標 | Topic | 單位 | 說明 |
|---|---|---:|---|
| 即時發電功率 | `kuozui/plant/solar/power` | kW | 太陽能即時輸出 |
| 今日發電量 | `kuozui/plant/solar/today_energy` | kWh | 今日累積發電 |
| 累積發電量 | `kuozui/plant/solar/total_energy` | kWh | 歷史累積發電 |
| 今日 CO₂ 減量 | `kuozui/plant/solar/today_co2` | t | 今日 CO₂ 減量 |
| 累積 CO₂ 減量 | `kuozui/plant/solar/total_co2` | t | 歷史累積 CO₂ 減量 |
| 自發自用電量 | `kuozui/plant/solar/self_consumption` | kWh | 太陽能自用量 |
| 用電量 | `kuozui/plant/factory/consumption` | kWh | 廠區總用電 |
| 系統效率 | `kuozui/plant/solar/efficiency` | % | 系統效率 |

## 3. 廠區迴路 Topic

| 迴路 | Topic | 單位 |
|---|---|---:|
| 生產線用電 | `factory/power/production` | kW |
| 空調與環境設備 | `factory/power/hvac` | kW |
| 照明系統 | `factory/power/lighting` | kW |
| 辦公與公共區域 | `factory/power/office` | kW |
| 充電設備 / 綠能設施 | `factory/power/ev_green` | kW |
| 其他基礎設施 | `factory/power/infrastructure` | kW |

## 4. Payload 格式 — 建議標準格式

建議每個 topic 使用 JSON payload：

```json
{
  "value": 586,
  "unit": "kW",
  "timestamp": "2025-05-26T09:42:18+08:00",
  "quality": "good"
}
```

## 5. Payload 格式 — 相容純數字

若現場設備只能送純數字：

```txt
586
```

後端 parser 需支援：

- JSON object
- number string
- Buffer to string

## 6. Parser 規則

```ts
interface ParsedMqttMessage {
  topic: string;
  value: number;
  unit?: string;
  timestamp: string;
  quality: 'good' | 'stale' | 'bad';
  raw: string;
}
```

解析優先序：

1. 嘗試 JSON.parse。
2. 若包含 `value`，使用 `value`。
3. 若非 JSON，嘗試 Number(raw)。
4. 無法解析則標記 bad，不更新前端。

## 7. Online / Offline 判斷

| 狀態 | 條件 |
|---|---|
| connected | MQTT client connected |
| online | 至少一個核心 topic 在 timeout 內收到資料 |
| stale | MQTT connected，但核心 topic 超過 timeout 無資料 |
| offline | MQTT disconnected |
| error | 連線錯誤或認證錯誤 |

核心 topic：

- `kuozui/plant/solar/power`
- `kuozui/plant/solar/today_energy`
- `kuozui/plant/solar/total_energy`

## 8. CO₂ 換算

若 MQTT 未提供 CO₂，可用後端計算：

```txt
co2ReductionT = generationKwh * emissionFactorKgPerKwh / 1000
```

預設：

```txt
emissionFactorKgPerKwh = 0.494
```

此係數應做成系統設定，避免固定在程式碼。

## 9. kWh 積分估算

若只有即時功率 kW，後端可估算發電量：

```txt
energyDeltaKwh = powerKw * deltaSeconds / 3600
```

注意：

- deltaSeconds 過大時不應積分，例如超過 5 分鐘直接丟棄。
- MQTT reconnect 後第一筆不可直接與上一筆跨長時間積分。
- 建議現場設備若可提供累積 kWh，應以設備值為主。
