## Why

在 shared FHD shell 與 playback shell boundary 修正之後，最適合先遷移的是 display/playback 性質最強、且主要風險集中在 view layer 的頁面。如果這一批頁面仍留在 `PageScaffold + grid/card` 模型，即使共用 shell 正確，畫面本體仍會與 reference prototype 的 FHD canvas composition 持續脫節。

## What Changes

- 只處理 `docs/reference-match/all-pages-audit.md` 中較適合 playback canvas 的 7 條 route：`/overview`、`/solar`、`/images`、`/trends`、`/history`、`/slideshow-preview`、`/device-status`。
- 讓上述頁面改用 shared `KuozuiFhdCanvas` / `ReferenceFhdShell` / `DisplayCanvas` 家族與 page-local layout constants，而不再依賴 dashboard-style `PageScaffold` title block 作為主要版面。
- 每頁建立或更新 page layout constants、asset mapping 與 page JSX，使畫面主要區塊接近對應 reference HTML/CSS，但保留原本的資料 hook、viewModel 與 fallback contract。
- 將 page-specific asset 使用限制在既有 generated assets、page-artifacts 與 mock/fallback 範圍內，不新增 backend API 或 service contract。

## Non-Goals

- 不處理 settings / management form-heavy pages，例如 `/settings/playback`、`/settings/images`、`/settings/mqtt`、`/settings/circuits`。
- 不重寫 shared shell host，該責任由 `repair-fhd-canvas-host-and-playback-shell` 負責。
- 不改 backend、socket、image service、playback engine、device action API 或 route contract。
- 不承諾一次完成 pixel-perfect；本 change 聚焦在 page body composition、asset binding 與 visual hierarchy。

## Capabilities

### New Capabilities

- `reference-display-surface-page-alignment`: 定義 7 條 display/playback surface routes 的 reference body composition、layout constants、asset mapping、view-model preservation 與 route-level visual verification。

### Modified Capabilities

(none)

## Impact

- Affected specs: `reference-display-surface-page-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/index.tsx`
    - `apps/web/src/pages/Solar/index.tsx`
    - `apps/web/src/pages/Images/index.tsx`
    - `apps/web/src/pages/EnergyTrend/index.tsx`
    - `apps/web/src/pages/EnergyHistory/index.tsx`
    - `apps/web/src/pages/SlideshowPreview/index.tsx`
    - `apps/web/src/pages/DeviceStatus/index.tsx`
    - `apps/web/src/pages/Overview/viewModel.ts`
    - `apps/web/src/pages/Solar/viewModel.ts`
    - `apps/web/src/pages/Images/viewModel.ts`
    - `apps/web/src/pages/EnergyTrend/viewModel.ts`
    - `apps/web/src/pages/EnergyHistory/viewModel.ts`
    - `apps/web/src/pages/SlideshowPreview/viewModel.ts`
    - `apps/web/src/pages/DeviceStatus/viewModel.ts`
  - New:
    - `apps/web/src/referenceLayout/` 下對應上述頁面的 layout constants 與 asset mapping 檔案
    - `openspec/changes/align-reference-display-surface-pages/specs/`
  - Removed:
    - (none)
