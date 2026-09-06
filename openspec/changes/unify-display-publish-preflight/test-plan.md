# Test Plan｜集中草稿保存、影響檢查與安全發布

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U5-R1 | U5-R1-S01 — Dirty draft | server API＋UI＋browser | the checked version is exactly the saved draft and a separate confirmation is required |
| U5-R1 | U5-R1-S02 — Draft save fails | server API＋UI＋browser | publication does not occur and local edits remain recoverable |
| U5-R2 | U5-R2-S01 — Concurrent draft mutation | server API＋UI＋browser | the request is rejected with a recheck/conflict result and version 9 is not silently published |
| U5-R2 | U5-R2-S02 — Dependency changes | server API＋UI＋browser | the stale review is rejected; live sensor updates alone do not invalidate unrelated structural revisions |
| U5-R3 | U5-R3-S01 — Missing asset | server API＋UI＋browser | a blocking finding names the card and opens asset replacement at that item |
| U5-R3 | U5-R3-S02 — Stale data allowed by fallback | server API＋UI＋browser | the finding explains the warning and formal fallback, rather than silently passing as fresh |
| U5-R4 | U5-R4-S01 — Shared source already applied | server API＋UI＋browser | the UI does not claim the shared edit waits for page publication |
| U5-R4 | U5-R4-S02 — Unknown consumers | server API＋UI＋browser | impact is unknown and required safety review blocks instead of showing zero affected pages |
| U5-R5 | U5-R5-S01 — Online without acknowledgment | server API＋UI＋browser | the UI shows published with pending/unknown application, not applied |
| U5-R5 | U5-R5-S02 — Matching acknowledgment | server API＋UI＋browser | only that device is marked applied with acknowledgment time |
| U5-R6 | U5-R6-S01 — Publication failure | server API＋UI＋browser | version 11 remains active and the draft is not lost |
| U5-R6 | U5-R6-S02 — Double click | server API＋UI＋browser | one logical publication occurs and the responses identify the same published version |
| U5-R7 | U5-R7-S01 — Profile changes before page publish | shared＋service/API＋UI journey | both show the actual shared-data effect; page publication remains a distinct confirmation |
| U5-R7 | U5-R7-S02 — Custom pinned binding | shared＋service/API＋UI journey | the exception is identified with an explicit migration action, not silently overwritten |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
