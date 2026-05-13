# Solar Display

Solar Display 是一套部署在 Raspberry Pi、Linux mini PC 或 kiosk browser 的太陽能綠能展示播放系統。repo 根目錄就是正式的產品 monorepo 入口：web、server、shared package、runtime 資料、部署腳本與 Spectra 流程都從這裡出發。

## 產品與入口

- `apps/web`：Vite + React + TypeScript 前端，負責播放頁與管理頁
- `apps/server`：Fastify + TypeScript 後端，提供 REST API、Swagger UI、Socket.IO、SQLite 與 MQTT 整合
- `packages/shared`：前後端共用型別與工具
- `docs/openapi.yaml`：目前 server 使用的 OpenAPI 規格

## 根目錄結構

```text
.
├─ apps/              產品應用程式（web、server）
├─ packages/          共用套件
├─ data/              預設 SQLite 與 runtime 資料目錄
├─ uploads/           預設上傳圖片目錄（server 寫入 `uploads/images`）
├─ deploy/            部署腳本與 systemd service 範本
├─ docs/              API 規格、歷史文件與參考素材索引
├─ openspec/          Spectra 規格、change artifacts 與任務
├─ package.json       根目錄工作流指令
└─ .env.example       環境變數範本
```

## 開發前置條件

- Node.js 20+
- pnpm 10+
- 以 repo 根目錄為工作目錄
- 本機可寫入 `data/`、`uploads/`、`logs/`

### `.env` 設定

1. 複製 `.env.example` 為 `.env`。
2. 依需求調整以下欄位：
   - `PORT`、`HOST`：server 監聽位址，預設 `3000` / `0.0.0.0`
   - `DATA_DIR`、`DATABASE_PATH`：runtime 資料與 SQLite 路徑，預設 `./data`、`./data/solar-display.sqlite`
   - `LOG_DIR`、`LOG_LEVEL`：server log 目錄與等級，預設 `./logs`
   - `MQTT_*`：MQTT broker、帳號與 data mode；未接 broker 時可維持 `MQTT_DATA_MODE=mock`
   - `VITE_API_BASE_URL`：前端 API 位址；本機開發通常可留空

## 根目錄常用指令

所有指令都在 repo 根目錄執行。

| 用途 | 指令 |
| --- | --- |
| 安裝依賴 | `pnpm install` |
| 同時啟動 web + server | `pnpm run dev` |
| 只啟動前端 | `pnpm run dev:web` |
| 只啟動後端 | `pnpm run dev:server` |
| 建置 shared + web + server | `pnpm run build` |
| 執行 server + web 測試 | `pnpm run test` |
| 資料庫 migration | `pnpm run db:migrate` |
| 資料庫 seed | `pnpm run db:seed` |

## Runtime 資料位置

目前實作的預設 runtime 路徑都以 repo 根目錄為基準：

- `data/`：SQLite 與其他資料檔；server 預設資料庫檔名為 `solar-display.sqlite`
- `uploads/images/`：圖片上傳與播放素材儲存位置
- `logs/`：server log 目錄（由 `.env` / deploy service 指定）
- `docs/openapi.yaml`：server 啟動時讀取的 OpenAPI 規格檔

## 部署入口

`deploy/` 是目前的部署入口，內容對應現有腳本與 service 範本：

- `deploy/deploy.sh`：先在 repo 根目錄執行 `pnpm run build`，再把 `apps/`、`packages/`、workspace manifests 與 `.env.example` 複製到預設安裝位置 `/opt/solar-display`
- `deploy/solar-display.service`：systemd 服務範本，使用 `WorkingDirectory=/opt/solar-display`，並將 `DATA_DIR`、`LOG_DIR` 指向 `/opt/solar-display/data`、`/opt/solar-display/logs`

## Spectra 與文件導覽

- 正式變更流程：`openspec/changes/`
- 穩定規格：`openspec/specs/`
- 工作流：`discuss? → propose → apply ⇄ ingest → archive`
- 已有明確 change 要實作時：從 repo 根目錄使用 `/spectra-apply <change-name>`
- 歷史提示詞、prototype、MQTT 參考與其他補充文件：先看 `docs/README.md` 再進入對應子目錄

如果你是第一次進入這個 repo，建議順序是：先讀本 README 取得產品、指令與路徑全貌；需要補充脈絡時讀 `docs/README.md`；需要進入正式變更流程時，再查看 root `AGENTS.md`、`CLAUDE.md` 與 `openspec/`。
