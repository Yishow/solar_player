# Implementation Roadmap

## Phase 1 — 基礎架構

- 建立 monorepo
- 建立 Vite + React + TypeScript app
- 建立 Fastify server
- 建立 SQLite connection
- 建立 OpenAPI 文件
- 建立基本 layout：Header / Footer / Page Shell

驗收：

- 前端可連後端
- `/docs` 可查看 OpenAPI
- SQLite 可建立初始資料表

## Phase 2 — MQTT 與即時資料

- MQTT.js 連線
- Topic mapping
- Payload parser
- MQTT status
- Socket.IO broadcast
- Live metrics store

驗收：

- MQTT message 可即時反映在 Overview
- MQTT offline 可顯示狀態
- 可切換 mock mode

## Phase 3 — 累積值與歷史資料

- cumulative_counters
- metric_snapshots
- daily_energy_summaries
- kWh 積分估算
- CO₂ 換算
- history API

驗收：

- 重啟後累積值不歸零
- Energy Trend Summary 有資料曲線
- 日彙總正確產生

## Phase 4 — 播放系統

- Playback engine
- Page order
- Duration countdown
- Transition
- Schedule
- Idle mode
- Slideshow Preview

驗收：

- 五個播放頁可自動輪播
- 可修改每頁秒數與排序
- 設定後立即生效

## Phase 5 — 圖片管理

- 圖片上傳
- Metadata 編輯
- 是否加入輪播
- 圖片排序
- 儲存空間統計

驗收：

- 可上傳圖片並出現在 Images 頁
- 圖片可刪除、排序、設為封面

## Phase 6 — 迴路設定

- circuit_configs CRUD
- thresholds
- status calculation
- Factory Circuit display

驗收：

- 可新增 / 編輯 / 刪除迴路
- MQTT topic 對應後即時更新
- 負載狀態 normal / attention / warning 正確

## Phase 7 — 裝置狀態與部署

- Device status API
- CPU / Memory / Disk / Temperature
- Reboot / Clear cache / Logs
- Raspberry Pi systemd service
- Chromium kiosk mode

驗收：

- 開機自動進入播放頁
- 裝置狀態頁可顯示系統資源
- MQTT 斷線時會進入錯誤頁

## 建議開發順序

1. OpenAPI + DB schema
2. Mock data frontend
3. MQTT live data
4. Socket.IO realtime
5. SQLite cumulative values
6. Playback settings
7. Image management
8. Device status
9. Raspberry Pi deployment
