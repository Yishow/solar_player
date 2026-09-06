# Test Plan｜四步廠區用電設定、分子分母選擇與日常任務捷徑

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U6-R1 | U6-R1-S01 — Enter from KN share card | shared＋service/API＋UI journey | the common setup opens KN and the selected department, preserving unsaved page state and return context |
| U6-R1 | U6-R1-S02 — Site is disabled for playback | shared＋service/API＋UI journey | KN accounting remains configurable without enabling its playback page |
| U6-R2 | U6-R2-S01 — Normal configuration | shared＋service/API＋UI journey | the task ends within the four-screen flow with no external manual and no required technical identifiers |
| U6-R2 | U6-R2-S02 — Go back | shared＋service/API＋UI journey | department entries remain unless an explicit incompatibility requires a named correction |
| U6-R3 | U6-R3-S01 — Distinguish power | shared＋service/API＋UI journey | the kW item cannot be selected as period energy and says 這是即時功率，不是累積用電 |
| U6-R3 | U6-R3-S02 — Similar names | shared＋service/API＋UI journey | stable distinguishing identity and source detail are available without auto-selecting either |
| U6-R4 | U6-R4-S01 — Multi-meter department | shared＋service/API＋UI journey | the row states it sums their period consumption and shows both selected names |
| U6-R4 | U6-R4-S02 — Duplicate across rows | shared＋service/API＋UI journey | the UI identifies stamping as the existing owner and prevents silently double-counting it |
| U6-R5 | U6-R5-S01 — Concrete review | shared＋service/API＋UI journey | the operator sees 200/1000=20% and 300/1000=30% with source names and current consumers |
| U6-R5 | U6-R5-S02 — Missing month baseline | shared＋service/API＋UI journey | today may show values while month states 缺少月初讀值; the UI does not ask the user to invent a baseline or imply saving recovers history |
| U6-R6 | U6-R6-S01 — Source is not yet connected | shared＋service/API＋UI journey | the source is returned to that department and other setup entries are preserved; extra onboarding is visibly additional to the standard four screens |
| U6-R6 | U6-R6-S02 — Cancel after source creation | shared＋service/API＋UI journey | the UI states that the source remains registered but the active accounting profile was not changed |
| U6-R7 | U6-R7-S01 — Change denominator only | shared＋service/API＋UI journey | only comparison selection and an impact/result review are required; no broker, site or department re-entry is requested |
| U6-R7 | U6-R7-S02 — Reuse CL department names in KN | shared＋service/API＋UI journey | names are copied while CL meter IDs and active settings are not |
| U6-R8 | U6-R8-S01 — Change an image | shared＋service/API＋UI journey | the operator previews it in context and returns to the same object without finding the asset workspace manually |
| U6-R8 | U6-R8-S02 — Fix a department percentage source | shared＋service/API＋UI journey | the site setup edits the canonical profile; the page can keep its period/style without a second denominator mapping |
| U6-R9 | U6-R9-S01 — Structurally valid but waiting | shared＋service/API＋UI journey | success says configuration saved and waiting for sufficient readings, never inventing ready day/month/year totals |
| U6-R9 | U6-R9-S02 — Conflict without data loss | shared＋service/API＋UI journey | the UI explains the conflict, preserves inputs and offers comparison/review instead of resetting the form |
| U6-R10 | U6-R10-S01 — Four-screen task study | shared＋service/API＋UI journey | the evidence records actual completion and screen transitions with no manual; failing users are not trained and then counted as first-time success |
| U6-R10 | U6-R10-S02 — Recurrence and failure study | shared＋service/API＋UI journey | CL remains untouched, the issue is resolved in-context and success is not declared until evidence is reviewed |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。

## V3 Integration｜U6-R11

### U6-R11-S01 — Department meter missing

GIVEN KN department setup cannot find its meter
WHEN the user selects add from received data and completes M2
THEN the selected department receives its eligible source reference and other draft rows remain unchanged

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### U6-R11-S02 — Batch add from profile

GIVEN MAIN and STAMP candidates are selected together
WHEN source and profile review completes
THEN roles are shown once and the user is not sent to a second topic-mapping page or a display-local denominator form

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
