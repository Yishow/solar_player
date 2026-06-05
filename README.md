# Solar Display

Solar Display 是一套部署在 Raspberry Pi、Linux mini PC 或 kiosk browser 的太陽能綠能展示播放系統。repo 根目錄就是正式的產品 monorepo 入口：web、server、shared package、runtime 資料、部署腳本與 Spectra 流程都從這裡出發。

## 產品與入口

- `apps/web`：Vite + React + TypeScript 前端，負責播放頁與管理頁
- `apps/server`：Fastify + TypeScript 後端，提供 REST API、Swagger UI、Socket.IO、SQLite 與 MQTT 整合
- `packages/shared`：前後端共用型別與工具
- `docs/openapi.yaml`：目前 server 使用的 OpenAPI 規格

## 現行狀態與 FHD 完成目標

Solar Display 已經是 root monorepo 內的正式產品，不再處於 prototype 移植階段。後續目標不是改架構或回到 prototype runtime，而是在現有 React/Fastify/SQLite/MQTT 架構上，對齊 `docs/reference/FHD/` 的 1920x1080 展示品質。

目前可視為接近完成但尚未 launch-ready：

- 14 條正式 route 都已有現行 React 頁面。
- 五個 playback 頁已具備 display page editor、draft/live publish、runtime config hydration、live preview、fallback 與 sync refresh 的基礎。
- 正式 closeout 還沒完成；五個 playback 頁仍需要逐頁補齊 authoring、runtime parity、publish refresh、fallback、handoff witness。

100% 的定義：

1. Playback 五頁 `/overview`、`/solar`、`/factory-circuit`、`/images`、`/sustainability` 都通過 FHD witness review，且不退化 hero hierarchy、photo fade、card-family rhythm、source-like icon language、absolute composition、distance readability。
2. Playback 五頁的 FHD polish 都能由 `/display-pages/editor` 維護；若 editor 無法表達，就先擴充 editor capability，而不是用 page-local hardcode 繞過。
3. Management / monitoring 頁保留現有操作架構，但內部 panel density、button hierarchy、table/form rhythm 對齊 `docs/reference/FHD/06-14`，並保留 save/test/CRUD/retry/device action 行為。
4. MQTT live data、image playlist、display page publish、shell decoration sync、offline/reconnect、fallback 與 deployment assumptions 都有測試或 manual witness 支撐。
5. 相關 Spectra changes 完成 validation / archive，並留下測試、manual witness、pass/fail/blocker 交接摘要。

五個 playback 頁的 UI 收斂重點：

- `/overview`：hero photo fade、雙語 title/eyebrow/lead 的 line-height、底部五張 KPI 卡高度與間距。
- `/solar`：connector 粗細、flow node 絕對座標、流程圖與 KPI row 的垂直節奏。
- `/factory-circuit`：電路線條粗細、葉片浮水印透明度與縮放、load panel 從屬性。
- `/images`：media stage 裁切比例、thumbnail strip 密度、caption card 字級。
- `/sustainability`：ring ornament 與 hero media 疊合、Trees/stat card 節奏、highlight rail 密度。

工程防線：

- Playback 頁不能因共用 component 或 style cleanup 退回 settings-like glass cards、toolbar stack、table-first panels。
- Flow/circuit/icon 類元素要維持 source-like visual language，不可被 generic management glyph 取代。
- Editor capability-first：FHD 差距若無法由 `/display-pages/editor` 調整，先補 schema、inspector、draft/live persistence、preview/runtime renderer、seed fallback、validation/reset 與 tests。
- Playwright visual regression stack 與四個非 Solar 頁面的 asset manifest 可以規劃，但應獨立成 Spectra changes，不要混進單頁 UI polish。

## AI-led 協作方式

本 repo 可以採 AI-led execution：AI 主動盤點現況、拆 Spectra change、改程式、跑驗證、更新交接。產品意圖、FHD 品質門檻與 tradeoff 是否接受仍由使用者決定；AI 主導不代表可以擴架構、跳過 witness、或省略驗證。

AI-led FHD witness capture 以 `docs/fhd-witness/playback-closeout-matrix.md` 與 `docs/fhd-witness/evidence-template.md` 為入口；從 root 執行 `pnpm run fhd:witness -- --base-url <url>`，只用 `docs/reference/FHD/` 對照五個 playback routes。這個 workflow 只收集 1920x1080 screenshot/evidence，不設定 pixel threshold gate；AI 負責 capture、gap notes、Spectra hygiene，人工仍負責 intentional difference 與 launch acceptance。

建議收斂順序：

1. Baseline freeze：用 browser/manual witness 跑五個 playback 頁，先取得真實 blocker。
2. Editor capability pass：逐頁確認 FHD 差距能否由 `/display-pages/editor` 表達；不能表達時先規劃 editor 擴充。
3. Playback closeout：逐頁做 FHD polish、asset/crop、publish refresh、fallback witness，不改 shared 架構。
4. Management closeout：逐頁確認 FHD density 與互動回歸，特別是 MQTT、Circuit Settings、Offline、Slideshow Preview、Device Status。
5. Runtime hardening：補齊 live data、draft/save、playlist、device diagnostics、deployment/kiosk 的 targeted tests 或 manual witness。
6. Handoff：執行 root build/test 與必要 Spectra validation/archive，留下交接摘要，再提交小而可審的變更。

## 根目錄結構

```text
.
├─ apps/              產品應用程式（web、server）
├─ packages/          共用套件
├─ data/              預設 SQLite 與 runtime 資料目錄
├─ uploads/           預設上傳圖片目錄（server 寫入 `uploads/images`）
├─ deploy/            部署腳本與 systemd service 範本
├─ docs/              API 規格、FHD 視覺 witness 與補充參考素材
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

## 維運 Runbook

- 裝置診斷安全操作與 host-level escalation：`docs/runbooks/device-diagnostics-safe-ops.md`
- 目前 app 內只支援 safe diagnostics；若需主機層處置，請依 runbook 使用 `systemctl restart solar-display`

## Spectra 與文件導覽

- 正式變更流程：`openspec/changes/`
- 穩定規格：`openspec/specs/`
- 工作流：`discuss? → propose → apply ⇄ ingest → archive`
- 已有明確 change 要實作時：從 repo 根目錄使用 `/spectra-apply <change-name>`
- FHD 視覺 witness：`docs/reference/FHD/`
- AI-led FHD witness capture：`docs/fhd-witness/playback-closeout-matrix.md`、`docs/fhd-witness/evidence-template.md`，使用 `pnpm run fhd:witness -- --base-url <url>`
- FHD workflow 入口：`docs/reference-match/fhd-workflow-entrypoints.md`
- Playback visual canonicals：`docs/reference-match/playback-visual-canonicals.md`
- Launch witness gates：`docs/reference-match/display-launch-witness-matrix.md`
- 舊 HTML prototype：只作歷史背景，不是現行 runtime 或工作入口
- MQTT 參考與其他補充文件：需要時再從 `docs/` 查找，不要優先於現行程式與 `openspec/`

如果你是第一次進入這個 repo，建議順序是：先讀本 README 取得產品、指令與路徑全貌；需要進入正式變更流程時，再查看 root `AGENTS.md`、`CLAUDE.md` 與 `openspec/`；需要判斷展示質感時，再打開 `docs/reference/FHD/`。
