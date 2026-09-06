# Test Plan｜整合用電正確性、資料接入、展示發布與回退驗收

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| Q1-R1 | Q1-R1-S01 — End to end consumption | cross-layer integration＋browser＋human witness | year=8300, month=4300, day=300 consistently wherever each period is shown |
| Q1-R1 | Q1-R1-S02 — Department end to end | cross-layer integration＋browser＋human witness | 50/30/20 percent appears with matching period and denominator metadata |
| Q1-R2 | Q1-R2-S01 — KN full journey | cross-layer integration＋browser＋human witness | only intended KN bindings change and CL configuration/history are unchanged |
| Q1-R2 | Q1-R2-S02 — No device proof | cross-layer integration＋browser＋human witness | it never displays device-applied |
| Q1-R3 | Q1-R3-S01 — Missing year evidence | cross-layer integration＋browser＋human witness | each relevant surface carries the same unavailable/partial explanation |
| Q1-R3 | Q1-R3-S02 — Interrupted repair and conflict | cross-layer integration＋browser＋human witness | the prior live/projection revision remains and local drafts are preserved |
| Q1-R4 | Q1-R4-S01 — Automated tests pass only | cross-layer integration＋browser＋human witness | visual/human acceptance remains pending and the change is not declared launch-ready |
| Q1-R4 | Q1-R4-S02 — Operator task check | cross-layer integration＋browser＋human witness | the evidence includes observed completion, required assistance, wrong-scope errors and page switching counts rather than an unsupported usability claim |
| Q1-R5 | Q1-R5-S01 — Rollback rehearsal | cross-layer integration＋browser＋human witness | the prior revision is restored and original samples/checksums remain unchanged |
| Q1-R5 | Q1-R5-S02 — Unavailable tool | cross-layer integration＋browser＋human witness | the corresponding check is marked not run, never passed by assumption |
| Q1-R6 | Q1-R6-S01 — UI-driven meter assignment | shared＋service/API＋UI journey | the saved profile, history API, overview and circuit shares reconcile, while CL is unchanged |
| Q1-R6 | Q1-R6-S02 — No training substitution | shared＋service/API＋UI journey | that critical task remains failed; reading a manual or receiving instructions afterward cannot be counted as first-time unassisted success |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。

## V3 Integration｜Q1-R7

### Q1-R7-S01 — From packets to percentages

GIVEN synthetic baselines and subsequent MAIN/STAMP tag packets are supplied by a test harness
WHEN an uncoached operator performs setup through the product UI
THEN the accepted meters remain distinct and same-period usage/share results match the reviewed fixtures across API and screens

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### Q1-R7-S02 — Side-effect and cleanup regression

GIVEN capture, preview, failed apply, reconnect and cancellation are exercised
WHEN integration evidence is collected
THEN no mock value enters live energy history, production subscriptions survive, legacy edits preserve selectors and duplicate applies create no extra sources

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
