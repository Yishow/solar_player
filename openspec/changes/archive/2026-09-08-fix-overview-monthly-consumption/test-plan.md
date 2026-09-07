# Test Plan｜修復首頁月用量曲線與顯示狀態

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E4-R1 | E4-R1-S01 — Correct September values | UI/view-model＋browser | only CL September daily consumption is plotted, including the valid zero |
| E4-R1 | E4-R1-S02 — No authorized preview context | UI/view-model＋browser | an actionable context state appears; the server authorization guard is not bypassed |
| E4-R2 | E4-R2-S01 — Out of order and gap | UI/view-model＋browser | dates are chronological and no line bridges September 1 to September 3 across the missing day |
| E4-R2 | E4-R2-S02 — Single zero and invalid numbers | UI/view-model＋browser | the valid zero has a visible marker; non-finite entries never reach SVG geometry |
| E4-R3 | E4-R3-S01 — Scope race | UI/view-model＋browser | the chart remains KN and the CL response is discarded |
| E4-R3 | E4-R3-S02 — Refresh failure with last good data | UI/view-model＋browser | the UI either shows an explicit error or keeps clearly stale last-good data, never labels it fresh |
| E4-R4 | E4-R4-S01 — Publish geometry | UI/view-model＋browser | runtime matches the saved geometry and visibility |
| E4-R4 | E4-R4-S02 — Legacy configuration | UI/view-model＋browser | the monthly widget renders without discarding that configuration |
| E4-R5 | E4-R5-S01 — Consumption is energy | UI/view-model＋browser | the unit is kWh, not NT$ and not an assumed cost |
| E4-R5 | E4-R5-S02 — Review discovers a monetary card | UI/view-model＋browser | that additional component is recorded for a separately scoped change rather than claimed fixed by this one |
| E4-M1 | E4-M1-S01 — Default Overview widgets | UI/view-model＋browser | the weather card, monthly consumption curve and generation trend remain available alongside the hero and KPI cards |
| E4-M1 | E4-M1-S02 — Saved widget configuration | UI/view-model＋browser | the runtime uses the same configuration without a renamed or orphaned widget identity |
| E4-M2 | E4-M2-S01 — Daily values in the current month | UI/view-model＋browser | the series is [3100,3200,2900,3300,3400] |
| E4-M2 | E4-M2-S02 — Valid zero and missing date | UI/view-model＋browser | September 1 remains a real zero and the line does not bridge the missing September 2 interval |
| E4-M2 | E4-M2-S03 — Current-day refresh | UI/view-model＋browser | the widget fetches KN history again and displays the new current-day value |
| E4-M2 | E4-M2-S04 — Unauthorized management preview | UI/view-model＋browser | it reads KN through the management history contract without removing playback authentication |
| E4-M2 | E4-M2-S05 — No valid consumption data | UI/view-model＋browser | it displays the specific error or empty/baseline message without a fabricated chart |
| E4-R6 | E4-R6-S01 — Set KN chart source | shared＋service/API＋UI journey | the common site setup opens KN; applying valid configuration refreshes the original widget without requiring duplicate formula setup |
| E4-R6 | E4-R6-S02 — Custom share basis | shared＋service/API＋UI journey | the chart still represents the separately configured site total and its correct label |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
