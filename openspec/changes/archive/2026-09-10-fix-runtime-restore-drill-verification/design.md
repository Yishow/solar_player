## Context

本案修改既有 `runtime-backup-and-restore` 的 restore drill 契約。現行 `deploy/restore-runtime-state.sh` 已先驗證 manifest/archive，再把資料解出到暫存根；但 `run_migrations` 在找不到 migrate entrypoint 時回報 inventory-only skip 並成功，`run_health_smoke` 以 substring grep 判定 response，drill 結尾再固定輸出完整驗證成功。`scripts/deploy.test.mjs` 已有可重跑的正向 fixture，會自建 SQLite database、`migrate.js` 與 localhost health server；本案在此基礎上補負面證據。

規格 authority 是 `openspec/specs/runtime-backup-and-restore/spec.md` 的 `Restore drill proves database and runtime viability` requirement。後續 apply 的程式範圍只限 `deploy/restore-runtime-state.sh` 與 `scripts/deploy.test.mjs` 對 restore drill 的必要區段；本案不改 archive export、production restore safety、其他部署流程或 production state。本 propose 不改 main specs；未來正式 closeout 的 spec sync 依 workflow。

## Goals / Non-Goals

**Goals:**

- 將 integrity、migrations、bounded health 三個 required phase 建模為明確結果；full drill 只在三者全部成功時完成。
- 讓健康回應只接受 JSON object 的頂層 `status` 精確等於 `ok`，或原始 plain bytes 精確為 `ok`、`ok` 加一個 LF、`ok` 加一個 CRLF。
- 缺少 SQLite database、migrate entrypoint、預設 `server.js`、health endpoint、可用 override 或 bounded process 結果時 fail closed；有效 health override 可取代預設 `server.js` availability gate。
- 讓成功、失敗、incomplete/skip 都有不會誤導 operator 的 phase 結果、cleanup 結果與 exit code。
- 保留 archive checksum/manifest 驗證、temp root、顯式 overwrite confirmation、production service/database isolation、prior application archive 與 recovery handoff。

**Non-Goals:**

- 不改變 runtime archive 格式、export helper、production overwrite confirmation 或 production database 的自動還原政策。
- 不要求 archive 內包含整個 repository；full drill 只對 restore contract 所需的 database、migration entrypoint 與 health entrypoint 做 availability gate，不把「缺少全部 application code」錯誤包裝成成功。
- 不在 proposal 階段執行 runtime tests、真實 restore、production service、MQTT、Pi 或 deployment acceptance。
- 不修改 app、pi5-deployment skill、其他 changes 或 `scripts/deploy.test.mjs` 中與本案無關的測試；本 propose 不修改 main specs。

## Decisions

### Decision: Full-drill required-phase state machine

restore helper 以 integrity、migrations、health 的固定順序執行 required phases。每個 phase 產生 `name`、`required` 與 `status`；`status` 只使用 `ok`、`failed`、`unavailable`、`skipped`。full drill 的總結使用 `status`、`mode`、`fullDrill` 與 `phases` 欄位，成功形狀為 `status="ok"`、`mode="full-drill"`、`fullDrill=true`，且三個 phase 都是 `required=true` 與 `status="ok"`。

任何 `unavailable`、`failed` 或 `skipped` 都讓 full drill 非成功。失敗摘要使用 `status="failed"`、`fullDrill=false`，並保留已完成及失敗 phase；inventory/skip 路徑使用 `status="incomplete"`、`fullDrill=false`、明確的 `health.status="skipped"`，且以非零 exit code 結束。所有非成功摘要都不得輸出 `full verified`、`restore drill completed` 或同義的完整驗證訊息。

失敗摘要在可控制的正常/錯誤退出路徑先完成暫存根 cleanup，再帶 `cleanup.status="ok"`；若 cleanup 無法確認，必須帶 `cleanup.status="unknown"` 與可 recovery 的本次 owned temp path，不能以成功 cleanup 掩蓋不確定性。

替代方案：只把 skip 文字改成 warning，但維持零 exit code，仍會讓 automation 把結果視為成功，因此拒絕。

### Decision: Explicit migration and health entrypoint selection

`RESTORE_DRILL_MIGRATE_CMD` 若有設定，migration phase 以 command exit 0 判定成功；stdout 可以是空的，也不解析 health body。command nonzero 或無法啟動是 failed。現行 migration 沒有 timeout；本案不新增此限制，不宣稱 health timeout 約束 integrity 或 migration。沒有 migration override 時，必須有可讀的 `apps/server/dist/db/migrate.js`、可用 Node runtime，且 module 的 migrateDatabase 可呼叫並成功；不要求 module 的 OS executable bit。缺少檔案/runtime 是 unavailable，載入或 migration 失敗是 failed。

