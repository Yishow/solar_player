# 完整 Task Checklist

使用方式：每個 Phase 開始前先勾 `spectra-propose`，完成後勾 `spectra-apply`，初版 commit 後必須 code-review，修完 bug 再 commit，最後驗收通過才可進下一 Phase。

---

## 全域流程 Checklist，每個 Phase 都要做

套用於 Phase 1–10：

- [ ] 已執行 `spectra-propose`
- [ ] proposal 已列出目標、範圍、檔案、API、DB、OpenAPI、Socket、MQTT、UI、測試
- [ ] proposal 已明確列出參考的 `solar_complete_spec_md` 文件
- [ ] proposal 已明確列出參考的 `solar_complete_spec_md/UI` 分頁提示詞與範例圖
- [ ] proposal 已列出預計繁中 commit message
- [ ] 已執行 `spectra-apply`
- [ ] 實作內容未超出該 Phase 範圍
- [ ] OpenAPI 已同步更新
- [ ] SQLite schema 文件已同步更新
- [ ] shared types 已同步更新
- [ ] UI 已套用 design tokens
- [ ] UI 已檢查 1920x1080 kiosk layout
- [ ] 已執行 `pnpm typecheck`
- [ ] 已執行 `pnpm lint`
- [ ] 已執行 `pnpm build`
- [ ] 已執行 `pnpm test` 或替代 smoke test
- [ ] 已建立繁中初版 commit
- [ ] 已進行 code-review
- [ ] 已修正 code-review 發現的 bugs
- [ ] 修正後已再次 typecheck / lint / build / test
- [ ] 已建立繁中 bugfix commit
- [ ] 該 Phase 驗收清單全部通過
- [ ] 才開始下一個 Phase

---

## Phase 1 Task Checklist

- [ ] 建立 pnpm workspace
- [ ] 建立 `apps/web`
- [ ] 建立 `apps/server`
- [ ] 建立 `packages/shared`
- [ ] 建立 root tsconfig
- [ ] 建立 root scripts
- [ ] 建立 Vite + React + TypeScript
- [ ] 建立 Fastify + TypeScript
- [ ] 建立 `/health`
- [ ] 建立 OpenAPI yaml
- [ ] 建立 Swagger UI `/docs`
- [ ] 建立 SQLite connection
- [ ] 建立 migration / schema 初始化
- [ ] 建立 `app_settings`
- [ ] 建立 `mqtt_settings`
- [ ] 建立 `mqtt_topic_mappings`
- [ ] 建立 `playback_settings`
- [ ] 建立 `playback_pages`
- [ ] 建立 `image_assets`
- [ ] 建立 `circuit_configs`
- [ ] 建立 `cumulative_counters`
- [ ] 建立 `metric_snapshots`
- [ ] 建立 `daily_energy_summaries`
- [ ] 建立 `device_logs`
- [ ] 建立 shared `ApiResponse<T>`
- [ ] 建立 shared metric / page / MQTT types
- [ ] 建立 README 啟動說明
- [ ] 完成 Phase 1 spectra / commit / review / fix 流程

---

## Phase 2 Task Checklist

- [ ] 建立 LayoutShell
- [ ] 建立 AppHeader
- [ ] 建立 AppFooterNav
- [ ] 建立 PageContainer
- [ ] 建立 OverviewPage
- [ ] 建立 SolarPage
- [ ] 建立 FactoryCircuitPage
- [ ] 建立 ImagesPage
- [ ] 建立 SustainabilityPage
- [ ] 建立 EnergyTrendSummaryPage
- [ ] 建立 PlaybackSettingsPage
- [ ] 建立 ImageManagementPage
- [ ] 建立 MqttSettingsPage
- [ ] 建立 CircuitSettingsPage
- [ ] 建立 EnergyDataHistoryPage
- [ ] 建立 OfflineErrorPage
- [ ] 建立 SlideshowPreviewPage
- [ ] 建立 DeviceStatusDetailsPage
- [ ] 建立 MetricCard
- [ ] 建立 IconCircle
- [ ] 建立 StatusBadge
- [ ] 建立 Sparkline
- [ ] 建立 PanelCard
- [ ] 建立 SectionTitle
- [ ] 建立 PageNumberPill
- [ ] 建立 DataCardGrid
- [ ] 建立 BilingualLabel
- [ ] 對照 `solar_complete_spec_md/UI` 所有分頁
- [ ] 完成 1920x1080 不爆版檢查
- [ ] 完成 Phase 2 spectra / commit / review / fix 流程

