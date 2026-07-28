## Context

永續主指標透過 `resolveSustainabilityFactoryScope` 評估已啟用展示廠區的 factory summary；中壢模式讀取 `factoryGeneration.cl.totalMwh`，並以來源 payload timestamp 判斷 freshness。家庭等效服務獨立讀取 `cumulative_counters.generation`，所以不會隨永續主指標的廠區 scope 改變。月用量曲線則由 metrics history 與 daily summary 的兩條資料管線提供，必須先檢查其資料語意再決定是否修改。

## Goals / Non-Goals

**Goals:**

- 累積家庭等效卡與永續累積發電主指標使用同一個廠區 scope、數值、timestamp 和 stale 判定。
- 中壢單廠啟用且 summary fresh 時，以 `total_mwh × 1,000 ÷ householdDailyUsageKwh` 計算戶數。
- 以實際 API response、資料表資料與 view model 檢查月用量曲線的月份範圍、資料來源與單位；僅在發現可重現的錯誤時修正。

**Non-Goals:**

- 不改今日家庭等效卡的自發自用量／今日發電 fallback 規則。
- 不改家庭用電基準、費率或展示文案。
- 不將日曲線的即時功率曲線重構為月度電量曲線，除非現有月曲線實測證實其混用單位。

## Decisions

### Reuse the sustainability factory-scope evaluation

家庭等效服務將使用既有 factory generation evaluation，而不是複製 SQL 或回寫全站 cumulative counter。這讓中壢、觀音與雙廠 scope 保持同一個資料契約。替代方案是同步 `cumulative_counters.generation`；此方案會污染全站歷史計數器，且無法保留單廠選擇語意。

### Treat stale factory summaries as unavailable household basis

當中壢 summary 的 timestamp 過期、三個欄位 timestamp 不一致或數值無效時，累積家庭等效卡 SHALL 顯示 unavailable，而非回退到舊的全站累積計數器。替代方案會再次產生主指標與家庭卡不一致。

### Audit the monthly curve before changing it

月用量曲線的檢查將比較 `/api/metrics/daily-summary?range=month` 的日彙總電量、`/api/metrics/history?range=month` 的 snapshot 序列，以及 EnergyTrend view model 的單位。只有可重現的月初邊界、單位混用或排序錯誤才進入程式修正；否則將以測試和實機證據結案。

## Implementation Contract

- **Behavior:** 中壢展示廠區啟用且 `solar/CL/summary` 三個 metric 都是 fresh 時，永續累積家庭等效卡的戶數 SHALL 由中壢 `total_mwh` 換算；例如 `45,678 MWh` 與每日 `13 kWh` 基準得到 `3,513,692` 戶4口之家的一日用電量。
- **Interface / data shape:** `/api/sustainability-story` 的 `householdEquivalents.cumulative` SHALL 回傳上述戶數、`cumulative-generation` provenance 與中壢 MQTT timestamp；無有效 summary 時回傳 unavailable card。
- **Failure modes:** stale、missing、invalid 與 regression 的 factory evaluation SHALL 不讀取舊 `cumulative_counters.generation` 作為 fallback。
- **Acceptance criteria:** household equivalence service test 覆蓋中壢 fresh、stale 和今天卡未變；月曲線審查以 route/view-model tests 加上實際 API 資料證明月份邊界與 unit。
- **Scope boundaries:** 只改永續累積家庭卡的來源與必要的月曲線錯誤；不修改 MQTT mapping、計算設定 schema 或播放頁外觀。

## Risks / Trade-offs

- [MQTT summary 停止發布時家庭卡變為 `--`] → 此行為與永續主指標一致，並透過 provenance 顯示 stale 狀態。
- [月曲線歷史資料不足而無法判讀趨勢] → 回報資料不足，不以合成資料掩蓋問題。
