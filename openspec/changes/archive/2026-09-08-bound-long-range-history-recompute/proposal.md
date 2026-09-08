## Why

`resolveDailyConsumptionPoints` 對每個日期各跑一次共用的期間計算，而 `evaluatePeriod` 每次都會對整份已接受樣本做三輪全掃描（`series` 過濾、`identitySeries` 過濾、`contributing` 過濾）。成本因此是 O(日期數 × 樣本數)，且發生在請求執行緒上。

`fix-energy-history-range-projections` 已把樣本索引 memo 化，實測 365 天 × 8,760 筆樣本從 3,454 ms 降到 1,160 ms，但剩餘成本仍隨兩者相乘成長。每小時讀值累積三年（約 26,000 筆）配上 `range=total` 的日期集合，單一管理端請求會進入數十秒等級並阻塞 event loop。該 change 的 design 明文把架構性改造排除在外，因此留給本 change。

## What Changes

- 讓一次多日期的日用電計算對樣本集合的掃描次數與日期數脫鉤：以已排序索引的邊界查找取代每個日期的全陣列過濾，不改變任何可採納性、品質或邊界判定規則。
- 為長範圍請求建立可測量的結構性上界，讓回歸能以「掃描次數」而非牆鐘時間驗證，避免測試因機器速度而不穩。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `consumption-history-projections`：長範圍歷史請求的計算量不得隨樣本量與日期數相乘成長。

## Impact

預期影響 `packages/shared/src/periodConsumption.ts` 的 `evaluatePeriod` 與其索引輔助函式，以及 `apps/server/src/services/periodConsumptionService.ts` 的日投影入口與相關測試。不改 route、response envelope、資料庫 schema 或部署。

## Evidence and Review Boundary

來自 2026-09-08 `/code-review` 對 `fix-energy-history-range-projections` 的效能發現，並以實測基準確認：365 個日期下，樣本 365／2,000／8,760 筆分別為 53／256／1,160 ms（memo 化之後），呈線性相乘關係。尚未量測正式環境資料量，也未宣稱已知的使用者可見逾時。

## Non-Goals

不新增快取層、不新增資料表或投影種類、不改變任何數值結果或品質判定、不調整 E6 邊界規則、不重寫時區解析、不處理與此無關的效能議題。

## Delivery Boundary

本輪只規劃。實作必須先建立能證明掃描次數與日期數脫鉤的失敗測試，再改動計算核心；`evaluatePeriod` 是整個能源計算的正確性核心，任何改動都必須維持既有測試全綠，且交付需 `pnpm verify` 與跨年、跨月、rollover、來源替換等既有案例的實際輸出。
