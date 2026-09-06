# Design｜修復用電歷史、期間 API 與可回退重算

## Context

EnergyTrend/viewModel 目前把 snapshot.consumption 加總，且各 range 均優先讀 live consumptionEnergy；MetricResolver 按 scope 讀歷史，但 day/year 的日期邊界與 month 不同。既有 daily_summary 表型別沒有完整 coverage/provenance。

## Goals / Non-Goals

**In scope**：建立 versioned consumption projections 與管理端重算流程；保留現有 endpoints 及授權，增補 periodSummary 與 quality。舊 snapshots 保持其原本 counter 語意，不偷偷改成另一種單位。

**Out of scope**：不刪原始歷史、不偽造缺失 baseline、不建立新計費服務；不更動 unrelated 發電、CO2 或電價係數；不在啟動時自動全庫破壞性重算。

## Dependencies

E1 / add-meter-reading-contracts、E2 / fix-period-consumption-deltas、E6 / add-site-energy-accounting-profiles

所有新介面都必須在 shared 型別、server 驗證、呼叫端與測試之間一致。未知現場單位、採樣頻率與既有來源身分不可靠名稱猜測。

## Decisions

### D1. 共用讀模型

建立 scope/meterSet/periodStart/periodEnd/timeZone/calculationVersion/sourceRevisionKey 的 projection；valueKwh 可 null，另存 observedDelta、quality、freshness、dataThrough、dailyCoverage 與來源 sample ids。full-period totals 由 E2 resolver 提供，只有分段可證完整時才用 daily rollup 最佳化。

### D2. API 兼容

既有 /api/metrics/daily-summary 仍受 display-client context 保護；/api/data-hub/energy-history 仍要求可信管理讀取及明確 metricScope。新增具型別的 periodSummary 與 consumption points，不刪既有 summaries/snapshots/counters。舊 cumulative snapshots 不改成 interval 值；以 metadata 寫明語意。

### D3. 管理期間

新增受驗證的 calendar period 查詢，範圍一律由 E2 解析：day/month/year/to-date 與具體年月或日期。year=當地1/1至截止，不是最近365天。global 聚合只有明確選取且無重複 contributors 時可用，不是 CL 的隱式 fallback。

### D4. 前端消費

EnergyTrend 用電卡讀所選 range 的 periodSummary，不再將 raw consumption 相加，也不以 lifetime live 值蓋掉月／年結果。EnergyHistory、匯出同口徑；累積 register 另標「電錶累積讀值」，禁止混用「本月用電」。

### D5. 歷史修復

提供先 dry-run 的重算入口，指定 scope、start/end、algorithmVersion。只由足夠的原始/可追溯累積樣本重建；缺基準標 unreconstructable。先寫 shadow revision、產生舊/新差異報告與備份，再在交易內切 active revision；可重入且不重複寫。

### D6. 保留與修訂

保留 sample identity、期初/期末基準與 reset event，現有 retention 不得清掉仍用於可查年/月報表的必要證據。晚到資料只使相關 period revision 失效重算；以 source watermark 防止舊背景結果覆蓋新結果。

### D7. 可綁定期間指標

將consumption.period.dayKwh、consumption.period.monthKwh、consumption.period.yearKwh註冊為server-owned、energy-period语意的catalog entries，cl/kn可用且inherit僅解析到授權site。透過同一E2/E3 resolver取值，不以新mock/live row填值；consumptionEnergy維持原累積register語意。新增已reviewed部門/自訂來源依有效catalog規則列可綁定目標，不承諾所有number都相容。

### D8. reader與catalog串接

EnergyTrend/History loader及API型別一併改讀periodSummary，不只改viewModel參數。server-owned period catalog entries需涵蓋所有可用runtime/preview resolver；它們不是一般的live_metric_values原始讀值。先保留舊API形狀與raw snapshots，再以明確valueSemantics提供新版結果。

## API / Data / State Contracts

History response 增補 periodSummary:{periodStart,periodEnd,timeZone,valueKwh,quality,calculatedThrough,issues,revision}，summaries 的 consumptionTotal 僅投影 eligible daily value，其品質另傳。監控更新維持 monitoring-history 事件，加上 scope/revision 協助正確失效快取。重算操作繼承管理寫入保護與 audit。

錯誤回應保留既有管理／播放權限邊界；新增錯誤提供穩定 code、可理解訊息與可定位的欄位或 item。缺資料用 null＋品質，不以空字串、NaN 或 0 掩蓋。未識別的 scope、meter、page 或 item 不自動改成 CL。

## Migration and Rollout

新增 projection -> dry-run 匯出比較 -> 使用者確認資料備份與影響 -> 指定 scope 切 active revision -> 檢查 history/Overview/部門一致。切換失敗時回到前一 revision；raw samples、legacy rows、reset events 全保留。

改動採 additive 相容策略；migration 編號與既有型別細節於 apply 對照最新 main，不能依文件預占流水號。任何重算須以副本 dry-run 和差異報告先驗證，正式資料套用另行授權。

## Risks / Trade-offs

舊 snapshots 的 consumption 是否可當真實電錶樣本，必須驗證採集版本與 timestamp，不能因欄位名稱相同就回填。若沒有期初紀錄，不能宣称「歷史已全部修復」。

## Verification Strategy

同目錄 test-plan 是 requirement-to-scenario 驗證對照；具體觀測條件以 specs 的 WHEN / THEN 為準。先寫失敗測試，再實作，再跑 regression。不得只修改 test expectation 讓既有錯誤數字通過。

## Source of Progress and Closeout

只有同目錄 tasks.md 的 checkbox 表示本 change 的實作進度。本包全部未勾選；格式檢查或公式 fixture 通過不代表應用程式測試通過。待實作後保存實際命令輸出、review findings 與必要 FHD witness；使用者驗收及 archive/commit 規則依 repo 現行 workflow。

## V2 Site-Setup Contract

The period/history API SHALL resolve the E6 profile siteTotal for site-level consumption and preserve profile revision/effective-time attribution. Department-sum or a custom comparison denominator SHALL NOT overwrite site totals. Closed-history remapping SHALL require the existing explicit dry-run and activation process.

規劃中的來源定義唯一放在E6 profile；操作入口由U6承接。詳見 `add-site-energy-accounting-profiles` 與 `add-guided-site-energy-setup` change。新增需求：E3-R8。