---

## Phase 3 Task Checklist

- [ ] 建立 mock metrics service
- [ ] 建立 mock images service
- [ ] 建立 mock circuits service
- [ ] 建立 metrics store
- [ ] 實作 Overview KPI cards
- [ ] 實作 Overview hero section
- [ ] 實作 Solar energy flow
- [ ] 實作 Solar KPI cards
- [ ] 實作 Factory Circuit energy flow
- [ ] 實作 Factory Circuit circuit list
- [ ] 實作 Images 大圖 / thumbnails / 說明卡
- [ ] 實作 Sustainability KPI cards
- [ ] 建立 `/api/metrics/live`
- [ ] 建立 `/api/circuits`
- [ ] 建立 `/api/images`
- [ ] OpenAPI 同步 Phase 3 API
- [ ] 完成 Phase 3 spectra / commit / review / fix 流程

---

## Phase 4 Task Checklist

- [ ] 建立 MQTT service
- [ ] 建立 MQTT config loader
- [ ] 建立 MQTT settings API
- [ ] 建立 MQTT test connection API
- [ ] 建立 topic mappings API
- [ ] 支援 host / port / username / password / clientId
- [ ] 支援 mqtt / mock mode
- [ ] 支援 reconnectInterval
- [ ] 支援 prefix / factory_id 設定
- [ ] 訂閱 `solar/KN/summary`
- [ ] 訂閱 `solar/KN/total_power_kw`
- [ ] 訂閱 `solar/KN/today_mwh`
- [ ] 訂閱 `solar/KN/month_mwh`
- [ ] 訂閱 `solar/KN/zone/+/power_kw`
- [ ] 訂閱 `solar/KN/zone/+/today_kwh`
- [ ] 訂閱 `solar/KN/zone/+/month_mwh`
- [ ] 訂閱 `solar/KN/zone/+/total_mwh`
- [ ] 訂閱 `solar/KN/zone/+/capacity_kwp`
- [ ] 訂閱 `solar/KN/zone/+/today_hours`
- [ ] 訂閱 `solar/KN/status`
- [ ] 訂閱 `solar/KN/alert`
- [ ] 訂閱 `solar/KN/config`
- [ ] 訂閱 `solar/KN/heartbeat`
- [ ] Parser 支援 `{ value: number }`
- [ ] Parser 支援 primitive number
- [ ] Parser 支援 string number
- [ ] Parser 支援 summary object
- [ ] Parser 支援 zone object
- [ ] 建立 MQTT status cache
- [ ] 建立 no-message timeout
- [ ] 建立 device_logs 紀錄 MQTT error
- [ ] 完成 Phase 4 spectra / commit / review / fix 流程

---

## Phase 5 Task Checklist

- [ ] 建立 Socket.IO server
- [ ] 建立 Socket.IO client
- [ ] 建立 `liveMetrics:update`
- [ ] 建立 `mqtt:status`
- [ ] 建立 `circuitMetrics:update`
- [ ] 建立 `deviceStatus:update`
- [ ] 建立 `playback:settingsUpdated`
- [ ] 建立 `images:updated`
- [ ] 建立 `system:error`
- [ ] 建立 `system:recovered`
- [ ] 建立 `useLiveMetrics`
- [ ] 建立 `useMqttStatus`
- [ ] Header MQTT badge 接即時狀態
- [ ] Overview 接即時資料
- [ ] Solar 接即時資料
- [ ] Factory Circuit 接即時資料
- [ ] 實作 Offline Error Display
- [ ] 連線恢復後回原播放頁
- [ ] 防止 socket listener 重複註冊
- [ ] 完成 Phase 5 spectra / commit / review / fix 流程

---

## Phase 6 Task Checklist

