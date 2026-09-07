# Test Plan｜建立每廠區總用電、部門來源與占比基準設定

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E6-R1 | E6-R1-S01 — Independent choices | shared＋service/API＋UI journey | CL profile revision, membership and displayed totals are unchanged |
| E6-R1 | E6-R1-S02 — Filter is not ownership | shared＋service/API＋UI journey | a concrete site is selected before any mapping can be applied |
| E6-R1 | E6-R1-S03 — Accounting reassignment preserves source state | shared＋service/API＋SQLite | moving a channel between department and siteTotal creates only an E6 profile revision; E1 source revision, epoch, accepted observations and baseline remain unchanged |
| E6-R2 | E6-R2-S01 — Two parallel main meters | shared＋service/API＋UI journey | site total is 1000 kWh and original register magnitudes are not added as period consumption |
| E6-R2 | E6-R2-S02 — No main meter | shared＋service/API＋UI journey | department shares can be configured while overview whole-site consumption stays unavailable with a configure-source action |
| E6-R3 | E6-R3-S01 — Department has two meters | shared＋service/API＋UI journey | stamping consumption is 300 kWh with traceable members |
| E6-R3 | E6-R3-S02 — Rename and hide | shared＋service/API＋UI journey | accounting membership and denominator do not change |
| E6-R4 | E6-R4-S01 — Comparison scope is independent | shared＋service/API＋UI journey | stamping displays 25% with a production-scope label while overview site total remains 1000 kWh |
| E6-R4 | E6-R4-S02 — Explicit department sum | shared＋service/API＋UI journey | shares are 40% and 60%, labeled managed-department share rather than whole-site |
| E6-R5 | E6-R5-S01 — Parent denominator and child numerator | shared＋service/API＋UI journey | the configuration is eligible, while selecting both in the same total sum is rejected |
| E6-R5 | E6-R5-S02 — Wrong kind or site | shared＋service/API＋UI journey | field-level errors reject those references rather than coercing site or unit |
| E6-R5 | E6-R5-S03 — PV changes accounting boundary | shared＋service/API＋UI journey | validation requests a matching reviewed consumption source or a correctly bounded alternative; utility imports are not declared total consumption |
| E6-R5 | E6-R5-S04 — Undocumented overlap | shared＋service/API＋UI journey | the UI asks a plain-language non-overlap confirmation and records its provenance; it does not claim automatic topology discovery |
| E6-R6 | E6-R6-S01 — Read-only review | shared＋service/API＋UI journey | no active profile, telemetry, MQTT message, page draft or historical row is modified |
| E6-R6 | E6-R6-S02 — Concurrent revision | shared＋service/API＋UI journey | the system returns a version conflict, preserves inputs and requires a refreshed preview |
| E6-R6 | E6-R6-S03 — No half-applied setup | shared＋service/API＋UI journey | neither part replaces the active profile |
| E6-R7 | E6-R7-S01 — Change meter in midmonth | shared＋service/API＋UI journey | August remains attributed to its old revision; September is marked partial or segmented unless an explicitly approved reconstruction is available |
| E6-R7 | E6-R7-S02 — Rollback does not rewrite samples | shared＋service/API＋UI journey | raw samples and historical revisions are preserved and a new activation event is recorded |
| E6-R8 | E6-R8-S01 — One correction reaches all followers | shared＋service/API＋UI journey | both resolve the same new revision without separately editing MQTT or page formulas |
| E6-R8 | E6-R8-S02 — Custom page is not silently overwritten | shared＋service/API＋UI journey | impact preview identifies the exception and offers an explicit separate migration action rather than rewriting the page |
| E6-R9 | E6-R9-S01 — Only one sample | shared＋service/API＋UI journey | the source can be configured but day/month/year readiness states honestly show missing baselines, not zero consumption |
| E6-R9 | E6-R9-S02 — Denominator missing | shared＋service/API＋UI journey | the denominator control is identified as needing selection; applying the incomplete structure is blocked |
| E6-R11 | E6-R11-S01 — UTC source reaches Asia/Taipei month boundary | ingestion fixture＋shared＋service/API＋SQLite | E1 normalized `2026-08-31T16:00:00Z` is resolved at the Asia/Taipei September boundary |
| E6-R11 | E6-R11-S02 — Calendar override or unknown profile revision is rejected | service/API | timezone/start/end override and unknown profile revision return stable errors with no result or persistence |
| E6-R11 | E6-R11-S03 — Time zone change creates a revision | service/API＋SQLite | changing siteTimeZone creates a new profile revision, keeps closed history on the old revision, labels open periods crossing the timezone change as partial/segmented or unavailable, and leaves source revision/epoch/baseline unchanged |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。fixture 必須同時帶 E1 source revision/epoch/baseline、E6 profile revision/siteTimeZone 與 normalized source instant，確認 accounting 重選不會重設來源狀態。

用可注入時鐘測試來源更新、過期、UTC source／Asia/Taipei profile 邊界、timezone/start/end override、unknown profile revision 與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。

## V3 Integration｜E6-R10

### E6-R10-S01 — Sources and profile reviewed together

GIVEN M2 source drafts and KN profile selections pass preview
WHEN the operator confirms the combined apply
THEN all reviewed references become valid together or no configuration changes are committed

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### E6-R10-S02 — Observation without role confirmation

GIVEN a candidate is named MAIN by its publisher
WHEN it appears in M1
THEN the profile does not automatically adopt it as site total or share denominator

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
