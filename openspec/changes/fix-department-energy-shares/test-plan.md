# Test Plan｜用同期間真實電量計算部門用電百分比

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| E5-R1 | E5-R1-S01 — Measured proportions | service＋API/story＋UI | the shares are 50%,30%,20%, irrespective of legacy seed percentages |
| E5-R1 | E5-R1-S02 — Mixed units | service＋API/story＋UI | that department is unavailable with an incompatible measurement diagnostic |
| E5-R2 | E5-R2-S01 — Configured main meter missing | service＋API/story＋UI | shares remain unavailable rather than switching to their sum |
| E5-R2 | E5-R2-S02 — Managed-only denominator | service＋API/story＋UI | the label states managed-department consumption share and exposes membership |
| E5-R3 | E5-R3-S01 — All departments idle | service＋API/story＋UI | the UI displays an em dash with zero-total explanation, not NaN or fabricated percentages |
| E5-R3 | E5-R3-S02 — One required department missing | service＋API/story＋UI | the group is partial/unavailable and A/B are not inflated to sum to 100 |
| E5-R4 | E5-R4-S01 — Duplicate meter | service＋API/story＋UI | publication/save is blocked with both conflicting department names |
| E5-R4 | E5-R4-S02 — Hide one card | service＋API/story＋UI | other shares and the denominator remain unchanged |
| E5-R5 | E5-R5-S01 — Unallocated amount | service＋API/story＋UI | 150 kWh is labeled other/unallocated, not automatically attributed to losses |
| E5-R5 | E5-R5-S02 — Children exceed main | service＋API/story＋UI | the inconsistency is visible and no artificial 100 percent cap hides it |
| E5-R6 | E5-R6-S01 — Change period | service＋API/story＋UI | the label and all numerator/denominator windows switch together to month |
| E5-R6 | E5-R6-S02 — Only cumulative data exists | service＋API/story＋UI | energy shares may be shown, while the instantaneous kW field remains unavailable |
| E5-R7 | E5-R7-S01 — Repeating thirds | service＋API/story＋UI | 33.3%,33.3%,33.3% is permitted and the source ratios remain exactly one third |
| E5-R7 | E5-R7-S02 — Stale department | service＋API/story＋UI | the stale/partial state is visible and the legacy 25% seed is not reintroduced |
| E5-R8 | E5-R8-S01 — One canonical edit | shared＋service/API＋UI journey | other profile-following views use that revision; the card retains its presentation period and no duplicate mapping is saved |
| E5-R8 | E5-R8-S02 — Custom meter denominator | shared＋service/API＋UI journey | it yields 25% with that comparison label and leaves the siteTotal unchanged |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
