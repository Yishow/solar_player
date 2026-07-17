# MQTT retained live witness

- 執行時間：2026-07-16 23:23（Asia/Taipei）
- Broker：一次性本機 `amqtt`，`127.0.0.1:1883`
- Publisher：`solar_mqtt/solar/service.py` 的 `FactoryService._publish_data`
- 訂閱：`solar/CL/summary`、`solar/CL/total_mwh`、`solar/KN/summary`、`solar/KN/total_mwh`

## 完整 snapshot

- CL zones：5587.416 + 4398.890 = **9986.306 MWh**
- KN zones：628.070 + 3031.500 = **3659.570 MWh**
- CL + KN：**13645.876 MWh**
- 四個驗收 topic 均由新訂閱者收到 retained 訊息，QoS 均為 1。

## 不完整 snapshot

完成 snapshot 後，再發布只含 CL zone 1 的不完整 snapshot：

- `solar/CL/summary` 不含 `total_mwh`。
- `solar/CL/total_mwh` retained scalar 仍為 `9986.306`，未被部分總量覆蓋。
- Publisher 告警：`CL WARN: 廠區累積總量不完整: zone 2`。

## 自動斷言

```json
{
  "all_qos1": true,
  "all_retained": true,
  "cl_incomplete_summary_omits_total": true,
  "cl_scalar_preserved": true,
  "combined_total_mwh": 13645.876,
  "kn_total": 3659.57
}
```
