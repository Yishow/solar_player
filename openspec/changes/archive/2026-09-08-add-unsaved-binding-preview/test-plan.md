# Test Plan｜未儲存綁定即時預覽、資料挑選與來源到展示接續

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U4-R1 | U4-R1-S01 — Unsaved binding change | server API＋UI＋browser | B is previewed while saved draft, live page, history and publish counts remain unchanged |
| U4-R1 | U4-R1-S02 — Unsupported metric semantics | server API＋UI＋browser | the server rejects the incompatible binding with the stable item identity |
| U4-R2 | U4-R2-S01 — Oversized request | server API＋UI＋browser | the server rejects it without compiling or persisting it |
| U4-R2 | U4-R2-S02 — Unauthorized preview | server API＋UI＋browser | authorization rejects the request without leaking data |
| U4-R3 | U4-R3-S01 — Out of order results | server API＋UI＋browser | only B is applied to the current card |
| U4-R3 | U4-R3-S02 — Network error | server API＋UI＋browser | the unsaved change remains and the UI shows retry rather than reverting to the saved binding |
| U4-R4 | U4-R4-S01 — Fixed CL binding | server API＋UI＋browser | the card remains CL and explains its fixed scope |
| U4-R4 | U4-R4-S02 — Inherited binding | server API＋UI＋browser | KN is previewed without saving any binding or device setting |
| U4-R5 | U4-R5-S01 — Waiting for baseline | server API＋UI＋browser | its missing-baseline status is visible and the register is not shown as the month result |
| U4-R5 | U4-R5-S02 — Catalog pending | server API＋UI＋browser | a precise catalog/compatibility explanation appears rather than an invalid saved binding |
| U4-R6 | U4-R6-S01 — Choose target | server API＋UI＋browser | that card draft uses the KN identity; published pages remain unchanged |
| U4-R6 | U4-R6-S02 — Cancel handoff | server API＋UI＋browser | the original scope/filter/selection is restored without adding a binding |
| U4-R7 | U4-R7-S01 — Unpublished edit | server API＋UI＋browser | each view names its stage and formal A is not represented as already changed |
| U4-R7 | U4-R7-S02 — Sample-only source | server API＋UI＋browser | sample-only/waiting-data is explicit and no measured value is fabricated |
| U4-R8 | U4-R8-S01 — Page draft stays intact | shared＋service/API＋UI journey | the page draft and selected item remain, and the chosen preview revision is shown |
| U4-R8 | U4-R8-S02 — No second denominator | shared＋service/API＋UI journey | it saves the period/profile reference, not a copied set of site meter IDs |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