- [ ] 建立 MetricsAccumulatorService
- [ ] 建立 cumulative counters 初始化
- [ ] 系統啟動時從 SQLite 載入累積值
- [ ] 支援 MQTT total value 優先
- [ ] 支援 power 積分估算 kWh
- [ ] 支援 `today_mwh` 轉 kWh
- [ ] 支援 `month_mwh` 轉 kWh
- [ ] 支援 zone `today_kwh`
- [ ] 支援 zone `total_mwh` 轉 kWh
- [ ] 建立 CO₂ factor setting，預設 0.495 kg/kWh
- [ ] 寫入 metric_snapshots
- [ ] 寫入 daily_energy_summaries
- [ ] 計算 peak generation
- [ ] 計算 peak consumption
- [ ] 建立 `/api/metrics/history`
- [ ] 建立 `/api/metrics/daily-summary`
- [ ] 實作 Energy Trend Summary
- [ ] 實作 Energy Data History
- [ ] 完成 Phase 6 spectra / commit / review / fix 流程

---

## Phase 7 Task Checklist

- [ ] 建立 playback_settings API
- [ ] 建立 playback_pages API
- [ ] 建立 playback state machine
- [ ] 建立 `usePlaybackController`
- [ ] 建立 `usePageRotation`
- [ ] 建立 `useCountdown`
- [ ] 支援 autoplay
- [ ] 支援 loop
- [ ] 支援 startPage
- [ ] 支援 transitionType
- [ ] 支援 transitionSpeed
- [ ] 支援 scheduleEnabled
- [ ] 支援 scheduleStartTime / scheduleEndTime
- [ ] 支援 scheduleDays
- [ ] 支援 idleMode
- [ ] 支援 idleTimeoutSec
- [ ] 支援 brightness
- [ ] 支援 orientation
- [ ] 實作 Playback Settings
- [ ] 實作 Slideshow Preview
- [ ] 完成 Phase 7 spectra / commit / review / fix 流程

---

## Phase 8 Task Checklist

- [ ] 建立 uploads/images 目錄
- [ ] 建立 image upload API
- [ ] 支援 JPG
- [ ] 支援 PNG
- [ ] 支援 WebP
- [ ] 建立 image metadata DB 寫入
- [ ] 建立 image update API
- [ ] 建立 image delete API
- [ ] 建立 image reorder API
- [ ] 計算 storage usage
- [ ] 刪除圖片時同步刪檔案
- [ ] 實作 Image Management grid
- [ ] 實作 image edit panel
- [ ] 實作 upload dropzone
- [ ] 實作 includeInSlideshow switch
- [ ] 實作 setCover
- [ ] 實作 Images 展示頁讀 enabled images
- [ ] 實作 empty state
- [ ] 完成 Phase 8 spectra / commit / review / fix 流程

---

## Phase 9 Task Checklist

- [ ] 建立 circuit configs API
- [ ] 建立 circuit reorder API
- [ ] circuit 支援 nameZh
- [ ] circuit 支援 nameEn
- [ ] circuit 支援 icon
- [ ] circuit 支援 unit
- [ ] circuit 支援 mqttTopic
- [ ] circuit 支援 ratedCapacity
- [ ] circuit 支援 normal threshold
- [ ] circuit 支援 attention threshold
- [ ] circuit 支援 warning threshold
- [ ] circuit 支援 show
- [ ] circuit 支援 sortOrder
- [ ] 計算 loadPercent
- [ ] 判斷 normal / attention / warning / offline
- [ ] MQTT topic 對應 circuit power
- [ ] 實作 Circuit Settings table
- [ ] 實作 Factory Circuit 動態渲染
- [ ] 完成 Phase 9 spectra / commit / review / fix 流程

---

## Phase 10 Task Checklist

- [ ] 建立 Device Status API
- [ ] 取得 uptime
- [ ] 取得 OS
- [ ] 取得 app version
- [ ] 取得 local IP
- [ ] 取得 MAC address
- [ ] 取得 MQTT status
- [ ] 取得 data source
- [ ] 取得 CPU usage
- [ ] 取得 memory usage
- [ ] 取得 disk usage
- [ ] 取得 temperature，如可用
- [ ] 建立 reboot stub
- [ ] 建立 clear-cache API
- [ ] 建立 logs API
- [ ] 建立 logs export API
- [ ] 實作 Device Status Details
- [ ] 建立 systemd service 範例
- [ ] 建立 Chromium kiosk mode 文件
- [ ] 建立 `.env.example`
- [ ] 建立 production build script
- [ ] 建立 SQLite backup script
- [ ] 完成最終 smoke test
- [ ] 完成 Phase 10 spectra / commit / review / fix 流程
