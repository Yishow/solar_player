## Problem

P1 修正：restore drill 目前在找不到 migrate entrypoint 時把跳過當成完成，health smoke 以 substring grep 判定健康，可能接受 not-ok、error 或含 token 的 JSON；即使必要 phase 被跳過，結尾仍會輸出完整驗證成功。這違反 runtime-backup-and-restore 對 temp root integrity、migrations 與 bounded healthy smoke 的完整驗證契約，會讓 operator 把 inventory-only 結果誤認為可恢復性證據。

## Root Cause

- run_migrations 在缺少 apps/server/dist/db/migrate.js 且沒有 migration override 時回報 inventory-only skip 並以成功結果返回。
- run_health_smoke 用 grep substring 判定 response，沒有區分頂層 JSON status、plain body、malformed response 或 token substring；health override 也不能只靠 process exit 0 證明健康。
- drill 結尾固定輸出完整驗證訊息，沒有把 integrity、migrations、health 的 required phase 結果與 skip/unavailable 狀態納入總 gate。

## Proposed Solution

- 將 restore drill 的 integrity、migrations、bounded health 三個 phase 改為明確、可機器判讀的結果；full drill 只有所有 required phases 成功才輸出 status exactly ok 的 JSON summary。
- full drill 要求 restored SQLite database，以及可由 Node 載入的 migration entrypoint，或由 RESTORE_DRILL_MIGRATE_CMD 提供 migration override；migration override exit 0 即可成功，stdout 可以是空的。現行 migration 沒有 timeout，本案不新增 migration deadline，也不把 health deadline 宣稱為整個 drill 的時間上限。
- 只有沒有 configured health override 時才要求 apps/server/dist/server.js；有效 bounded health override 可以取代該 gate，缺少 server.js 不得因此直接失敗。override 已設定但 invalid 時直接失敗且不得 fallback；override 必須在同一個 HEALTH_TIMEOUT_SECONDS deadline 內 exit 0 且產生可接受的 response body，exit 0 或空 body 單獨不足以證明 health。
- 沿用現有 HEALTH_TIMEOUT_SECONDS，來源為 RESTORE_HEALTH_TIMEOUT_SECONDS，預設 20 秒；整個 health phase 建立單一 absolute deadline，單次 curl 的 --max-time 與 override process 都只可使用該 deadline 的剩餘時間且不得重設，response body 上限固定 65536 bytes，不新增依賴。
- health 只接受 JSON object 的頂層 status 精確等於 ok，或 exact plain body ok、ok 加一個 LF、ok 加一個 CRLF；其他 JSON 欄位不影響有效 status。沒有正確頂層 status 的 error/token substring 不算健康；plain 多重換行、額外空白、not-ok、malformed 或超過上限均失敗。預設 server 啟動中的暫時連線失敗可在同一 deadline 內重試，不能把首次 connection refused 當作永久失敗。
- 保留 archive checksum/manifest 驗證、fresh temp root、顯式 production overwrite confirmation、production service/database isolation、prior application archive 與 recovery handoff；若保留 RESTORE_SKIP_HEALTH=1 inventory/skip 用途，必須輸出 incomplete/non-full、非零離開且不得誤稱 full verified。
- 失敗 summary 必須保留每個 phase 的結果與 fullDrill=false；可確認 cleanup 後標示 cleanup.status=ok，無法確認時標示 cleanup.status=unknown 與本次 owned temp path，不能以失敗輸出誤稱 full verified 或以通用 trimming/command substitution 改寫 health body。
- Scope boundary：apply 只修改 deploy/restore-runtime-state.sh 的 restore drill 必要區段與 scripts/deploy.test.mjs 的對應 fixtures。明確不修改 deploy/export-runtime-state.sh、deploy/raspi-bootstrap.sh、deploy/deploy.sh、deploy/configure-lightweight-desktop.sh、deploy/verify-kiosk-install.sh，以及 deploy/ 內其他未列出的檔案；也不修改 app、其他 changes、production state 或 archive data。本 propose 不修改 main specs；未來正式 closeout 的 spec sync 依 workflow。
- 本案必須先於 harden-onekey-deploy-secret-transport apply；後案回讀本案對 scripts/deploy.test.mjs 的最新變更並以增量方式加入測試，不覆蓋本案內容。

## Success Criteria

- 正向 fixture 具有 SQLite、migrate.js 與 server.js 時，full drill 依序回報 integrity、migrations、health 三個 required phase，並輸出可解析的 JSON summary：status=ok、mode=full-drill、fullDrill=true。
- migration override 在 exit 0 且 stdout 為空時可使 migrations phase 成功，不要求 module 有 OS executable bit；health override 必須在預設 20 秒或設定的 shared deadline 與 65536-byte body limit 內產生有效 JSON 或 exact plain body，不能只以 exit 0 成功。
- 缺少 migration entrypoint、缺少 database、沒有 health override 且缺少 server.js、invalid health body、timeout、skip health 或 process failure 都非零且不輸出 full-drill verified 訊息。
- 有效 health override 可在缺少 server.js 時通過；invalid override 不 fallback。health body 必須在 65536-byte 上限與 shared deadline 內通過 strict parser。
- health body 僅接受無結尾、單一 LF 或單一 CRLF 的 exact plain ok；多重換行與額外空白均失敗。
- 延遲啟動後成功的 localhost fixture 可通過；timeout 或失敗會終止本次啟動的 server/override process group，不能留下 owned child 繼續持有暫存資料。可控制 cleanup 的額外上限為 2 秒，超過或無法確認則回報 unknown，不列入 health success。
- scripts/deploy.test.mjs 規劃涵蓋上述 positive/negative fixtures，並保留 archive verification、overwrite confirmation、temp isolation 與 production marker 證據；本 proposal 階段不執行 runtime tests、真實 restore 或 production acceptance。

## Capabilities

### New Capabilities

- （無）

### Modified Capabilities

- runtime-backup-and-restore：收緊 restore drill 的 required phase、健康回應判定、skip/unavailable 語意與成功輸出契約。

## Impact

- Affected specs: openspec/specs/runtime-backup-and-restore/spec.md（以本 change 的 delta spec 修改需求）
- Affected code:
  - Modified: deploy/restore-runtime-state.sh
  - Modified: scripts/deploy.test.mjs
- Affected workflow: 後續 apply 須先完成本案，再由 secrets change 讀取最新共享測試檔。
- Excluded deployment paths: deploy/export-runtime-state.sh、deploy/raspi-bootstrap.sh、deploy/deploy.sh、deploy/configure-lightweight-desktop.sh、deploy/verify-kiosk-install.sh，以及 deploy/ 內除 deploy/restore-runtime-state.sh 外的全部檔案。
- Excluded scope: app、其他 changes、production state、archive data 與 scripts/deploy.test.mjs 中非本 restore drill 的測試。本 propose 不修改 main specs；未來正式 closeout 的 spec sync 依 workflow。
