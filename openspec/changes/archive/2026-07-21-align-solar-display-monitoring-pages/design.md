## Context

這個 change 對應 umbrella rollout 的 Monitoring and Maintenance Batch。這五條 route 的共同點是 read-heavy 或 runtime-sensitive：`/offline` 牽涉 reconnect / returnTo，`/slideshow-preview` 牽涉 page rotation controls，`/device-status` 牽涉 maintenance actions，而 `/trends` 與 `/history` 牽涉高密度資料可讀性。

## Goals / Non-Goals

**Goals:**

- 讓五條 monitoring / maintenance routes 對齊各自 prototype。
- 保留 offline、slideshow preview、device maintenance 的 runtime-sensitive behavior。
- 讓高密度 chart/table/status content 在 FHD 下可讀。

**Non-Goals:**

- 不處理 settings routes。
- 不新增新的歷史資料 API、offline contract 或 device backend contract。

## Decisions

### Group read-heavy and runtime-sensitive routes into one monitoring change

這五頁共享高密度可讀性與 runtime-sensitive 驗證需求，因此適合一起規格化。

### Preserve offline, preview, and maintenance behavior before visual completeness

視覺對位不能破壞 reconnect、preview controls 或 maintenance action feedback。

### Treat readability as a contract, not a visual nice-to-have

長欄位、圖表、列表、維護資訊在 FHD 下的可讀性是明確驗收條件。

## Implementation Contract

**Behavior**

- 五條 route 完成後，應接近各自 prototype 的區塊與資料節奏。
- `/offline`、`/slideshow-preview`、`/device-status` 的行為敏感部分仍應可用。

**Interface / data shape**

- 既有 route paths 不變。
- `usePageRotation`、offline redirect、device status API contract 不變。

**Failure modes**

- 若 `/offline` 喪失 reconnect 或 returnTo 行為，這個 change 視為失敗。
- 若 `/slideshow-preview` 失去 prev/next/play controls，這個 change 視為失敗。
- 若長表格或長狀態列在 FHD 下不可讀，這個 change 視為未完成。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- `pnpm --filter @solar-display/web test -- src/layouts/offlineRouting.test.ts src/hooks/playbackRouteNavigation.test.ts src/hooks/playbackRouteSync.test.ts` 成功。
- 人工對照 `06`、`11`、`12`、`13`、`14` prototype pages，並檢查可讀性。

**Scope boundaries**

- In scope：`/trends`、`/history`、`/offline`、`/slideshow-preview`、`/device-status`。
- Out of scope：settings pages 與新 backend contract。

## Risks / Trade-offs

- [如果這批只看視覺不看 runtime-sensitive behavior] → 最容易在 `/offline`、`/slideshow-preview`、`/device-status` 出現假完成。
- [如果可讀性不被當成驗收條件] → monitoring pages 很容易變成 prototype 很像但實際不可用。
