## 1. TDD fixture 與依賴順序

- [x] 1.1 在 apply 前確認本案先於 `harden-onekey-deploy-secret-transport`，於 `scripts/deploy.test.mjs` 回讀並保留既有 restore fixtures；以檔案 diff、測試名稱清單與兩案 dependency contract 記錄供後案回讀的基線。後案屆時須增量修改且保留本案測試，不在本案提前宣稱已驗證後案實作。
- [x] 1.2 建立既有正向 restore fixture 的 full-drill red/green test：自建 SQLite、可讀而無 executable bit 的 migration module 與 localhost server，assert integrity、migrations、health 三個 required phase、status=ok、mode=full-drill 與 fullDrill=true；以 node --test scripts/deploy.test.mjs 驗證實際 summary。
- [x] 1.3 建立 health body matrix：JSON 頂層 string status=ok 即使其他欄位含 error/token 仍通過；plain raw ok、單 LF、單 CRLF 通過；多重結尾、額外空白/文字、not-ok、只有其他欄位含 ok、malformed、empty 與超過 65536 bytes 失敗。以 localhost HTTP/override fixture assert raw bytes、phase、exit code 與無誤稱 full verification。
- [x] 1.4 建立 deadline 與 entrypoint matrix：以現有 `HEALTH_TIMEOUT_SECONDS="${RESTORE_HEALTH_TIMEOUT_SECONDS:-20}"` 驗證整體 health phase、單次 curl、health override 共用同一 absolute deadline 且不重設；另驗證 empty-stdout migration override 成功、missing migrate、valid health override without `server.js`、invalid override no fallback、missing server/no override、missing database、`RESTORE_SKIP_HEALTH=1` incomplete 與普通 restore unchanged。

## 2. Fail-closed drill 實作

- [x] 2.1 依 `Decision: Full-drill required-phase state machine`，在 `deploy/restore-runtime-state.sh` 將 integrity、migrations、health 按固定順序產生 `name`/`required`/`status`，只有三個 required phase 都是 `ok` 才輸出 `status:"ok"`、`mode:"full-drill"`、`fullDrill:true`；以 1.2、1.4 的 summary/exit assertions 驗證 unavailable、failed、skipped 不會成功。
- [x] 2.2 依 `Decision: Explicit migration and health entrypoint selection`，讓 migration override exit 0 且空 stdout 可成功、不新增 migration timeout；預設 module 要可讀且可由 Node 呼叫 migrateDatabase，不要求 executable bit。health override 取代 server.js gate，但 invalid override 直接 failed 且不可 fallback；以 1.2、1.4 entrypoint matrix 驗證。
- [x] 2.3 依 `Decision: Strict bounded health response and shared deadline`，以 byte-preserving capture 限制 65536 bytes，集中解析 JSON exact status 與三種 plain exact forms；curl、等待、override 共用同一剩餘 deadline，保留預設 server startup transient retries。補實際 delayed-start 與 hanging override/child fixtures，驗證 timeout 後 owned group 在 2 秒 cleanup grace 內停止，否則 unknown；不宣稱任意 daemon/SIGKILL 可控。
- [x] 2.4 讓 failure/incomplete path 保留每個 phase 結果與 `fullDrill:false`，skip 明示 `status:"incomplete"`/`health.status:"skipped"` 並非零離開；先完成可確認的 temp-root cleanup 才輸出 `cleanup.status:"ok"`，無法確認時輸出 `cleanup.status:"unknown"` 與 owned temp path，絕不輸出 full verified/restore drill completed；以 1.3、1.4 的 stdout/stderr/cleanup assertions 驗證。

## 3. 安全邊界、review 與交付 gate

- [x] 3.1 依 `Decision: Preserve temp-root and production-isolation boundaries`，確認只有 `--drill` 套用新 gate，普通 restore 不跑 drill-only summary/health/migration gate；保留 archive checksum/manifest、顯式 `RESTORE-OVERWRITE` confirmation、prior archive、recovery handoff，且不啟停 production service 或覆寫 production database；以既有 checksum/confirmation/rollback/production-marker tests 驗證。
- [x] 3.2 依 `Decision: TDD fixture matrix before implementation`，回讀最終 `deploy/restore-runtime-state.sh` 與 `scripts/deploy.test.mjs`，逐項對照本 change spec 的每個 scenario，補足可重跑 focused assertions；proposal 階段不把尚未執行的 runtime test、真實 restore、Pi、service、MQTT 或人工 acceptance 寫成通過。
- [x] 3.3 完成 final diff review，逐項對照 `openspec/specs/runtime-backup-and-restore/spec.md` 的 `Restore drill proves database and runtime viability` 與本 change 的四份 artifacts，確認 scope 只落在本案指定 helper/test 必要區段，並以 git diff --check、逐檔 diff 與 focused test output 修掉 review findings。
- [x] 3.4 在 review 與 focused tests 完成後最後執行 pnpm verify，保存實際輸出並標示 PASS/FAIL/NOT RUN；未有 production/field witness 時維持限制，不宣稱部署或現場驗收完成。
