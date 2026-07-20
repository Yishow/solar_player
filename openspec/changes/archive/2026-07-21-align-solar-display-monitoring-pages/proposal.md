## Why

`/trends`、`/history`、`/offline`、`/slideshow-preview`、`/device-status` 雖然都屬 management family，但它們的共同點是 read-heavy 或 runtime-sensitive，而不是 settings CRUD。把它們合成一個 monitoring change，可以專注處理可讀性、offline/slideshow behavior 與維護操作的版面整合。

## What Changes

- 對齊 `/trends`、`/history`、`/offline`、`/slideshow-preview`、`/device-status` 的 prototype pages。
- 保留 offline reconnect / returnTo、slideshow preview controls、device maintenance action feedback。
- 驗證長資料與高密度內容在 FHD 下可讀。

## Capabilities

### New Capabilities

- `monitoring-pages-alignment`: 定義 monitoring and maintenance routes 的 prototype 對位、可讀性與 runtime-sensitive behavior preservation。

### Modified Capabilities

(none)

## Impact

- Affected specs: `monitoring-pages-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/EnergyTrend/index.tsx`
    - `apps/web/src/pages/EnergyHistory/index.tsx`
    - `apps/web/src/pages/OfflineError/index.tsx`
    - `apps/web/src/pages/SlideshowPreview/index.tsx`
    - `apps/web/src/pages/DeviceStatus/index.tsx`
    - `apps/web/src/layouts/offlineRouting.ts`
    - `apps/web/src/hooks/usePageRotation.ts`
  - New:
    - `apps/web/src/pages/` 下監控頁對應的 page-local mapping 檔案
    - `openspec/changes/align-solar-display-monitoring-pages/specs/`
  - Removed:
    - (none)
