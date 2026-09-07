# Test Plan｜資料接入導引、累積電錶設定與安全測試

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U2-R1 | U2-R1-S01 — Retry connection | server API＋UI＋browser | their source choices remain and no duplicate mapping is created |
| U2-R1 | U2-R1-S02 — Managed source selected | server API＋UI＋browser | it offers selection/diagnosis, not an editable generic replacement |
| U2-R2 | U2-R2-S01 — Cumulative example | server API＋UI＋browser | the preview explains 125 kWh observed difference, not 20125 or a full month without baseline |
| U2-R2 | U2-R2-S02 — Invalid multiplier input | server API＋UI＋browser | a field error appears and the draft is not silently changed to 1 |
| U2-R3 | U2-R3-S01 — Select sample field | server API＋UI＋browser | the path and normalized value match the ingestion parser with no persisted metric changes |
| U2-R3 | U2-R3-S02 — Unsupported expression | server API＋UI＋browser | a precise validation error is returned instead of an apparently successful client-only preview |
| U2-R4 | U2-R4-S01 — Local preview | server API＋UI＋browser | MQTT publish count remains zero |
| U2-R4 | U2-R4-S02 — Confirm real publish | server API＋UI＋browser | only the confirmed write is sent under existing authorization and the result reports that it was an actual publish |
| U2-R5 | U2-R5-S01 — Concurrent save | server API＋UI＋browser | a conflict response preserves the second draft and offers comparison/reload rather than blind overwrite |
| U2-R5 | U2-R5-S02 — Delete referenced source | server API＋UI＋browser | both dependencies are shown and unsafe deletion is blocked until explicitly resolved |
| U2-R6 | U2-R6-S01 — Continue to display | server API＋UI＋browser | the saved KN identity is available to the target picker and formal playback remains unchanged |
| U2-R6 | U2-R6-S02 — Saved without live sample | server API＋UI＋browser | the status says configured/waiting for data, not live or ready-to-publish |
| U2-R7 | U2-R7-S01 — Return to department | shared＋service/API＋UI journey | the user returns to stamping with its new source available, with no retyping of metric key or loss of other rows |
| U2-R7 | U2-R7-S02 — Unreviewed existing source | shared＋service/API＋UI journey | the existing identity is preserved and reviewed in place rather than deleted and recreated |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。

## V3 Integration｜U2-R8

### U2-R8-S01 — Known broker unknown tag

GIVEN an operator only knows they need KN cumulative energy
WHEN they start MQTT onboarding
THEN they choose from actual observations, confirm meaning and target, preview and apply without an external client

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### U2-R8-S02 — Single-field repair

GIVEN one already configured source needs a new compatible field
WHEN the user opens repair
THEN M2 retains the target and site and only presents the relevant selection and review

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
