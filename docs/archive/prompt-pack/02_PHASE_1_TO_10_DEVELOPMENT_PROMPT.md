# Phase 1–10 開發提示詞

以下每個 Phase 都必須套用 Spectra 工作流：

```txt
spectra-propose → spectra-apply → typecheck/lint/build/test → 繁中 commit → code-review → fix bugs → typecheck/lint/build/test → 繁中 commit → 驗收 → 下一 Phase
```

---

# Phase 1 — Monorepo、基礎架構、OpenAPI、SQLite 初始化

## 目標

建立可執行的前後端專案骨架，完成 SQLite 初始化與 OpenAPI 文件入口。

## spectra-propose 必須包含

- monorepo 結構
- pnpm workspace 設定
- Vite + React + TypeScript 建置方式
- Fastify + TypeScript server 建置方式
- SQLite schema 初始化方式
- `/health` 與 `/docs` 規劃
- OpenAPI 3.1 文件位置
- shared package 型別策略
- 初始 design tokens 載入策略
- 預計繁中 commit message

## spectra-apply 實作內容

Frontend:

- 建立 Vite + React + TypeScript 專案
- 建立 React Router
- 建立 LayoutShell
- 建立 Header / Footer / PageContainer 初版
- 建立 design tokens CSS variables

Backend:

- 建立 Fastify server
- 建立 `/health`
- 建立 `/docs`
- 建立 OpenAPI yaml 載入
- 建立 SQLite connection
- 啟動時自動建立 tables

Shared:

- 建立 ApiResponse
- 建立 MetricType
- 建立 PageType
- 建立 MqttStatus

Database tables:

- app_settings
- mqtt_settings
- mqtt_topic_mappings
- playback_settings
- playback_pages
- image_assets
- circuit_configs
- cumulative_counters
- metric_snapshots
- daily_energy_summaries
- device_logs

## Phase 1 驗收

- `pnpm dev` 可啟動 web 與 server
- `/health` 回傳 ok
- `/docs` 可開啟 Swagger UI
- SQLite DB 自動建立
- TypeScript 無錯誤
- 有繁中初版 commit
- 有 code-review
- 修正 code-review 問題後有繁中修正 commit

---

# Phase 2 — 基礎 UI Shell 與 14 個頁面骨架

## 目標

完成所有頁面路由與一致視覺框架。

## spectra-propose 必須包含

- 14 個頁面路由表
- Header / Footer layout 設計
- 共用元件清單
- 每頁參考的 `solar_complete_spec_md/UI` 檔案
- 1920x1080 kiosk layout 策略
- responsive scaling 策略
- 預計繁中 commit message

## spectra-apply 實作內容

建立頁面：

- OverviewPage
- SolarPage
- FactoryCircuitPage
- ImagesPage
- SustainabilityPage
- EnergyTrendSummaryPage
- PlaybackSettingsPage
- ImageManagementPage
- MqttSettingsPage
- CircuitSettingsPage
- EnergyDataHistoryPage
- OfflineErrorPage
- SlideshowPreviewPage
- DeviceStatusDetailsPage

建立元件：

- AppHeader
- AppFooterNav
- MetricCard
- IconCircle
- StatusBadge
- Sparkline
- PanelCard
- SectionTitle
- PageNumberPill
- DataCardGrid
- BilingualLabel

## Phase 2 驗收

- 14 頁都可以 route 開啟
- Header / Footer 一致
- 1920x1080 不爆版
- 每頁有 placeholder data
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 3 — Mock Data Layer 與展示頁實作

## 目標

用 mock data 完成 5 個主要展示頁與 KPI 顯示。

## spectra-propose 必須包含

- mock data model
- 展示頁資料結構
- MetricCard 與 Sparkline 資料格式
- UI 對照 Overview / Solar / Factory Circuit / Images / Sustainability 範例圖
- API fallback 規劃
- 預計繁中 commit message

## spectra-apply 實作內容

Frontend:

- mock service
- metrics store
- Overview 展示頁
- Solar 展示頁
- Factory Circuit 展示頁
- Images 展示頁
- Sustainability 展示頁

Backend:

- `GET /api/metrics/live`
- `GET /api/circuits`
- `GET /api/images`
- mock fallback

