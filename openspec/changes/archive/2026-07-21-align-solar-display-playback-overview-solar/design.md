## Context

這個 change 對應 umbrella rollout 的 Playback Batch A。它故意只處理 `/overview` 與 `/solar`，因為這兩頁共享 KPI 與 hero primitives，能在不碰 flow-heavy、media-heavy 風險的前提下先驗證 playback 對位方法。

## Goals / Non-Goals

**Goals:**

- 讓 `/overview` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` 的 hero、KPI、summary hierarchy。
- 讓 `/solar` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 的 flow summary 與 KPI hierarchy。
- 保留 route rotation、offline redirect、live metric fallback。

**Non-Goals:**

- 不處理 `/factory-circuit`、`/images`、`/sustainability`。
- 不調整 backend metrics contract。

## Decisions

### Align overview and solar as the first playback witness batch

這兩頁先驗證 playback batch 的遷移方法，確立 shell + KPI + hero 類型頁面怎麼對位 prototype。

### Preserve live metrics and offline-sensitive runtime behavior

視覺遷移不能改變 `useLiveMetrics`、route rotation、offline redirect 與 fallback contract。

### Centralize overview and solar display mapping in page-local adapters

避免把 prototype 欄位對應邏輯散落在 JSX 中，降低後續 drift 風險。

## Implementation Contract

**Behavior**

- `/overview` 與 `/solar` 完成後，應明顯接近 prototype 的區塊與節奏。
- 兩頁在斷線、fallback、rotation 情境下仍保留原本行為。

**Interface / data shape**

- 現有 route path 不變。
- `useLiveMetrics` 仍是主要 live data source。
- page-local adapter 需定義 prototype 區塊所需的 display fields。

**Failure modes**

- 若 live metrics 缺值，頁面需回到既有 fallback presentation。
- 若 offline routing 被視覺改版破壞，這個 batch 視為失敗。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- `pnpm --filter @solar-display/web test -- src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts src/layouts/offlineRouting.test.ts` 成功。
- 人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/01-overview.html` 與 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 檢查區塊層級。

**Scope boundaries**

- In scope：`/overview`、`/solar`、其 page-local adapters、相關 playback fallback verification。
- Out of scope：其他三條 playback route。

## Risks / Trade-offs

- [如果把這批擴成五頁] → 嚴格限制只做 `/overview` 與 `/solar`。
- [如果 adapter 沒抽出來] → 後續 prototype field mapping 會散落在 JSX 中。
