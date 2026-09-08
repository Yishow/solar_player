# Test Plan｜重整展示編輯工作台、常駐工具列與情境面板

## Status

以下為待實作、待執行的驗收，不是已通過報告。合成算式或文件檢查不能替代生產程式路徑的測試。

## Requirement / Scenario Traceability

| Requirement | Scenario | 建議驗證層 | 明確完成條件 |
|---|---|---|---|
| U3-R1 | U3-R1-S01 — Save while inspecting data | UI/view-model＋browser | save is available without opening a separate left actions tab |
| U3-R1 | U3-R1-S02 — Load or save failure | UI/view-model＋browser | the error and unsaved state remain visible and editing is not discarded |
| U3-R2 | U3-R2-S01 — Select image | UI/view-model＋browser | asset and image controls are shown rather than unrelated metric fields |
| U3-R2 | U3-R2-S02 — Fixed template region | UI/view-model＋browser | the constraint is stated and no non-functional drag affordance suggests otherwise |
| U3-R3 | U3-R3-S01 — Resize inspector | UI/view-model＋browser | its stored position and size stay identical |
| U3-R3 | U3-R3-S02 — Small desktop | UI/view-model＋browser | a collapse/drawer layout leaves editing and primary actions reachable |
| U3-R4 | U3-R4-S01 — Cancel asset selection | UI/view-model＋browser | the text edit, selected item and zoom remain unchanged |
| U3-R4 | U3-R4-S02 — Apply image | UI/view-model＋browser | the card draft updates and the operator remains in the same page context |
| U3-R5 | U3-R5-S01 — Unsaved shell decoration | UI/view-model＋browser | the footer retains its separate unsaved indicator |
| U3-R5 | U3-R5-S02 — Shared scope warning | UI/view-model＋browser | the UI states that pages using the shared header are affected |
| U3-R6 | U3-R6-S01 — Switch pages | UI/view-model＋browser | A edits remain or the earlier discard was explicitly confirmed |
| U3-R6 | U3-R6-S02 — Remote revision | UI/view-model＋browser | the UI offers comparison/reload without overwriting the local draft |
| U3-R7 | U3-R7-S01 — Image task | shared＋service/API＋UI journey | the asset picker opens inline and returns to the same selection without changing workspace |
| U3-R7 | U3-R7-S02 — Energy task | shared＋service/API＋UI journey | the user reaches the shared site-and-department context without finding DataHub manually |

## Execution and Evidence

使用同一份隔離 CL/KN 電錶fixture，由真實 ingestion、profile resolver、preview、apply、history/story、editor/runtime 路徑驗證；不可只將預算數字直接塞入元件。

用可注入時鐘測試來源更新、過期、邊界與設定版本；保存實際命令、exit code、fixture ID、被驗證commit、畫面證據與未解問題。文件內所有使用者測試與程式測試均 pending。

UI驗收包含1366×768、1440×900、1920×1080、鍵盤、後退保留狀態、變更衝突、未知影響、禁止讀手冊後才測試。相關測試與pnpm verify完成後依repo workflow作人工驗收，不提前archive。