`RESTORE_DRILL_HEALTH_CMD` 若有設定，health phase 使用它作為 bounded health entrypoint；此時不要求 `apps/server/dist/server.js`，但 override 必須在同一個 health deadline 內 exit 0 且 stdout body 通過 strict parser。override 已設定但 body 無效、空白、超時、nonzero 或無法啟動時直接 `failed`，不得 fallback 到 `server.js`。只有沒有 configured health override 時，才要求暫存根內的 `apps/server/dist/server.js`，再以 curl probe；缺少該檔案是 `unavailable`。

替代方案：無條件要求 `server.js`，會拒絕合法的 explicit bounded health override；在 override 失敗時 fallback，則會把 override contract failure 隱藏起來，兩者皆拒絕。

### Decision: Strict bounded health response and shared deadline

沿用目前 helper 的 timeout constant `HEALTH_TIMEOUT_SECONDS="${RESTORE_HEALTH_TIMEOUT_SECONDS:-20}"`，預設值為 20 秒；health phase 開始時建立一個以 monotonic clock 計算的 absolute deadline。整個 health phase（含預設 server 啟動、所有 curl probes 與等待，或 health override process）共用這一個 deadline，不重設、不以重試延長。

預設每次 curl 的 --max-time 不大於 absolute deadline 的剩餘秒數。server 尚在啟動時的連線拒絕或非成功 HTTP 狀態可在同一 deadline 內輪詢；等待也受剩餘時間約束。成功 HTTP 的 invalid/oversize body、server 提前退出、deadline 用完皆失敗。explicit override 只執行一次，nonzero、invalid/empty/oversize body 或 timeout 直接失敗、不 fallback。兩路共用 raw-body validator。

response body 上限固定為 `HEALTH_RESPONSE_MAX_BYTES=65536` bytes，超過即停止 capture 並 failed；body 讀取保留 raw bytes，不以 command substitution 或任意 trim 改寫內容。JSON body 必須是 object 且頂層 status 是字串 ok，允許其他欄位含 error/token 等文字；只有其他欄位含 ok、但頂層 status 缺少或不等於 ok 不能通過。plain 只接受 `ok`、`ok\n`、`ok\r\n`；多重結尾、前後空白、額外文字、not-ok、malformed JSON、空 body 失敗。migration stdout 不套用 health body requirement。

使用既有 Node runtime 實作 bounded process supervision，在本次 owned process group 執行預設 server 或 override；正常、失敗、HUP/INT/TERM 或 deadline 到期皆停止該 group，先 TERM 再在最多 2 秒 cleanup grace 內 KILL/reap。不得只 kill 外層 shell 而留下 fixture 的一般子程序。cleanup grace 不延長健康判定 deadline；無法確認停止/刪除則 cleanup unknown、非成功。自行 daemonize 逃離 group、SIGKILL/斷電不在可保證 cleanup 範圍，不能宣稱任意 override 被 sandbox。

不新增 executable dependency；parser 與 bounded capture 使用 repository 已有 shell/node/curl 能力，且 curl 與 override 必須共用同一個 raw-body validation boundary。

替代方案：擴大 grep pattern、以 command substitution 後的結果判斷、或只檢查 curl/process exit code，無法區分 error JSON、額外換行與空 body，拒絕。

### Decision: Preserve temp-root and production-isolation boundaries

drill 仍只在 fresh temp root extract prior application archive、apply mutable paths、跑 integrity/migrations/health，完成後由既有 cleanup trap 清除；不停止或啟動 production service，不將 runtime archive 寫回 production target。archive checksum/manifest verification 與非空 target 的 RESTORE-OVERWRITE gate 維持原行為。

只有帶 `--drill` 的路徑套用上述 required-phase gate。普通 restore 不啟動 drill-only health/migration summary，不改其既有 checksum、顯式 overwrite confirmation、rollback material 與 production isolation 行為。

替代方案：為了 health probe 暫時啟動 production service，會破壞 restore drill 的 isolation 及資料安全邊界，拒絕。

### Decision: TDD fixture matrix before implementation

先在 `scripts/deploy.test.mjs` 對既有正向 fixture 建立失敗測試，再改 helper。測試矩陣至少包含 exact JSON success、plain `ok` 的三種 exact forms、not-ok JSON、error JSON with token substring、malformed response、empty body、oversize body、health timeout、missing migrate entrypoint、empty-stdout migration override、missing server.js/health entrypoint、valid health override without server.js、invalid override without fallback、`RESTORE_SKIP_HEALTH` incomplete、missing database、普通 restore unchanged，以及 production marker unchanged。runtime change apply 完成後，後續 secrets change 只能回讀並增量修改同一測試檔。

替代方案：只做 source regex assertions，無法證明 process、HTTP body、deadline、exit code 與 cleanup 的實際邊界，拒絕。

