## Why

Display 五頁的質感問題不是單一 CSS bug，而是多個頁面長期各自演化造成的 drift。即使完成 token、Factory primitive 與 preview mode 對齊，若沒有 guardrails，後續新增內容、改卡片、換圖片或調 editor config 時，仍可能再次出現：hardcoded color 回來、卡片骨架分裂、preview 變回管理味、FHD 幾何被非預期移動。

這個 change 不是實作視覺重構，而是建立「防退兵法」：用測試、文件與人工 review checklist 鎖住 display surface 的核心質感邊界。範圍小，但要齊。

## What Changes

- 新增 `docs/display-surface-visual-review-checklist.md`，作為 playback visual changes 的 review gate 與例外記錄模板。
- 新增 display surface visual guardrail contract，定義五頁質感不退化的最低要求。
- 規範新增/修改 display playback page 時必須檢查 shared semantic tokens、shared card primitives、hero/photo fade、ornaments、preview mode 與 FHD geometry。
- 補充 targeted tests 或 lightweight assertions，確認 runtime definitions、preview definitions、shared card/chrome contracts 不被意外繞過。
- 新增人工 review checklist，對照 prototype family 與五頁 display surface，不以像素級重畫為目標，而以 visual family consistency 為目標。

## Non-Goals

- 不導入重量級 visual snapshot service 作為硬依賴。
- 不要求所有頁面像素完全匹配 prototype。
- 不阻止頁面內容與資料變化；只守住 shared visual family 與 geometry safety。
- 不替代 OpenSpec validation、TypeScript、現有 unit tests。

## Capabilities

### New Capabilities

- `display-surface-visual-guardrails`: 定義 display playback pages 的視覺一致性、shared primitive adoption、semantic token usage、preview mode 與 FHD geometry regression guardrails。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-surface-visual-guardrails`
- Affected code/docs:
  - possible docs under `docs/reference-match` or `docs/display-surface-review`
  - tests under `apps/web/src/pages/*` and `apps/web/src/pages/shared/*`
  - optional lint-style test for display page CSS token usage
- Validation:
  - `pnpm --filter @solar-display/web test`
  - `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`
  - `spectra validate --strict --changes add-display-surface-visual-guardrails`
  - review checklist: `docs/display-surface-visual-review-checklist.md`
