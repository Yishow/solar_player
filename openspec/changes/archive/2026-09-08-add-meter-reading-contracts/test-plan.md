# Test Plan｜建立電錶累積讀值與量測語意契約

## Status

以下是必須建立並執行的測試，不是已通過報告。本包 review 中的公式檢查只檢查合成數值與提案結構，不替代這些測試。

## Proposed Test Locations

- `apps/server/src/services/meterReadingService.test.ts`（受影響的既有檔或規劃新增測試檔，apply 時確認）。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E1-R1 | E1-R1-S01 — Separate power from energy | service＋SQLite＋API | only the main meter enters consumption-counter processing; the inverter is not summed into consumption |
| E1-R1 | E1-R1-S02 — Unknown legacy mapping | service＋SQLite＋API | the original setting is preserved, its status is needs-review, and period calculation cannot use it |
| E1-R1 | E1-R1-S03 — Accounting assignment does not redefine a source | source/profile service＋SQLite | E6 重選只改 profile revision；E1 source revision/epoch/baseline 不變，沒有第二份 accounting 設定 |
| E1-R1 | E1-R1-S04 — Reject accounting fields on a source | source API＋SQLite | meterRole/departmentId 回欄位錯誤且零寫入 |
| E1-R2 | E1-R2-S01 — Repeated retained payload | service＋SQLite＋API | one accepted observation remains and no energy increase is invented |
| E1-R2 | E1-R2-S02 — Timestamp collision | service＋SQLite＋API | the second is retained as a conflict diagnostic and does not replace the accepted value |
| E1-R2 | E1-R2-S03 — Timestamp-free retained replay after restart | isolated broker＋production callback/extractor＋SQLite＋clock | 重啟後 10000 kWh 無 timestamp retained 重送十次（包含 dup=false）皆隔離；原 10100 accepted rows/live/baseline/epoch/lastAcceptedAt 不變，freshness 不刷新，事件及 discontinuity 計數不增加 |
| E1-R3 | E1-R3-S01 — Wh normalization | service＋SQLite＋API | the normalized values are 10000 and 10125 kWh, allowing a later 125 kWh delta |
| E1-R3 | E1-R3-S02 — Large exact register | service＋SQLite＋API | the difference remains exactly 0.125 kWh without conversion through an unsafe JavaScript number |
| E1-R4 | E1-R4-S01 — Replace physical meter | service＋SQLite＋API | a new epoch starts at 15; the service neither creates a negative delta nor credits 15 as observed interval consumption |
| E1-R4 | E1-R4-S02 — Edit display name only | service＋SQLite＋API | physical identity and the counter baseline remain unchanged |
| E1-R5 | E1-R5-S01 — Same key across sites | service＋SQLite＋API | their source revisions, samples and live values remain isolated |
| E1-R5 | E1-R5-S02 — Timestamp missing | service＋SQLite＋API | 只允許 sourceRevision timestampPolicy=allow-receive-time-estimate、production retain=false/dup=false、qos=0/1/2 fallback；sourceTimestamp=null 且 estimated，不能當 exact boundary；dup=true 對照重送回 DUPLICATE_SOURCE_TIME_UNKNOWN、不新增 accepted |
| E1-R5 | E1-R5-S03 — Source timezone differs from calendar timezone | timestamp parser＋E2/E6 integration | UTC 的無 offset 2026-08-31T16:00:00 與帶 +08:00 的 2026-09-01T00:00:00 都解析成 2026-08-31T16:00:00Z，由 Asia/Taipei profile 歸入九月邊界 |
| E1-R5 | E1-R5-S04 — Unresolvable source timestamp is not receive-time fallback | parser＋SQLite | 非 retained packet 的無來源時區、DST 歧義與非法時間回 SOURCE_TIMESTAMP_INVALID；retained 對照組以 RETAINED_SOURCE_TIME_UNKNOWN 為主原因並附解析診斷；不以 profile/OS/receivedAt 代替，不改 accepted/baseline/freshness |
| E1-R5 | E1-R5-S05 — Missing packet evidence cannot enable fallback | callback/extractor＋service＋SQLite | 缺 retain/dup/qos 且無 timestamp 回 TRANSPORT_EVIDENCE_MISSING；不默認 retain=false，不刷新 baseline/freshness |
| E1-R5 | E1-R5-S06 — Unapproved receive-time fallback is rejected | source policy＋service＋SQLite | 預設 source-required 時無 timestamp 回 SOURCE_TIMESTAMP_REQUIRED；payload 不能開啟 fallback，domain state 不變 |
| E1-R6 | E1-R6-S01 — Generation key shares prefix | service＋SQLite＋API | the generation metric is excluded despite its factory prefix |
| E1-R6 | E1-R6-S02 — Only energy counter exists | service＋SQLite＋API | the instantaneous field is unavailable rather than showing the cumulative kWh number |

## Execution and Evidence

1. 在隔離的測試資料庫與可注入 clock 下先使指定情境失敗，再完成實作；用生產路徑 ingest/resolver/API 驗證，不直接注入 UI state 冒充整合。
2. 依 repo 現行 package scripts 跑受影響 server/web 測試並保存實際输出，最後執行 pnpm verify。
3. 有 UI 變更時另外驗證 keyboard、1366×768、1440×900、1920×1080；牽涉 playback/editor 時依 repo FHD 流程產生 fresh evidence。
4. 實作完成後把實際結果放入本 change 的驗證紀錄；缺工具、樣本或人工驗收明確標示 not run / pending，不提前 archive。

## Evidence Record Fields

Run identifier; reviewed commit; command; exit code; test/fixture identifier; actual result; screenshot/gap-note path when relevant; unresolved findings; human acceptance status.

## V3 Integration｜E1-R7

### E1-R7-S01 — Preview evidence is not ingestion

GIVEN M1 captured a candidate before its source was activated
WHEN M2 creates a reviewed binding
THEN E1 waits for the production ingestion path and does not replay the candidate as a new meter reading

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### E1-R7-S02 — Wrong-tag packet

GIVEN M2 rejects a packet for another tag
WHEN the meter ingestion service is called for accepted results
THEN that meter receives no observation, timestamp refresh or baseline change

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
