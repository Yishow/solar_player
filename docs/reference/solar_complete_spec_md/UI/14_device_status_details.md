# 14 Device Status Details 裝置狀態詳情頁

## 頁面目的

提供現場設備的維運資訊，包含裝置運作狀態、系統運行時間、硬體資訊、MQTT 狀態、系統資源監控與基本維護操作。

## 功能需求

### 左側狀態卡

- Device Operation Status。
- 狀態：正常運作 / Normal Operation。
- Uptime。
- Last Reboot。

### 裝置資訊

| 欄位 | 範例 |
|---|---|
| Device Name | KZ-Display-01 |
| Device Model | Raspberry Pi 5 (8GB) |
| Serial Number | RPI5-2025-00123 |
| OS | Raspberry Pi OS (64-bit) |
| System Version | v12.0 |
| Local IP | 192.168.1.55 |
| MAC Address | D8:3A:DD:12:34:56 |
| MQTT Status | Connected |
| Data Source | MQTT Live |

### 系統資源監控

- CPU Usage。
- Memory Usage。
- Disk Usage。
- System Temperature。
- Network Status。
- Signal Strength。

### 維護操作

- Reboot Device。
- Clear Cache。
- System Update。
- Export Logs。

## 資料需求

建議由本機 agent 提供：

```json
{
  "device": {
    "name": "KZ-Display-01",
    "model": "Raspberry Pi 5 (8GB)",
    "serialNumber": "RPI5-2025-00123",
    "os": "Raspberry Pi OS (64-bit)",
    "version": "v12.0",
    "localIp": "192.168.1.55",
    "macAddress": "D8:3A:DD:12:34:56"
  },
  "status": {
    "operation": "normal",
    "uptimeSec": 1322580,
    "lastReboot": "2025-05-13T03:15:00+08:00",
    "mqtt": "connected",
    "dataSource": "MQTT Live"
  },
  "resources": {
    "cpu": 18,
    "memory": {"usedGb": 3.4, "totalGb": 8},
    "disk": {"usedGb": 24, "totalGb": 64},
    "temperatureC": 52,
    "signalDbm": -48
  }
}
```

## Design Tokens

```json
{
  "color.device.normal": "#237A22",
  "color.device.warning": "#FF7A1A",
  "color.device.actionBlue": "#1E9BEA",
  "color.device.actionOrange": "#FF8A00",
  "font.size.deviceTitle": "36px",
  "font.size.statusLarge": "38px",
  "layout.deviceInfo.width": "700px",
  "layout.monitor.width": "680px",
  "component.gauge.size": "120px",
  "component.actionButton.height": "108px"
}
```

## 驗收條件

- 維護操作需有權限保護與確認流程。
- Export Logs 需產生可下載壓縮檔。
- 溫度、磁碟、記憶體需有 warning 規則。
- 本頁不應依賴遠端服務才可顯示本機狀態。
