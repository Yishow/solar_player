## Why

`/overview` 目前仍直接依賴 page-local `useLiveMetrics()` 與既有 fallback 組裝 KPI 與 summary 狀態，但 server 已經提供 `/api/display-story` 作為共享 monitoring story contract。若這條能力線不接回播放頁，`Overview` 會持續和 diagnostics / 後續 story-driven 頁面分岔，MVP 也無法宣稱內容來源已收斂。

## What Changes

- 讓 `Overview` 播放頁以 `/api/display-story` 的 overview payload 作為 KPI 與 summary 狀態的主要來源。
- 保留既有 `display page config`、FHD 固定畫布與 hero/layout 幾何，只替換資料 adapter，不重開視覺範圍。
- 明確保留 story payload 失敗時的 readable fallback，避免因 API 暫時不可用而讓 `/overview` 空白或破版。
- 補齊 web 端 API client、route adapter 與對應測試，讓 Overview 的 story binding contract 有明確驗證。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `overview-story-metric-binding`: 將 Overview 的 KPI 與 summary binding 從 page-local metric 組裝收斂到共享 `display-story` contract。

## Impact

- Affected specs: `overview-story-metric-binding`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/Overview/index.tsx`
  - Modified: `apps/web/src/pages/Overview/viewModel.ts`
  - Modified: `apps/web/src/pages/Overview/viewModel.test.ts`
  - Modified: `apps/web/src/pages/Overview/configRender.test.tsx`
  - Modified: `apps/web/src/hooks/useLiveMetrics.ts`