## Implementation Contract

- Behavior：deploy/restore-runtime-state.sh --drill 的預設路徑依序完成 integrity、migrations、health。完整成功必須同時執行三個 required phase，並輸出可解析的 JSON summary：

  ```json
  {"status":"ok","mode":"full-drill","fullDrill":true,"phases":[{"name":"integrity","required":true,"status":"ok"},{"name":"migrations","required":true,"status":"ok"},{"name":"health","required":true,"status":"ok"}]}
  ```

  phase 的實際輸出可以附 human-readable context，但不得以人類訊息取代 summary。
- Interface/data shape：health JSON 判定只看頂層 string `status === "ok"`；plain body 只接受 raw `ok`、`ok\n` 或 `ok\r\n`。`RESTORE_DRILL_MIGRATE_CMD` 的 exit 0（即使 stdout 空）是 migration 成功；`RESTORE_DRILL_HEALTH_CMD` 則必須在 shared `HEALTH_TIMEOUT_SECONDS` deadline 內 exit 0 且 body <=65536 bytes 並通過同一 parser。`RESTORE_SKIP_HEALTH=1` 必須回報 incomplete/skipped 並非零離開。
- Availability：沒有 health override 時才要求 `apps/server/dist/server.js`；有 configured health override 時不要求該檔，但 invalid override 直接 failed 且不可 fallback。沒有 migration override 時要求 `apps/server/dist/db/migrate.js`。缺少 `data/solar-display.sqlite` 是 integrity unavailable/failed。
- Failure/cleanup：任何 required phase 非 `ok`、command/process nonzero、timeout、oversize、malformed body、tampered archive 或 phase skipped 都不得回報 full success；失敗 summary 必須保留 phase 結果與 `fullDrill=false`，並在 cleanup 可證實時標 `cleanup.status="ok"`，否則標 `unknown` 與 owned temp path。不得輸出誤稱 full verified 的訊息。
- Acceptance criteria：後續 apply 在 `scripts/deploy.test.mjs` 使用真實隔離 SQLite、可讀但無 executable bit 的 migration module、localhost HTTP 與 override fixtures，證明 success、startup retry、JSON 其他欄位相容、負面非零 exit、phase/summary、deadline/body cap、owned child termination 與 production marker 不變；不得用真實 production root 或 credentials。先跑 focused deploy test，再 review 修正，最後跑 pnpm verify。
- In scope：apply 只修改 `deploy/restore-runtime-state.sh` 與 `scripts/deploy.test.mjs` 中對 restore drill 的必要區段。
- Out of scope：`deploy/export-runtime-state.sh`、`deploy/raspi-bootstrap.sh`、`deploy/deploy.sh`、`deploy/configure-lightweight-desktop.sh`、`deploy/verify-kiosk-install.sh` 及其他 deploy files；另排除 app、archive contents、production service/database、後續 secrets implementation 及本案範圍外測試。本 propose 不修改 main specs；未來正式 closeout 的 spec sync 依 workflow。

## Risks / Trade-offs

- [Risk] 嚴格 availability gate 會讓只有 inventory 檔案的舊 fixture 不再取得零 exit code。→ [Mitigation] 保留明確 incomplete/skip diagnostics，但以非零 exit 與 `fullDrill=false` 防止誤用；正向 fixture 自建 migrate.js 與 server.js。
- [Risk] strict body parser 引入 JSON parse 與 byte-preserving capture 的 shell/node 交界複雜度。→ [Mitigation] 重用 repository 既有 node runtime，將 response parsing 集中在單一 bounded helper，並以 malformed/error/token/extra-newline/oversize fixtures 驗證。
- [Risk] shared `scripts/deploy.test.mjs` 後續會被 secrets change 修改。→ [Mitigation] 依序 apply；secrets change 必須回讀本案最新檔案、保留 restore tests 並只追加自己的 sentinel tests。

## Migration Plan

1. apply 先建立 red fixtures，再以最小 diff 修正 restore helper，重跑 focused deploy tests。
2. review 完成後跑 pnpm verify；未提供真實 production restore、Pi、service、MQTT 或人工 acceptance 證據時，維持未驗證標記。
3. 後續只有在本案完成且最新測試檔可回讀後，才 apply `harden-onekey-deploy-secret-transport`；該案必須在本案之後追加 `scripts/deploy.test.mjs`，不得覆蓋 restore tests。
4. 本 propose 階段不執行 main-spec sync、archive 或 commit；未來正式 closeout 依 workflow 進行 spec sync，commit 仍需使用者明確要求。

## Open Questions

無待決產品問題；summary 欄位、entrypoint OR gate、strict body forms、65536-byte cap、shared 20-second default deadline、incomplete exit 與 cleanup unknown 行為均是固定 handoff。
