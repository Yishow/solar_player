# Test Plan｜把 DataHub 整理成任務入口與一致廠區工作區

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U1-R1 | U1-R1-S01 — Task landing | UI/view-model＋browser | the three tasks and scoped health summary are visible without requiring terminology knowledge |
| U1-R1 | U1-R1-S02 — Legacy diagnostics bookmark | UI/view-model＋browser | the consolidated metrics view preserves KN and the requested metric |
| U1-R2 | U1-R2-S01 — Create under KN | UI/view-model＋browser | KN is selected and CL is not silently assigned |
| U1-R2 | U1-R2-S02 — Create under all | UI/view-model＋browser | a CL or KN choice is required before saving |
| U1-R3 | U1-R3-S01 — Shared broker under KN filter | UI/view-model＋browser | one shared broker and its system-wide impact are shown |
| U1-R3 | U1-R3-S02 — Weather scope not applicable | UI/view-model＋browser | its non-applicability is stated and no duplicate site weather configuration is fabricated |
| U1-R4 | U1-R4-S01 — Find a problematic source | UI/view-model＋browser | only matching KN sources appear with an actionable health explanation |
| U1-R4 | U1-R4-S02 — Managed adapter | UI/view-model＋browser | ownership and the reason for read-only fields are clear |
| U1-R5 | U1-R5-S01 — Save one KN source | UI/view-model＋browser | CL mappings remain byte-equivalent in editable configuration |
| U1-R5 | U1-R5-S02 — Live refresh while editing | UI/view-model＋browser | the new observation appears without replacing the edited name |
| U1-R6 | U1-R6-S01 — Keyboard drawer use | UI/view-model＋browser | focus order is logical and returns to the initiating row |
| U1-R6 | U1-R6-S02 — Smaller desktop | UI/view-model＋browser | neither required input nor save/discard action is clipped or unreachable |
| U1-M1 | U1-M1-S01 — Operator opens Data Hub | UI/view-model＋browser | it presents three task entries and direct access to the four specialist areas |
| U1-M1 | U1-M1-S02 — Legacy usage or diagnostic link | UI/view-model＋browser | Metrics opens with the original scope and metric filters preserved |
| U1-M1 | U1-M1-S03 — One shared broker | UI/view-model＋browser | the interface identifies the broker as shared infrastructure rather than claiming the change affects KN alone |
| U1-R7 | U1-R7-S01 — New site | shared＋service/API＋UI journey | a named 設定觀音用電 action is available without reading source/mapping/metric documentation |
| U1-R7 | U1-R7-S02 — All-sites entry | shared＋service/API＋UI journey | the operator explicitly chooses a site, not a silently defaulted CL profile |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。

## V3 Integration｜U1-R8

### U1-R8-S01 — KN task entry

GIVEN the active workspace is KN
WHEN the user selects add meter from received data
THEN M1/M2 opens with KN and the current approved connection without asking to copy topic strings

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。

### U1-R8-S02 — No mappings yet

GIVEN approved discovery observations exist but zero generic mappings exist
WHEN the user opens sources
THEN unmapped candidates are visible and selectable instead of an empty form demanding a metric key

需實測並保存MQTT/SQLite/API/UI證據；目前未執行。
