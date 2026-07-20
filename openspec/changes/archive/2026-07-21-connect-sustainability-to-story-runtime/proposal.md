## Why

`/sustainability` 目前仍用 page-local `sustainabilitySummary` / `sustainabilityHighlights` mock 組裝內容，但 server 已經提供 `/api/sustainability-story`，包含 periodized metrics、provenance 與 configurable story modules。若播放頁不接這條 runtime story，MVP 在永續頁仍是 mock-first，而不是可操作、可追溯的正式內容面。

## What Changes

- 讓 `Sustainability` 播放頁以 `/api/sustainability-story` 作為 period、big numbers、provenance 與 story modules 的主要來源。
- 保留既有 `display page config`、hero/media FHD 幾何與 seed-backed版型，不重新打開 reference 調整範圍。
- 保留模組缺值、period data 不完整時的 readable fallback，避免 story API 接線後反而使頁面 brittle。
- 補齊 web API client、route adapter 與測試，讓 period/provenance/module contract 可以單獨驗證。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `sustainability-data-provenance`: 讓 Sustainability 頁正式以 story payload 的 provenance 作為顯示來源。
- `sustainability-period-comparison`: 讓 period 選擇與 big-number/story block 切換跟隨共享 story payload。
- `sustainability-story-modules`: 讓 Sustainability 內容模組直接由 story payload 驅動，而不是 page-local mock composition。

## Impact

- Affected specs: `sustainability-data-provenance`, `sustainability-period-comparison`, `sustainability-story-modules`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/Sustainability/index.tsx`
  - Modified: `apps/web/src/pages/Sustainability/viewModel.ts`
  - Modified: `apps/web/src/pages/Sustainability/viewModel.test.ts`
  - Modified: `apps/web/src/pages/Sustainability/configRender.test.ts`
