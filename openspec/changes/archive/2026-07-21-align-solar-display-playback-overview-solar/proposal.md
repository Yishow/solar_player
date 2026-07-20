## Why

`/overview` 與 `/solar` 是第一批最適合用來驗證 playback prototype 對位的方法頁。它們共享 KPI、hero、status、section rhythm，風險比 flow-heavy 或 media-heavy 頁面低，適合作為第一個 playback witness batch。

## What Changes

- 只處理 `/overview` 與 `/solar` 兩頁的 prototype 對位。
- 為這兩頁建立 page-local adapter / view-model，集中處理 KPI 與展示欄位映射。
- 驗證 route rotation、offline redirect、live metric fallback 沒有回歸。

## Capabilities

### New Capabilities

- `playback-overview-solar-alignment`: 定義 `/overview` 與 `/solar` 的 prototype composition 對位、runtime contract 保留與驗證方式。

### Modified Capabilities

(none)

## Impact

- Affected specs: `playback-overview-solar-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/hooks/useLiveMetrics.ts`
    - `apps/web/src/layouts/offlineRouting.ts`
    - `apps/web/src/hooks/usePageRotation.ts`
  - New:
    - `apps/web/src/pages/Overview/` 或 `apps/web/src/pages/Solar/` 下的 page-local adapter / view-model 檔案
    - `openspec/changes/align-solar-display-playback-overview-solar/specs/`
  - Removed:
    - (none)
