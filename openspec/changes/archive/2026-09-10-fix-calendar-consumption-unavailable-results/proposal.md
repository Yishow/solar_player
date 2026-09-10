## Problem

P1／Bug Fix。已設定站點帳務 profile 的日、月、年消耗計算或 projection 讀取失敗時，tryResolvePersistedPeriodConsumption 會回傳 null，與「沒有設定 profile」混為一談。EnergyHistory 在缺少 periodSummary 時容許 legacy 相容路徑；此提案修復失敗訊號流失，不宣稱每次失敗必然顯示錯誤數字。

## Root Cause

日曆期間分支的 catch 無條件回 null；week／total 的對應錯誤分支則保留 quality=unavailable、valueKwh=null 與診斷。呼叫端因而無法一致區分設定缺席、有效零值與計算失敗。

## Proposed Solution

已確認存在 profile 後，日曆計算與 projection 讀取錯誤回傳帶安全診斷的 canonical unavailable 結果。保留明確 global／no-profile 相容路徑，並以 service、API、EnergyHistory／EnergyTrend 的負面案例驗證 unavailable 不被 legacy sentinel 或零取代。catch 不再查詢故障中的資料庫。

## Success Criteria

- day、month、year 的注入計算與 projection 讀取錯誤皆產生非 null 的 unavailable 結果，且不洩露 SQL、堆疊或原始錯誤訊息。
- week／total 既有 unavailable 行為、確實量測的零值、正常數值和 no-profile／global 路徑保持原契約。
- API 保留 canonical failure 身分；兩個管理頁面的消耗結果不借用 legacy sentinel。完整資料庫不可讀造成既有非成功 API 回應時，不偽裝成 no-profile。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `consumption-history-projections`: 明訂 day／month／year 已設定 profile 後的計算及 projection 讀取失敗必須保留 canonical unavailable 語意。

## Impact

- Affected specs: `openspec/specs/consumption-history-projections/spec.md`。
- Modified: `apps/server/src/services/periodConsumptionService.ts`、`apps/server/src/services/periodConsumptionService.test.ts`、`apps/server/src/routes/metrics-history.test.ts`、`apps/web/src/pages/EnergyHistory/viewModel.test.ts`、`apps/web/src/pages/EnergyTrend/viewModel.test.ts`。
- 視回歸結果調整既有消費端：`apps/server/src/routes/metrics-history.ts`、`apps/web/src/pages/EnergyHistory/viewModel.ts`、`apps/web/src/pages/EnergyTrend/viewModel.ts`；只限保留 failure 語意，不重塑 API。
- New／Removed: 無。無資料遷移、套件或現場操作。
- 先完成本案並驗證，再實作 bound-accounting-evidence-window-reads；後者須保留本案結果與測試，不平行編輯共同 service／spec。
