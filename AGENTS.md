<!-- SPECTRA:START v1.0.2 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `$spectra-*` skills when:

- A discussion needs structure before coding → `$spectra-discuss`
- User wants to plan, propose, or design a change → `$spectra-propose`
- Tasks are ready to implement → `$spectra-apply`
- There's an in-progress change to continue → `$spectra-ingest`
- User asks about specs or how something works → `$spectra-ask`
- Implementation is done → `$spectra-archive`
- Commit only files related to a specific change → `$spectra-commit`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `openspec/changes/`. Parked changes won't appear in `spectra list` but can be found with `spectra list --parked`. To restore: `spectra unpark <name>`. The `$spectra-apply` and `$spectra-ingest` skills handle parked changes automatically.

<!-- SPECTRA:END -->

# Agent 工作指引

## 正式工作目錄與入口

- 本 repo 根目錄就是正式產品工作目錄；直接從 root 執行 `pnpm`、讀 `package.json`、看 `apps/`、`packages/`、`deploy/`、`openspec/`。
- 不要再把 `solar-display/`、舊 prompt package、或 `docs/` 裡的歷史資料當成主要入口。
- 產品 monorepo 目前以 root `package.json` 為準，正式 workspace package 是 `@solar-display/server`、`@solar-display/web`、`@solar-display/shared`。
- 做瀏覽器測試用 agent-browser skill。

## 先看哪些地方

- `openspec/`：正式需求、change artifacts、任務勾選狀態。若使用 Spectra，先看這裡。
- `apps/server/`：Fastify API、MQTT、SQLite migration/seed、runtime services。
- `apps/web/`：Vite + React 前端。
- `packages/shared/`：server/web 共用型別與 playback 邏輯。
- `deploy/`：目前部署腳本與 systemd service，代表 production 假設。
- `docs/reference/FHD/`：現行 FHD 視覺 witness 圖；判斷展示質感時看這裡，不要回到 prototype 猜。

## 正式流程：Spectra

本專案持續使用 Spectra 作為正式工作流程。

- 需求整理或決策：`/spectra-discuss`
- 建立或更新 change：`/spectra-propose`
- 依既有 tasks 實作：`/spectra-apply`
- 規格需回補時：`/spectra-ingest`
- 查詢 specs / changes / 規則：`/spectra-ask`
- 完成後封存：`/spectra-archive`
- 只提交特定 change 相關檔案：`/spectra-commit`

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

## 目前真的存在的指令與測試入口

- Root 開發入口以 `package.json` scripts 為準：`pnpm run dev`、`dev:web`、`dev:server`、`build`、`test`、`db:migrate`、`db:seed`。
- Root `test` 目前只會跑 server 與 web：`pnpm --filter @solar-display/server test && pnpm --filter @solar-display/web test`。不要宣稱 repo 有 lint、CI gate、e2e pipeline 或其他不存在的檢查。
- Server 測試入口是 `apps/server/package.json` 的 `tsx --test src/**/*.test.ts`。
- Web 測試入口是 `apps/web/package.json` 的 `tsx --test src/**/*.test.ts`。
- `packages/shared` 目前有 build/watch，但沒有 root-level test script；若修改 shared，至少確認 build 與受影響的 server/web tests。

## 觀察到的程式碼慣例

### 命名與 import

- 套件名稱維持 `@solar-display/*`。
- Server 端 TypeScript 是 ESM 風格，relative import 目前使用 `.js` 副檔名，例如 `./config.js`、`../db/index.js`；編輯 `apps/server/src/` 時跟隨這個模式。
- Web 端目前使用 extensionless relative imports，例如 `./playbackRouteNavigation`、`../services/api`；不要把 server 的 `.js` import 風格硬套到 `apps/web/src/`。
- 共用匯出目前由 `packages/shared/src/index.ts` 集中轉出；若新增跨 package 共用型別或 playback 工具，優先沿用這個入口。

### 錯誤處理與回應形狀

- Server 的 Fastify app 在 `apps/server/src/app.ts` 統一處理未命中路由與未捕捉錯誤；API 錯誤回應目前常見形狀是 `{ success: false, error, timestamp }`。
- 500 類錯誤在 `setErrorHandler` 會回傳 `Internal Server Error`，不要把內部細節直接暴露給 client。
- 啟動流程在 `apps/server/src/server.ts`：會先 migrate/seed，再建立 app，MQTT 初次連線失敗只記 warn，不會阻止 server 啟動。
- 在 server 程式中優先使用 `app.log` / Fastify logger；`console.error` 目前只出現在 app 尚未建立前的啟動失敗路徑，`debug-multipart.ts` 屬例外工具腳本，不要把它當成一般模式。

### 安全與 runtime 假設

- `.env` 由 `apps/server/src/server.ts` 搭配 `resolveEnvFilePath()` 載入；預設資料位置來自 `apps/server/src/config.ts`：`data/`、`uploads/images`、`docs/openapi.yaml`、`apps/server/src/db/migrations`。
- `.env.example` 已列出目前支援的 server / MQTT / logging / web 變數；新增設定前先確認是否真的有對應實作。
- `apps/server/src/routes/images.ts` 目前只接受 `.jpg`、`.jpeg`、`.png`、`.webp`，且上傳大小上限為 10MB；不要在文件中省略這些現有限制。
- `apps/server/src/routes/settings-mqtt.ts` 對外回傳 MQTT 設定時會把密碼遮成 `****`；若修改這段行為，必須維持不直接回傳明文密碼。
- `apps/server/src/routes/device.ts` 明確把 reboot API 保持停用，提示改用 `systemctl restart solar-display`；不要把危險裝置操作包裝成預設可用功能。
- `deploy/solar-display.service` 啟用 `NoNewPrivileges=true`、`ProtectSystem=strict`，並只開放 `data`、`logs`、`uploads/images` 可寫；若調整 runtime 目錄或部署假設，要同步檢查 `deploy/`。

## 禁止事項

- 不要發明 repo 目前沒有的 lint、formatter、CI、deploy 平台或測試流程，文件與指引只能描述現況。
- 不要重新引入 `solar-display/` 路徑前綴、wrapper 目錄或雙重入口說法。
- 不要把 prototype HTML、舊 prompt package 或 `docs/reference/kuozui-green-fhd-html-prototype/` 當成現行 source of truth；FHD closeout 以現行程式、OpenSpec/Spectra 與 `docs/reference/FHD/` 為準。
- 不要隨手改動 `deploy/`、runtime 路徑、systemd 假設或 `.env.example`，除非本次任務直接涉及那些行為。

## 工作邊界

- 預設只修改目前 task / change 直接要求的檔案；不要順手重構無關模組。
- 若文件、規格與現況衝突，優先回到 root scripts、`apps/server`、`apps/web`、`packages/shared` 與 `deploy/` 查實作，再決定是否更新 artifact。
- 若要描述 repo 規則，必須能回指出目前實際檔案或行為；找不到事實支撐時，應刪掉該規則，而不是補上通用政策。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
