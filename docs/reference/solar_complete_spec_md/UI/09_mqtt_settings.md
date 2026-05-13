# 09 MQTT Settings 資料來源與 MQTT 設定頁

## 頁面目的

設定系統資料來源與 MQTT 連線資訊，並將 MQTT Topic 對應至前台展示欄位，同時提供即時資料預覽與測試連線功能。

## 功能需求

### Data Mode

- MQTT / Mock 切換。
- Mock 用於展示、開發與離線測試。

### Broker 設定

- Broker Host。
- Port。
- Client ID。
- Username。
- Password 或遮罩欄位。
- Reconnect Interval。
- Connection Status。
- Last Message Time。

### Live Topic List

範例 Topic：

- `kuozui/plant/solar/power`
- `kuozui/plant/solar/today_energy`
- `kuozui/plant/solar/total_energy`
- `kuozui/plant/solar/today_co2`
- `kuozui/plant/solar/total_co2`

### Topic Mapping

需將資料欄位對應到 Topic：

| 欄位 | Topic |
|---|---|
| 即時發電功率 | kuozui/plant/solar/power |
| 今日發電量 | kuozui/plant/solar/today_energy |
| 累積發電量 | kuozui/plant/solar/total_energy |
| 今日 CO₂ 減量 | kuozui/plant/solar/today_co2 |
| 累積 CO₂ 減量 | kuozui/plant/solar/total_co2 |

### Live Data Preview

- 即時顯示已對應資料。
- 顯示最後更新時間。
- 測試連線按鈕。
- 儲存設定按鈕。

## MQTT Payload 建議

```json
{
  "value": 586,
  "unit": "kW",
  "timestamp": "2025-05-26T09:42:18+08:00",
  "quality": "good"
}
```

或簡化版：

```json
586
```

建議正式系統採 JSON payload，方便處理 timestamp、quality 與單位。

## Design Tokens

```json
{
  "color.mqtt.connected": "#4F7A3F",
  "color.mqtt.disconnected": "#D95F5F",
  "color.mqtt.mock": "#8C8C84",
  "color.button.primaryBg": "#4F7A3F",
  "color.button.primaryText": "#FFFFFF",
  "font.size.mqttTitle": "64px",
  "layout.mqttPanel.width": "435px",
  "layout.topicPanel.width": "365px",
  "layout.mappingPanel.width": "520px",
  "layout.previewPanel.width": "430px",
  "component.topicItem.height": "82px",
  "component.input.height": "50px"
}
```

## 驗收條件

- 測試連線需回傳成功/失敗與錯誤原因。
- 儲存設定後 MQTT client 需重新連線。
- Topic Mapping 變更後前台展示資料需同步。
- 密碼不可明文顯示或寫入前端 bundle。