## Phase 3 驗收

- 5 個展示頁接近 UI 參考圖
- KPI 單位格式正確
- Factory Circuit 可依 mock circuit list 動態渲染
- Images 可依 mock image list 動態渲染
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 4 — MQTT.js 整合與 solar.zip MQTT tag 標準化

## 目標

後端可以連接 MQTT broker，讀取上傳 `solar.zip` 內發送程式使用的 MQTT topic，解析 payload，更新 live metrics。

## spectra-propose 必須包含

- MQTT.js connection design
- settings model
- topic mapping model
- `solar.zip` topic pattern 支援方案
- payload parser 策略
- MQTT status model
- no-message timeout 規則
- `/api/settings/mqtt` API 規劃
- OpenAPI 更新
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- MQTT service
- MQTT settings
- Topic mapping
- Payload parser
- MQTT status
- no-message timeout
- API：
  - `GET /api/settings/mqtt`
  - `PUT /api/settings/mqtt`
  - `POST /api/settings/mqtt/test`
  - `GET /api/settings/mqtt/topics`
  - `PUT /api/settings/mqtt/topics`

必須支援 topic：

```txt
solar/KN/summary
solar/KN/total_power_kw
solar/KN/today_mwh
solar/KN/month_mwh
solar/KN/zone/1
solar/KN/zone/1/power_kw
solar/KN/zone/1/today_kwh
solar/KN/zone/1/month_mwh
solar/KN/zone/1/total_mwh
solar/KN/zone/1/capacity_kwp
solar/KN/zone/1/today_hours
solar/KN/status
solar/KN/alert
solar/KN/config
solar/KN/heartbeat
```

其中 `solar` 與 `KN` 必須可設定。

## Phase 4 驗收

- 可儲存 MQTT broker 設定
- 可測試連線
- 可訂閱 topic
- 能解析 `{ "value": 586 }`、`586`、`"586"`、summary object、zone object
- MQTT message 進來後更新 backend live metrics cache
- disconnected / reconnecting / timeout 狀態正確
- mock mode 可不用 broker 運作
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 5 — Socket.IO 即時推送與 Offline Error

## 目標

後端將 MQTT live metrics 透過 Socket.IO 推送給前端，前端即時更新 UI，並處理離線錯誤頁。

## spectra-propose 必須包含

- Socket.IO event contract
- client hooks
- reconnect 策略
- Offline Error Display 狀態機
- Header MQTT badge 即時狀態
- UI 對照 Offline Error Display 範例圖
- 預計繁中 commit message

## spectra-apply 實作內容

Backend events:

- `liveMetrics:update`
- `mqtt:status`
- `circuitMetrics:update`
- `deviceStatus:update`
- `playback:settingsUpdated`
- `images:updated`
- `system:error`
- `system:recovered`

Frontend:

- socket client
- useLiveMetrics
- useMqttStatus
- Header MQTT badge
- 展示頁即時更新
- Offline Error Display

## Phase 5 驗收

- MQTT 更新後前端 1 秒內更新
- MQTT timeout 後顯示 Offline Error Display
- 連線恢復後離開錯誤頁
- Socket reconnect 不重複 listener
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 6 — SQLite 累積值、快照、歷史資料

## 目標

實作累積值保存與歷史資料查詢。SQLite 必須保存 total generation、total CO₂、daily summary，系統重啟後不可歸零。

## spectra-propose 必須包含

- MetricsAccumulatorService 設計
- `solar.zip` MQTT 欄位到內部 metric 的換算
- mWh / kWh / GWh 單位策略
- power 積分策略
- SQLite 寫入頻率
- history API
- Energy Trend Summary / Energy Data History UI 對照
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- MetricsAccumulatorService
- cumulative counters
- metric snapshots
- daily summary
- 若 MQTT 提供 total value，優先採用
- 若 MQTT 只提供 power，使用 `energy_kwh += power_kw * delta_hours`
- CO₂ 預設換算：`co2_kg = energy_kwh * 0.495`
- API：
  - `GET /api/metrics/history?range=day|week|month|year`
  - `GET /api/metrics/daily-summary`

Frontend:

- Energy Trend Summary
- Energy Data History
- 趨勢圖

