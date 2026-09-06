# Test Plan｜修復用電歷史、期間 API 與可回退重算

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E3-R1 | E3-R1-S01 — Monthly trend ignores lifetime register | service＋SQLite＋API | the consumption card and export display 4300 kWh, not 100000 or the sum of snapshots |
| E3-R1 | E3-R1-S02 — Calendar year summary | service＋SQLite＋API | the summary uses that calendar-year window and the same resolver as month/day |
| E3-R2 | E3-R2-S01 — Display scope cannot be overridden | service＋SQLite＋API | the existing security policy rejects or ignores unauthorized override and never leaks KN data |
| E3-R2 | E3-R2-S02 — Management context | service＋SQLite＋API | KN results are returned through management authorization rather than impersonating a device |
| E3-R3 | E3-R3-S01 — Idempotent repair | service＋SQLite＋API | the active totals and row counts are identical and no duplicate consumption is created |
| E3-R3 | E3-R3-S02 — Repair interrupted | service＋SQLite＋API | the previous active revision remains readable and partial shadow output is not served |
| E3-R4 | E3-R4-S01 — No January baseline | service＋SQLite＋API | the year is listed as unreconstructable/partial and the system does not invent January usage |
| E3-R4 | E3-R4-S02 — Known endpoints but missing daily allocation | service＋SQLite＋API | the supported month total and explicit daily gaps coexist without forcing them to agree through fabricated points |
| E3-R5 | E3-R5-S01 — Late data corrects one day | service＋SQLite＋API | affected CL periods receive a new revision and KN periods do not change |
| E3-R5 | E3-R5-S02 — Stale recomputation races | service＋SQLite＋API | A cannot replace B active projection with an older watermark |
| E3-R6 | E3-R6-S01 — Restart before a broker message | service＋SQLite＋API | the prior values remain available with stale/last-known state, not fresh invented data |
| E3-R6 | E3-R6-S02 — Mock mode remains explicit | service＋SQLite＋API | no mock feed or mock consumption is substituted |
| E3-R7 | E3-R7-S01 — Bind month consumption | service＋SQLite＋API | both use KN calendar-month consumption and never the raw consumptionEnergy register |
| E3-R7 | E3-R7-S02 — Protect period identity | service＋SQLite＋API | the server rejects the ownership conflict |
| E3-M1 | E3-M1-S01 — Mock counters across dates | service＋SQLite＋API | each cumulative generation, consumption and self-consumption value is non-decreasing |
| E3-M1 | E3-M1-S02 — Current-day summary before rollover | service＋SQLite＋API | the current-day summary exposes generation 3 and consumption 1 kWh |
| E3-M1 | E3-M1-S03 — Restart extends same-day consumption | service＋SQLite＋API | the same-day total is extended from its original baseline, not replaced by a new baseline at startup |
| E3-M1 | E3-M1-S04 — MQTT restoration before a new message | service＋SQLite＋API | the saved values and monthly chart point remain readable with truthful age and quality, and no mock feed starts |
| E3-M1 | E3-M1-S05 — Incomplete history repair | service＋SQLite＋API | the full month total stays null and any observed partial delta is separately labeled |
| E3-R8 | E3-R8-S01 — Denominator changed | shared＋service/API＋UI journey | site total remains unchanged and the comparison-only change is not applied to history |
| E3-R8 | E3-R8-S02 — Profile crosses a period | shared＋service/API＋UI journey | the response includes revision boundaries and honest partial/segmented quality, rather than applying the newest membership to all historical observations |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
