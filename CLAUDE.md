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
- `docs/reference/FHD/`：現行 FHD 視覺 witness 圖；判斷展示質感時看這裡，不要回到 prototype 猜。

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

## FHD / Display Closeout 入口

當 change 會碰 playback 頁面、shared display chrome、`/display-pages/editor`，或其他 FHD surface 時，先把 scope 壓在現行產品與 FHD witness 上：

1. 對照 `docs/reference/FHD/` 裡對應頁面的 PNG。
2. 讀現行 route/component/config：`apps/web/src/pages/<Page>/`、`apps/web/src/pages/DisplayPagesEditor/`、`apps/web/src/pages/shared/`。
3. 查對應 `openspec/specs/` 或 `openspec/changes/`，確認這次是 polish、runtime parity、fallback、publish refresh，還是工具鏈/asset pipeline。
4. 用 targeted tests 與 browser/manual witness 驗證；結果寫在本次 change artifact 或回報，不要把 root docs 當成逐頁 QA ledger。

FHD workflow vocabulary 以 `docs/reference-match/fhd-workflow-entrypoints.md` 為入口；agent-facing 文件要沿用同一組 `witness batch`、`evidence bundle`、`visual canonicals`、`launch witness gates` 語彙。

Editor capability-first 原則：

- 五個 playback 頁的 FHD closeout 都必須優先確認能否由 `/display-pages/editor` 維護。
- 若 FHD 差距無法由 editor 表達，優先把它定義成 editor capability gap，補 shared schema、inspector control、draft/live persistence、preview/runtime renderer、seed fallback、validation/reset 與 targeted tests。
- Page-local changes 只能用來承接 editor config 到 page-specific runtime primitive；不要用 page-local hardcode 繞過 editor。

AI-led execution 原則：

- 本 repo 允許 AI 主導執行：主動盤點現況、拆 Spectra change、改程式、跑驗證、更新 handoff。
- 產品意圖、FHD 品質門檻與 tradeoff 是否接受仍由使用者決定；AI 不可用「AI 主導」當成擴架構、跳過 witness、或省略驗證的理由。

## 現行產品狀態與 FHD 100% 收斂目標

現行產品已經在 root monorepo 內開發，不再處於 prototype 移植階段。後續目標是在不改動既有 React/Fastify/SQLite/MQTT/Spectra 架構的前提下，把已完成約 70-80% 的展示系統收斂到 `docs/reference/FHD/` 的可交付品質。

現況判讀：

- 14 條 route 都已經有 React implementation，主要缺口不是 prototype 移植，而是 FHD 品質收尾。
- 尚未 launch-ready；五個 playback 頁仍需要新鮮 authoring/runtime/publish/fallback/handoff witness，而不是要重開架構。
- 100% 的主要缺口是 FHD polish、editor capability、runtime parity、fallback/publish refresh、evidence bundle 與交接紀錄。

Playback 五頁 closeout 方向：

- `/overview`：hero photo fade、雙語 title/eyebrow/lead 的 line-height、底部五張 KPI 卡高度與間距。
- `/solar`：connector 粗細、flow node 絕對座標、流程圖與 KPI row 的垂直節奏。
- `/factory-circuit`：電路線條粗細、`DisplayLeafOrnament` opacity/scale、load panel 從屬性，避免變成管理表格。
- `/images`：media stage 裁切比例、thumbnail strip 密度、caption card 字級與展示張力。
- `/sustainability`：ring ornament 與 hero media 疊合、Trees/stat card 節奏、highlight rail 密度。

防止 management-surface drift：

- Playback 頁不可因共用 component 或 style cleanup 退回 settings-like glass cards、toolbar stack、table-first panels。
- Flow/circuit/icon 類元素要維持 source-like visual language，不可被 generic management glyph 取代。
- 不要用 page-local hardcode 繞過 editor；editor 不足時先擴充 editor capability。
- 不要順手重寫 shell、route、API 或資料模型。

100% 收斂順序：

1. Baseline freeze：先用 browser/manual witness 跑五個 playback 頁，取得真實 pass/fail/blocker，不靠舊 checklist 推論。
2. Editor capability pass：逐頁確認 FHD 差距能否由 `/display-pages/editor` 表達；不能表達時先規劃 editor schema/inspector/runtime 擴充。
3. Playback closeout：依上方五頁方向逐頁處理 FHD 差距，並在本次 Spectra/change artifact 留下 protected attributes 與例外。
4. Management closeout：檢查 `/trends`、settings、history、offline、slideshow preview、device status 的 FHD density 與互動回歸；每頁保留既有 API、draft、save/test/CRUD 行為。
5. Tooling / assets：用 Spectra 另拆 change 評估 Playwright visual regression stack；若要補 asset pipeline，優先補四個非 Solar playback 頁的 manifest，不要一次混入 UI polish。
6. Handoff：完成 Spectra validation/archive、留下測試與 witness 摘要，再提交小而可審的 changes。

禁止事項：

- 不要把 prototype HTML 當成新的 runtime 入口。
- 不要為了 FHD polish 改掉 root monorepo、route shell、server API、SQLite/MQTT 架構。
- 不要用 page-local hardcode 取代應該由 `/display-pages/editor` 維護的展示設定。
- 不要把 task checkbox 全勾或單次 build 通過解讀為 100%；沒有 fresh witness、runtime parity 與 fallback/publish 驗證就不是完成。

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
- 不要把 prototype HTML、舊 prompt package 或 `docs/reference/kuozui-green-fhd-html-prototype/` 當成現行 source of truth；FHD closeout 以現行程式、OpenSpec/Spectra 與 `docs/reference/FHD/` 為準。
- 不要在未確認實作前，把 generic best practices 寫進 repo 指引；這裡只收錄能從現有檔案與行為證實的規則。

## Scope boundaries

- 只做目前任務直接要求的變更，避免順手重寫其他文件或模組。
- 若規格、文件與現況衝突，優先回到 root scripts、`apps/server`、`apps/web`、`packages/shared`、`deploy/` 與 `openspec/` 查證。
- 若想新增 repo 規則，先確認能指出對應檔案或行為；沒有證據就不要新增。
