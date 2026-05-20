<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra-*` skills when:

- A discussion needs structure before coding → `/spectra-discuss`
- User wants to plan, propose, or design a change → `/spectra-propose`
- Tasks are ready to implement → `/spectra-apply`
- There's an in-progress change to continue → `/spectra-ingest`
- User asks about specs or how something works → `/spectra-ask`
- Implementation is done → `/spectra-archive`
- Commit only files related to a specific change → `/spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# Claude Code 專案指引

本專案的正式產品工作目錄就是 repo 根目錄。請以 root `package.json`、`apps/`、`packages/`、`deploy/`、`openspec/` 為主，不要再把 `solar-display/` 或舊 prompt package 結構視為現行入口。

## 先看什麼

- `openspec/`：正式 specs、changes、tasks。實作前先確認這裡，而不是先翻 `docs/`。
- `apps/server/`：Fastify server、SQLite migration/seed、MQTT、runtime services。
- `apps/web/`：Vite + React 前端。
- `packages/shared/`：server/web 共用型別與 playback helpers。
- `deploy/`：目前部署實作，會反映 production 路徑與 systemd 假設。
- `docs/`：歷史提示詞、UI 參考與舊規格，只能當補充脈絡。

## 正式流程：Spectra

本專案持續使用 Spectra 作為正式工作流程。

- `/spectra-discuss`：在實作前整理需求與決策
- `/spectra-propose`：建立或更新 change proposal
- `/spectra-apply`：依 tasks 實作既有 change
- `/spectra-ingest`：需求變動後回補 artifacts
- `/spectra-ask`：查詢 specs、changes 與既有規則
- `/spectra-archive`：change 完成後封存
- `/spectra-commit`：只提交特定 change 的相關檔案

工作流：`discuss? → propose → apply ⇄ ingest → archive`

## 以現有 repo 為準的工作方式

### 指令與驗證入口

- Root scripts 目前只有這些正式入口：`dev`、`dev:web`、`dev:server`、`build`、`test`、`db:migrate`、`db:seed`。
- `pnpm run test` 目前只跑 server + web；不要假設 repo 已有 lint、e2e、coverage gate 或 CI policy。
- 若只改後端，優先跑 `pnpm --filter @solar-display/server test`；若只改前端，優先跑 `pnpm --filter @solar-display/web test`。
- `packages/shared` 目前沒有獨立 test script；改 shared 時至少確認 `pnpm run build` 與受影響 app 的 tests。

### 命名、檔案風格、imports

- workspace package 名稱維持 `@solar-display/server`、`@solar-display/web`、`@solar-display/shared`。
- `apps/server/src/` 的 relative imports 目前使用 ESM `.js` 副檔名；新增或修改 server 檔案時保持一致。
- `apps/web/src/` 目前使用 extensionless relative imports；不要把 server 的 import 風格直接搬到 web。
- `packages/shared/src/index.ts` 是共用出口；server 與 web 目前都透過 `@solar-display/shared` 取用型別與 playback 邏輯。
- 測試命名目前以 `*.test.ts` 為準，位置就在各自 `src/` 目錄下，例如 `apps/server/src/routes/images.test.ts`、`apps/web/src/hooks/playbackRouteNavigation.test.ts`。
- 若需要做瀏覽器測試，使用 `agent-browser` skill。

### Server 行為與 error handling

- `apps/server/src/server.ts` 會先 `migrateDatabase()`、`seedDatabase()`，再啟動 Fastify app 與背景服務；MQTT 初次連線失敗只記 warn，不中止整個 server。
- `apps/server/src/app.ts` 對未命中路由與未捕捉錯誤有統一回應。常見 API 錯誤形狀是 `{ success: false, error, timestamp }`；500 錯誤會回 `Internal Server Error`，不直接暴露內部例外內容。
- 成功回應的形狀並不完全一致；有些 route 回 `{ success: true, data, timestamp }`，也有些 route 直接回 `{ settings, status }` 或 `{ topics }`。修改 API 時先跟隨既有 route 形狀，不要硬套新的 envelope。
- logger 模式由 `apps/server/src/logger.ts` 決定：production 用 Fastify 預設 logger，非 production 用 `pino-pretty`。
- server 程式中優先使用 `app.log` 而非 `console.error`；`console.error` 目前只出現在 app 建立前的啟動失敗路徑。

### 安全與設定邊界

- `.env` 透過 `resolveEnvFilePath()` 從 repo root 載入；預設路徑與 runtime 位置定義在 `apps/server/src/config.ts`，包括 `data/`、`uploads/images`、`docs/openapi.yaml`。
- `.env.example` 已列出目前支援的環境變數；若新增設定，應同時確認 server/web 真的有讀取，避免在文件中列出無效參數。
- `apps/server/src/routes/images.ts` 目前會限制副檔名為 `.jpg`、`.jpeg`、`.png`、`.webp`，且檔案大小上限 10MB；不要在修改時放寬限制卻忘記同步程式與文件。
- `apps/server/src/routes/settings-mqtt.ts` 對外序列化 MQTT 設定時會把密碼回傳為 `****`；不要把實際密碼直接送回 client。
- `apps/server/src/routes/device.ts` 明確保留危險操作邊界：reboot API 預設停用，提示改用 `systemctl restart solar-display`。
- `deploy/solar-display.service` 假設安裝目錄是 `/opt/solar-display`，並以 `NoNewPrivileges=true`、`ProtectSystem=strict`、`ReadWritePaths=...data ...logs ...uploads/images` 限制寫入範圍；改動部署相關路徑時要一起檢查 `deploy/deploy.sh` 與 service 檔。

## 禁止事項

- 不要發明 repo 目前沒有的 lint、formatter、CI requirement、測試層級或部署流程。
- 不要重新引入 `solar-display/` 作為正式產品根目錄，也不要寫出雙重入口說法。
- 不要把 `docs/` 的歷史內容視為比 `openspec/`、root scripts 或實際程式碼更高的真相來源。
- 不要在未確認實作前，把 generic best practices 寫進 repo 指引；這裡只收錄能從現有檔案與行為證實的規則。

## Scope boundaries

- 只做目前任務直接要求的變更，避免順手重寫其他文件或模組。
- 若規格、文件與現況衝突，優先回到 root scripts、`apps/server`、`apps/web`、`packages/shared`、`deploy/` 與 `openspec/` 查證。
- 若想新增 repo 規則，先確認能指出對應檔案或行為；沒有證據就不要新增。
