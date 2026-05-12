# 太陽能播放系統完整規格 — System Overview

## 1. 系統目標

本系統為廠區太陽能與綠能展示播放系統，用於大螢幕或資訊看板，展示即時發電、用電、CO₂ 減量、圖片輪播、永續成果、設備狀態與系統設定。

## 2. 技術棧

| 層級 | 技術 |
|---|---|
| Frontend | Vite + React + TypeScript |
| Backend | Node.js + Fastify |
| MQTT Client | MQTT.js |
| Realtime Push | WebSocket / Socket.IO |
| Database | SQLite |
| API Spec | OpenAPI 3.1 |
| Deployment Target | Raspberry Pi / Linux mini PC / kiosk browser |

## 3. 不做項目

本版明確不包含：

- 權限 / 登入 / 角色管理
- 多租戶管理
- 雲端帳號同步
- 複雜報表系統
- 金流或第三方驗證

## 4. 核心模組

| 模組 | 說明 |
|---|---|
| Dashboard 播放展示 | Overview、Solar、Factory Circuit、Images、Sustainability 等播放頁 |
| MQTT 資料接收 | 連接 MQTT Broker，訂閱即時發電與用電 topic |
| 即時資料推送 | 後端透過 Socket.IO / WebSocket 推送前端 |
| 累積值儲存 | SQLite 儲存累積發電、累積 CO₂、每日彙總與歷史資料 |
| 圖片管理 | 本地圖片上傳、排序、啟用、輪播設定 |
| 播放控制 | 頁面順序、停留秒數、自動播放、排程、待機模式 |
| 用電迴路設定 | 設定迴路名稱、MQTT topic、單位、臨界值與顯示狀態 |
| 系統狀態 | Raspberry Pi 裝置資訊、資源監控、連線狀態、錯誤頁 |
| OpenAPI | 提供前後端可依循的 REST API 規格 |

## 5. 建議專案結構

```txt
solar-display/
  apps/
    web/                    # Vite + React + TypeScript
    server/                 # Node.js + Fastify
  packages/
    shared/                 # 共用型別、schema、constants
  data/
    solar-display.sqlite    # SQLite DB
  uploads/
    images/                 # 輪播圖片
  docs/
    openapi.yaml
    database-schema.sql
  docker-compose.yml        # optional
```

## 6. 執行模式

### 展示模式

- 前端以全螢幕 kiosk 模式執行。
- 首頁自動播放多個頁面。
- MQTT Online 時顯示即時資料。
- MQTT Offline 時切換為離線錯誤頁或保留最後資料。

### 設定模式

- 可從底部導覽或設定入口進入。
- 管理 MQTT 設定、播放設定、圖片、迴路、裝置狀態。
- 本版無登入限制，因此應部署於內網或 kiosk 專用設備。

## 7. 系統是否足夠構成產品

目前需求已足夠構成一個可落地的內網播放系統。還需要在開發前確認的只有：

1. 實際 MQTT broker 位址與帳密。
2. 每個 topic 的 payload 格式。
3. 是否需要同時支援 mock mode 與 live mode。
4. 圖片上傳大小限制與保留策略。
5. SQLite 備份策略。
6. Raspberry Pi 開機自啟流程。