## Phase 6 驗收

- 系統重啟後累積值不歸零
- 今日發電量可查詢
- 今日 CO₂ 可查詢
- 歷史趨勢可查詢
- peak generation / peak consumption 正確
- SQLite 寫入頻率合理
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 7 — Playback Engine 播放系統

## 目標

實作自動播放、頁面順序、每頁停留時間、loop、transition、schedule、idle mode。

## spectra-propose 必須包含

- playback state machine
- settings schema
- pages schema
- Slideshow Preview UI 對照
- Playback Settings UI 對照
- route integration
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- `GET /api/playback/settings`
- `PUT /api/playback/settings`
- `GET /api/playback/pages`
- `PUT /api/playback/pages`

Frontend:

- Playback Settings
- Slideshow Preview
- usePlaybackController
- usePageRotation
- useCountdown
- transition
- schedule
- idle mode

## Phase 7 驗收

- 五個播放頁可自動輪播
- 每頁停留秒數可修改
- 順序可修改
- 設定儲存後立即生效
- Slideshow Preview 正確
- autoplay / loop 正確
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 8 — Image Management 圖片管理

## 目標

實作圖片上傳、圖片 metadata、加入輪播、排序、刪除、空間統計。

## spectra-propose 必須包含

- upload pipeline
- file validation
- image metadata model
- storage usage
- Image Management UI 對照
- Images 展示頁整合
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- `GET /api/images`
- `POST /api/images`
- `PUT /api/images/:id`
- `DELETE /api/images/:id`
- `PUT /api/images/reorder`
- JPG / PNG / WebP
- metadata
- storage usage

Frontend:

- Image Management
- upload area
- image grid
- edit panel
- set cover
- include in slideshow
- remove
- Images 展示頁輪播

## Phase 8 驗收

- 可上傳圖片
- 可修改標題描述
- 可加入輪播
- 可設封面
- 可刪除圖片
- storage usage 正確
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 9 — Circuit Settings、Factory Circuit 動態化

## 目標

完成用電迴路設定，並讓 Factory Circuit 根據設定與 MQTT topic 動態渲染。

## spectra-propose 必須包含

- circuit configs schema
- MQTT topic 對應 circuit power
- load percentage 計算
- threshold 狀態判斷
- Circuit Settings UI 對照
- Factory Circuit UI 對照
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- `GET /api/circuits`
- `POST /api/circuits`
- `PUT /api/circuits/:id`
- `DELETE /api/circuits/:id`
- `PUT /api/circuits/reorder`
- circuitMetrics:update

Frontend:

- Circuit Settings
- Factory Circuit 動態化
- normal / attention / warning / offline 狀態

## Phase 9 驗收

- 新增迴路後 Factory Circuit 出現
- 修改 topic 後可接收 MQTT 資料
- 負載百分比正確
- threshold 狀態正確
- 隱藏迴路後展示頁不顯示
- 有繁中初版 commit
- 有 code-review 與 bugfix commit

---

# Phase 10 — Device Status、部署、系統穩定化、最終驗收

## 目標

完成裝置狀態、部署腳本、錯誤處理、日誌、最終整合。

## spectra-propose 必須包含

- device status 資料來源
- Raspberry Pi / Linux 差異處理
- dangerous operation stub 策略
- log service
- kiosk deployment
- systemd
- 最終 smoke test
- 預計繁中 commit message

## spectra-apply 實作內容

Backend:

- `GET /api/device/status`
- `POST /api/device/reboot`
- `POST /api/device/clear-cache`
- `GET /api/device/logs`
- `GET /api/device/logs/export`
- log service
- deployment scripts

Frontend:

- Device Status Details
- resource gauges
- device info
- operation buttons

Deployment:

- systemd service
- Chromium kiosk mode
- `.env.example`
- production build script
- SQLite backup script
- README deployment section

## Phase 10 驗收

- Raspberry Pi / Linux 可啟動 server
- 前端可 kiosk 全螢幕展示
- 開機後自動進入播放頁
- MQTT offline / online 恢復正確
- SQLite 累積值不歸零
- OpenAPI 完整
- README 可照步驟部署
- 有繁中初版 commit
- 有 code-review 與 bugfix commit
