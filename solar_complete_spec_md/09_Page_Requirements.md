# Page Requirements — 每頁需求彙整

## 1. Overview

### 目的

作為系統首頁，快速呈現廠區綠能狀態與核心 KPI。

### 必要資料

- 即時發電功率 kW
- 今日發電量 kWh
- 累積發電量 GWh / kWh
- 今日 CO₂ 減量 t
- 累積 CO₂ 減量 t
- MQTT 狀態
- 時間、日期、天氣

### API / Socket

- `GET /api/metrics/live`
- `liveMetrics:update`
- `mqtt:status`

## 2. Solar

### 目的

說明太陽能板、變流器、工廠用電與碳減量的能源流。

### 必要資料

- 今日發電量
- 自發自用比例
- 今日 CO₂ 減量
- 累積 CO₂ 減量
- 系統效率

### UI 需求

- 能源流程圖：Solar Panels -> Inverter -> Factory Consumption / Carbon Reduction
- 指標卡片

## 3. Factory Circuit

### 目的

顯示廠區用電分配與各迴路負載比例。

### 必要資料

- 目前廠區總用電
- 太陽能供應占比
- 今日自發自用電量
- 尖峰負載
- 綠電流向狀態
- 各用電迴路比例

### API / Socket

- `GET /api/circuits`
- `circuits:update`

## 4. Images

### 目的

展示綠能現場照片與說明，支援自動輪播。

### 必要資料

- 圖片清單
- 圖片標題
- 圖片描述
- 圖片位置
- 目前輪播 index
- 每張圖片停留秒數

### API / Socket

- `GET /api/images`
- `images:update`

## 5. Sustainability

### 目的

呈現長期永續成果與 ESG 摘要。

### 必要資料

- 累積發電量
- 累積 CO₂ 減量
- 年度節能成效
- 綠色採購金額
- ESG 行動摘要
- 相當於種樹數

### 備註

部分資料可能不是 MQTT 即時資料，建議放在 `system_settings` 或獨立 sustainability settings。

## 6. Energy Trend Summary

### 目的

以日 / 週 / 月 / 累積維度呈現能源趨勢。

### 必要資料

- 發電功率曲線
- 發電量曲線
- 用電量曲線
- 自發自用比例曲線
- CO₂ 減量曲線

### API

- `GET /api/metrics/history`
- `GET /api/metrics/daily-summary`

## 7. Playback Settings

### 目的

設定自動播放流程。

### 必要資料

- 輪播順序
- 每頁停留秒數
- 自動播放
- 循環播放
- 起始頁面
- 轉場效果
- 排程設定
- 待機模式
- 亮度
- 顯示方向

### API

- `GET /api/playback/settings`
- `PUT /api/playback/settings`
- `GET /api/playback/pages`
- `PUT /api/playback/pages`

## 8. Image Management

### 目的

管理圖片來源與圖片輪播。

### 必要資料

- 圖片總數
- 已使用空間
- 最後同步時間
- 圖片列表
- 圖片 metadata
- 是否加入輪播

### API

- `GET /api/images`
- `POST /api/images`
- `PUT /api/images/{id}`
- `DELETE /api/images/{id}`

## 9. MQTT Settings

### 目的

管理資料來源、MQTT 連線與 topic mapping。

### 必要資料

- MQTT / Mock mode
- Broker host
- Port
- Client ID
- Username / Password
- Reconnect interval
- Connection status
- Last message time
- Topic list
- Live data preview

### API

- `GET /api/settings/mqtt`
- `PUT /api/settings/mqtt`
- `POST /api/settings/mqtt/test`
- `GET /api/settings/mqtt/topics`
- `PUT /api/settings/mqtt/topics`

## 10. Circuit Settings

### 目的

設定廠區用電迴路。

### 必要資料

- 顯示順序
- 迴路名稱
- icon
- 單位
- MQTT topic
- normal / attention / warning thresholds
- 是否顯示

### API

- `GET /api/circuits`
- `POST /api/circuits`
- `PUT /api/circuits/{id}`
- `DELETE /api/circuits/{id}`
- `PUT /api/circuits/reorder`

## 11. Energy Data History

### 目的

比 Energy Trend Summary 更偏向資料分析面板，顯示日 / 週 / 月 / 年 / 累積。

### 必要資料

- 今日、週、月、年、累積 tab
- KPI cards
- 多折線圖
- peak generation
- peak consumption
- last update
- data source

### API

- `GET /api/metrics/history`
- `GET /api/metrics/daily-summary`

## 12. Offline Error Display

### 目的

當 MQTT 或即時資料不可用時，給使用者明確狀態。

### 必要資料

- 最後更新時間
- 錯誤原因
- 建議處理方式
- retry countdown

### Trigger

- MQTT disconnected
- MQTT connected but no message timeout
- API unavailable

## 13. Slideshow Preview

### 目的

預覽播放中的頁面與目前狀態。

### 必要資料

- playback status
- current page
- display duration
- next page countdown
- playback route
- transition effect
- autoplay status
- last updated

### API / Socket

- `GET /api/playback/settings`
- `GET /api/playback/pages`
- `playback:update`

## 14. Device Status Details

### 目的

顯示 Raspberry Pi / 播放設備狀態。

### 必要資料

- Device operation status
- Uptime
- Last reboot
- Device name
- Device model
- Serial number
- OS
- System version
- Local IP
- MAC address
- MQTT status
- Data source
- CPU usage
- Memory usage
- Disk usage
- Temperature
- Network status
- Signal strength

### API

- `GET /api/device/status`
- `POST /api/device/reboot`
- `POST /api/device/clear-cache`
- `POST /api/device/update`
- `GET /api/device/logs`
