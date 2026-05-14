## Why

在前幾輪 reference alignment 後，`docs/reference-match/all-pages-checklist.md` 仍只剩 `/factory-circuit`、`/sustainability`、`/offline` 三頁維持 `partial`。如果不把這三頁補齊，全站 reference-match closeout 仍會停在不完整狀態，而且播放頁與離線備援頁之間會持續存在兩套視覺模型。

## What Changes

- 只處理 `/factory-circuit`、`/sustainability`、`/offline` 三條 route 的 reference alignment。
- 讓 `/factory-circuit` 與 `/sustainability` 改用 shared playback FHD shell 下的 page-local layout constants、asset mapping、absolute-position composition。
- 讓 `/offline` 改成接近 `12-offline-error-display.html` 的 centered alert + right-side media composition，同時保留 reconnect、retry、returnTo 與備援導頁互動。
- 保留既有 `viewModel`、hook、fallback 與 route-level service contract；若缺 page-specific assets，使用現有 provisional/generated asset 或既有 placeholder。

## Capabilities

### New Capabilities

- `reference-remaining-page-alignment`: 定義 `/factory-circuit`、`/sustainability`、`/offline` 的最終 reference alignment scope、layout migration contract、fallback preservation 與 batch verification。

### Modified Capabilities

(none)

## Impact

- Affected specs: `reference-remaining-page-alignment`
- Affected code:
  - Modified:
    - `apps/web/src/pages/FactoryCircuit/index.tsx`
    - `apps/web/src/pages/FactoryCircuit/viewModel.ts`
    - `apps/web/src/pages/FactoryCircuit/viewModel.test.ts`
    - `apps/web/src/pages/Sustainability/index.tsx`
    - `apps/web/src/pages/Sustainability/viewModel.ts`
    - `apps/web/src/pages/Sustainability/viewModel.test.ts`
    - `apps/web/src/pages/OfflineError/index.tsx`
    - `apps/web/src/pages/OfflineError/viewModel.ts`
    - `apps/web/src/pages/OfflineError/viewModel.test.ts`
    - `docs/reference-match/all-pages-audit.md`
    - `docs/reference-match/all-pages-checklist.md`
  - New:
    - `apps/web/src/pages/FactoryCircuit/layout.ts`
    - `apps/web/src/pages/FactoryCircuit/layout.test.ts`
    - `apps/web/src/pages/FactoryCircuit/factoryCircuit.css`
    - `apps/web/src/pages/Sustainability/layout.ts`
    - `apps/web/src/pages/Sustainability/layout.test.ts`
    - `apps/web/src/pages/Sustainability/assets.ts`
    - `apps/web/src/pages/Sustainability/sustainability.css`
    - `apps/web/src/pages/OfflineError/layout.ts`
    - `apps/web/src/pages/OfflineError/layout.test.ts`
    - `apps/web/src/pages/OfflineError/assets.ts`
    - `apps/web/src/pages/OfflineError/offline.css`
    - `openspec/changes/align-reference-remaining-factory-sustainability-offline-pages/specs/`
  - Removed:
    - (none)
