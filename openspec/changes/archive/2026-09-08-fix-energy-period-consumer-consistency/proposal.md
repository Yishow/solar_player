## Why

2026-09-08 review 發現同一批電錶資料在不同消費端會被用不同口徑解讀：部門占比跳過設定生效日、指定的分母電錶未被計算、歷史 API 忽略查詢範圍，日覆蓋率也可能把不能合法計算的日期算成完整。這會讓畫面上的總量、占比與歷史資料彼此矛盾。

## What Changes

- R5：部門分子及分母共用有效日期與設定版本的期間解析；跨設定邊界不能直接套最新設定宣稱精確。
- R6：納入僅用於自訂比較基準的電錶，不偷偷改回總錶或部門合計。
- R7：daily-summary API 保留請求的 day/week/month/year/total 範圍與其他能源欄位，不一律重建為本月份日期。
- R8：每日覆蓋率只計入截至 asOf、來源連續且可合法計算的日期；保持月總量已知與每日分配不足可以同時成立。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `department-energy-shares`：補強有效期間設定、自訂分母完整載入與品質傳遞。
- `consumption-history-projections`：補強歷史查詢範圍不被月曲線覆寫的相容契約。
- `period-consumption-deltas`：補強日覆蓋率的時間截止、來源連續性與穩定排序。

## Impact

涉及 `departmentSharesService.ts`、`periodConsumptionService.ts`、`routes/metrics-history.ts`、shared 的 `departmentEnergyShares.ts` 與 `periodConsumption.ts`，以及必要的 web 品質顯示與測試。沿用 E6 作為歸屬與日曆唯一權威，E1 保存原始來源與樣本；不建立第二套公式或頁面專用設定。

## Review Baseline and Evidence

包含起點 `8323c33c12464adf1b5f42670d82d4fe7ae03a7c`，review head 為 `eebfc62e5c08cb58770e060d23b471ac6420673a`。具體來源、例子及測試限制见 `docs/reviews/2026-09-08-energy-authoring-review.md` 的 R5–R8。

## Non-goals and Delivery Boundary

只起草修復。Apply 不改寫或刪除 accepted readings、不重設基準、不自動套用歷史修復、不創造跨換錶的連續性；無法計算時保留 null 和原因。跨版本期間沿用目前保守的 partial 規則，不擴張成新的比例分攤演算法。若需更新已持久化投影，必須先有有界 dry-run 差異與獨立授權；不得靠格式檢查宣稱交付完成。
