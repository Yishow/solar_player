## Why

輪播在判斷某頁的即時資料是否「新鮮」時，目前使用全域單一最新時間戳：只要 `live_metric_values` 中任一 metric 在 freshness window 內更新過，整體就被視為 fresh。後果是—當某頁實際依賴的關鍵 metric（例如發電量）已斷流很久，但其他 metric 仍在更新時，該頁仍被當成新鮮而照常播出舊資料，使 `staleData: "hide"` 的 fallback policy 失效。本變更改為依「每頁實際所需的 metric」逐一判斷新鮮度，讓只有真正缺新鮮資料的頁面被正確標記為 stale 並依其 policy 處置。

## What Changes

- 新增純函式 `resolveLiveMetricKeysForPage(templateKey)`：依 `displayMetricRequirements` 推導某頁需要的底層即時 metric keys（`mqtt-metric` 取 `requirementKey`；`derived-metric` 取 `dependencyKeys`，缺則取 `requirementKey`）。
- 新增純函式 `evaluatePageRuntimeFreshness({ requiredMetricKeys, metrics, nowMs, freshnessWindowMs })`：當該頁所需且存在於 snapshot 的 metric 全部在 window 內為 fresh；任一存在的所需 metric 過期、或所需 metric 完全沒有資料時為 stale，並回傳最舊的 metric key 與時間戳供 skip 細節。
- 修改 `displayRotationService` 的 `buildPageConditions`：以每頁的 `resolveLiveMetricKeysForPage` + `evaluatePageRuntimeFreshness` 取代原本的全域 `metricsFresh`，據此產生 `isReady`、`skipReason`（維持既有 `stale-runtime`）與 detail。
- 維持 mock mode 與既有 fallback policy 行為；freshness window 仍取自 `mqtt_settings.message_timeout`。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Capabilities

### New Capabilities

- `display-page-per-metric-freshness`: 以每頁實際所需的 metric 逐一判斷即時資料新鮮度，取代全域單一最新時間戳。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-page-per-metric-freshness（新增）
- Affected code:
  - New:
    - packages/shared/src/displayPageFreshness.ts
  - Modified:
    - packages/shared/src/index.ts
    - apps/server/src/services/displayRotationService.ts
    - apps/server/src/routes/playback.test.ts
  - Removed:
    - (none)
