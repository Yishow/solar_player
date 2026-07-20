## Why

`/solar` 已有 page-local flow/KPI storytelling，但實際上 server 已經提供 `/api/display-story` 的 solar story payload，包括 flow state 與 comparison target。若 Solar 繼續只靠頁面本地 adapter，播放頁、rotation diagnostics 與未來跨頁監控語意會持續分離，MVP 也還是停在半接線狀態。

## What Changes

- 讓 `Solar` 播放頁以 `/api/display-story` 的 solar payload 作為 flow node、KPI 與 comparison target 的主要來源。
- 保留既有 `display page config`、hero 資產、connector 幾何與 FHD layout，不把 scope 拉回 reference rework。
- 保留 story payload 缺值或 comparison target 不完整時的 readable fallback，避免 flow storytelling 因局部資料缺失而崩壞。
- 補齊 web 端 API client、route adapter 與對應測試，讓 Solar 的 story contract 可獨立驗證。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `solar-flow-state-storytelling`: 將 Solar 的 flow/KPI/comparison storytelling 從 page-local adapter 收斂到共享 `display-story` contract。

## Impact

- Affected specs: `solar-flow-state-storytelling`
- Affected code:
  - Modified: `apps/web/src/services/api.ts`
  - Modified: `apps/web/src/pages/Solar/index.tsx`
  - Modified: `apps/web/src/pages/Solar/viewModel.ts`
  - Modified: `apps/web/src/pages/Solar/viewModel.test.ts`
  - Modified: `apps/web/src/hooks/useLiveMetrics.ts`
