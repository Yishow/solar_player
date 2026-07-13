# Repo 慣例與驗證入口

> 讀者：任何在本 repo 工作的 agent（Claude、Codex 等）。所有條目查證於 2026-07-03；發現與現況不符時，先信程式碼，再按 `docs/ops/maintenance.md` 修本檔。

## 指令（root package.json 實際存在的全部入口）

| 指令 | 作用 |
|---|---|
| `pnpm dev` | `scripts/dev.mjs` 起完整開發環境 |
| `pnpm dev:fix` | rebuild better-sqlite3 後再 dev（原生模組壞掉時用） |
| `pnpm dev:web` / `pnpm dev:server` | shared watch + 單邊 dev |
| `pnpm build` | shared → web → server 依序 build（另有 `build:shared`、`build:web`、`build:server`） |
| `pnpm test` | 開發迴圈：完整 server suite + web suite（不含 build、deploy） |
| `pnpm verify` | **交付 gate**：序列執行 build → server → web → deploy → server-runner（`scripts/verify.mjs`） |
| `pnpm db:migrate` / `pnpm db:seed` | SQLite migration / seed |
| `pnpm run fhd:witness -- --base-url <url>` | 擷取五個 playback 頁 1920x1080 witness（`fhd:witness:dry-run` 可先演練） |

repo **沒有** lint、e2e、coverage gate、CI policy——不要發明，也不要在回報中假設它們存在。

## 測試入口：`test` vs `verify`

- **focused / 開發**：`pnpm test` 或套件級
  - server：`pnpm --filter @solar-display/server test`（= `node ./scripts/run-tests.mjs`）。Node filesystem walk 明確列出 `apps/server/src/**/*.test.ts`（含頂層），lexical sort 後以 `tsx --test --test-concurrency=1` 執行。可傳 explicit targets：`pnpm --filter @solar-display/server test src/config.test.ts`。
  - web：`pnpm --filter @solar-display/web test`（`scripts/run-tests.mjs` 包 tsx --test）。
- **交付 gate**：`pnpm verify` 印出固定 stage labels：`build`、`server`、`web`、`deploy`、`server-runner`。任一 stage 非零即停止並保留該 label，後續 stage 不會掩蓋失敗。
- shared：`packages/shared` 沒有獨立 test script。改 shared → 至少跑 `pnpm run build` + 受影響 app 的測試。
- deploy：`scripts/deploy.test.mjs` 已納入 `pnpm verify` 的 deploy stage；單獨跑：`node --test scripts/deploy.test.mjs`。
- server runner 自我測試：`node --test apps/server/scripts/run-tests.test.mjs`（亦在 verify 的 server-runner stage）。
- 測試命名 `*.test.ts`，放在被測程式旁邊（如 `apps/server/src/routes/images.test.ts`）。

## 命名、檔案風格、imports

- workspace 名稱固定：`@solar-display/server`、`@solar-display/web`、`@solar-display/shared`。
- `apps/server/src/` 的 relative imports 用 ESM `.js` 副檔名；`apps/web/src/` 用 extensionless——兩邊風格不要互相搬。
- `packages/shared/src/index.ts` 是共用出口；server 與 web 都透過 `@solar-display/shared` 取用型別與 playback 邏輯。

## Server 行為與 error handling

- `apps/server/src/server.ts` 啟動順序：`migrateDatabase()` → `seedDatabase()` → Fastify app + 背景服務；MQTT 初次連線失敗只記 warn，不中止 server。
- `apps/server/src/app.ts` 統一處理未命中路由與未捕捉錯誤。常見錯誤形狀 `{ success: false, error, timestamp }`；500 回 `Internal Server Error`，不暴露內部例外。
- 成功回應形狀**不一致是現況**：有的 route 回 `{ success: true, data, timestamp }`，有的直接回 `{ settings, status }` 或 `{ topics }`。改 API 時跟隨該 route 既有形狀，不要硬套新 envelope。
- logger 由 `apps/server/src/logger.ts` 決定（production 用 Fastify 預設、其他用 pino-pretty）；程式內用 `app.log`，`console.error` 只准出現在 app 建立前的啟動失敗路徑。

## 安全與設定邊界

- `.env` 由 `resolveEnvFilePath()` 從 repo root 載入；預設路徑與 runtime 位置（`data/`、`uploads/images`、`docs/openapi.yaml`）定義在 `apps/server/src/config.ts`。新增環境變數要確認 server/web 真的有讀，並同步 `.env.example`。
- `apps/server/src/routes/images.ts`：副檔名限 `.jpg/.jpeg/.png/.webp`、上限 10MB。改動時程式與文件要同步。
- `apps/server/src/routes/settings-mqtt.ts`：對外序列化 MQTT 密碼回 `****`，不回真值。
- `apps/server/src/routes/device.ts`：reboot API 預設停用，提示改用 `systemctl restart solar-display`。這是刻意的安全邊界，不要「順手啟用」。

## 部署（三個入口各司其職，不是重複）

- `deploy/`：現行部署實作。`deploy/deploy.sh` **預設**安裝到 `/data/solar-display`（與 Pi / readonly-root / kiosk 同一契約）；可傳 explicit 絕對 install root，unit 的 WorkingDirectory、EnvironmentFile、DATA_DIR、LOG_DIR、ReadWritePaths 一律渲染到該 root。`deploy/solar-display.service` 保留 `/data/solar-display` canonical 範本，並以 `NoNewPrivileges=true`、`ProtectSystem=strict`、有界 `ReadWritePaths` hardening。更新不覆寫 `.env` / `data` / `logs` / `uploads`。
- root `deploy.sh`：打包 online/offline bundle 到 `dist/deploy-bundles/`。
- root `deploy.md`：Pi 5 kiosk 部署 handoff 說明，引用 deploy/ 內腳本（正式 runtime 亦為 `/data/solar-display`）。
- 改部署路徑時，`deploy/deploy.sh`、service 檔、`deploy.md`、本檔四處一起檢查；勿再描述 `/opt/solar-display` 為正式 service contract（舊 /opt 安裝需 operator 自行備份後改裝 /data）。
