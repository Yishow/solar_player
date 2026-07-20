## Context

這個 change 對應 umbrella rollout 的 Playback Batch C。`/images` 的關鍵在 media slot、thumbnail hierarchy、placeholder handling；`/sustainability` 的關鍵在 big-number storytelling、ESG section rhythm 與 fallback summary。它們適合當成同一個 media-heavy batch，但不適合和 KPI 或 flow 頁混做。

## Goals / Non-Goals

**Goals:**

- 讓 `/images` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` 的 media composition。
- 讓 `/sustainability` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html` 的 hero 與 storytelling composition。
- 保留 media placeholder 與 sustainability summary fallback。

**Non-Goals:**

- 不處理其他三條 playback route。
- 不新增新的媒體 API 或新的 sustainability backend contract。

## Decisions

### Keep media-heavy playback routes in a dedicated batch

這兩頁共用 media/storytelling 風險，應與 KPI/flow 頁分開驗證。

### Preserve placeholder and fallback presentation instead of inventing new contracts

沒有 runtime asset 或 live summary 時，應沿用 placeholder / fallback，而不是為了填滿 prototype slot 臨時擴後端。

## Implementation Contract

**Behavior**

- `/images` 應有 prototype-aligned 主媒體框、縮圖帶、側欄資訊。
- `/sustainability` 應有 prototype-aligned hero、big-number、ESG sections。
- 缺資料時仍維持完整版面。

**Interface / data shape**

- 現有 image mock / asset contract 不強制變更。
- 現有 sustainability mock / fallback summary contract 不強制變更。

**Failure modes**

- 若沒有 runtime asset，`/images` 需明確顯示 placeholder。
- 若 summary 缺值，`/sustainability` 需維持可讀 fallback presentation。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html` 與 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`。
- 缺 asset / 缺 summary 時頁面不空白。

**Scope boundaries**

- In scope：`/images`、`/sustainability`、media/summary fallback。
- Out of scope：其他 playback 頁與新後端 contract。

## Risks / Trade-offs

- [如果為了還原 prototype 而發明新資料來源] → 嚴格要求 fallback-first。
- [如果把這兩頁與其他 playback 頁混做] → media-specific 驗證會失焦。
