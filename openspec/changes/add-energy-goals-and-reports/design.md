## Context

現有 metric snapshots適合短期趨勢，daily_energy_summaries適合較長 period aggregate；兩者 retention不同。Report需要明確選擇來源與 coverage，不能把缺日當零。Goals則是低頻設定，可獨立持久化。

## Goals / Non-Goals

**Goals:**

- 同一 report model支援 UI與CSV，避免兩套算式。
- daily/weekly/monthly period邊界與 current partial progress可重現。
- comparison公平：current partial period優先比較上一 period相同 elapsed window。
- goals有明確 unit/period/metric與 operator-readable progress。

**Non-Goals:**

- 不取代原始 Energy History查詢。
- 不做預測模型；可顯示 gap但不宣稱未來一定達標。

## Decisions

### Report aggregate 優先使用 daily summaries

日報可由該日 summary + peak欄位組成；週/月報 aggregate daily rows。Current day尚未完成時使用 current persisted summary。若需要短時間 peak或 coverage補充，可讀 snapshots，但不重算一套互相矛盾的 totals。

### Coverage 是 report 的一等欄位

回傳 expectedDays/observedDays、first/last source timestamp、complete/partial/insufficient state。缺日不當 0。Comparison只在 coverage可比較時給 percentage；否則顯示 unavailable/partial reason。

### Current period 比上一期同進度

例如 8/11 上午看月報，primary comparison使用 7/1～7/11相同 local cutoff，而不是完整 7 月。UI可另外顯示上一完整月，但標籤必須清楚。

### Goals 是 versioned low-frequency settings

`energy_goals` 以 metric、period、target value、comparison operator（at-least/at-most）、enabled、effective dates保存。第一版 management UI提供 monthly generation、self-consumption ratio、consumption ceiling presets。Evaluation由 report result衍生，actual不存在時狀態 `unavailable`。

### CSV 從 report DTO 序列化

CSV endpoint/下載完全使用同一 report response model，不另寫 SQL/算式；時間與數字使用 machine-readable欄位，UTF-8 with BOM可提升中文 Excel相容性。

## Implementation Contract

- partial month不直接用完整 previous month當 primary percentage比較。
- missing day不被當作 0 kWh；coverage不足時 comparison/goal evaluation明確降級。
- CSV totals與畫面同一 report id/revision完全一致。
- consumption ceiling使用 `actual <= target`，generation/self-consumption targets使用 `actual >= target`。
- goal mutation受 management auth與 validation保護，並可被 settings audit change接入。

## Migration Plan

只新增 goals table/index；reports無資料 migration。部署前先完成 day-boundary bug修正。既有 history不足一個完整 period時仍可產生 partial report，但 coverage會標示不足。

## Risks / Trade-offs

- [Risk] long-period query逐日聚合仍慢 → daily summary index/date range足以支撐；避免掃 minute snapshots做月報。
- [Risk] 使用者誤讀 partial comparison → UI固定顯示「截至目前」與 comparison window日期。
- [Risk] 目標單位混淆 → goal schema固定 canonical units，UI只在顯示層轉換。
