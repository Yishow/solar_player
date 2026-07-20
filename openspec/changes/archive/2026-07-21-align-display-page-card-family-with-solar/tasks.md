## 1. Shared Card Primitives

- [x] 1.1 完成 `Create shared display card primitives instead of token-only CSS alignment`，交付可被 `Solar`、`Overview`、`Sustainability`、`Images` 重用的 frame/header/value-row/footer primitives，讓 `Share a Solar-derived metric card skeleton across display monitoring pages` 的共用骨架可觀察成立；驗證方式為 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json` 與內容 review，確認頁面不再依賴四套彼此分裂的 card skeleton。
- [x] 1.2 完成 `Treat Solar KPI cards as the visual source of truth while preserving page-specific content slots`，讓 `Solar` KPI card 持續作為 baseline，且 `Overview` sparkline、`Sustainability` growth note / bullet list、`Images` metadata 仍能透過 slot 保留；驗證方式為人工檢查 `/solar`、`/overview`、`/sustainability`、`/images` 的 card 內容型態未被硬套成單一模板。

## 2. Metric and Info Card Adoption

- [x] 2.1 完成 `Share a Solar-derived metric card skeleton across display monitoring pages`，讓 `/overview` KPI 與 `/sustainability` KPI/stat 在不改 `left/top/width/height` 的前提下共用 Solar-derived metric-card frame、icon、title、value-row、footer rhythm；驗證方式為 targeted web tests 與人工檢查四頁 FHD card 幾何未改變。
- [x] 2.2 完成 `Split the shared family into metric-card and info-card surfaces`，讓 `Share an info-card family for compact summary and metadata cards` 套用到 `Overview` summary 與 `Images` info card，而不把它們誤做成 KPI card；驗證方式為人工檢查 summary 仍為 compact status surface、Images 仍保留 title/body/metadata strip。

## 3. Value Row Alignment and Regression Coverage

- [x] 3.1 完成 `Keep page geometry and information density fixed while centering the value row within the card body`，讓 `Center KPI and stat value rows without changing page geometry` 在 `Overview` 與 `Sustainability` card family 上成立，數值列需水平置中且 value/unit baseline 對齊；驗證方式為 targeted web tests 或 DOM/style assertions，加上人工檢查數值區不再左偏。
- [x] 3.2 完成 display card family regression coverage，確認共用 SVG icon 語言、slot footer、fallback content 與既有 FHD card geometry 在 `/overview`、`/solar`、`/sustainability`、`/images` 都持續成立；驗證方式為 `pnpm --filter @solar-display/web exec tsx --test ...` 的相關頁面測試、`pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`，以及 `spectra validate --strict --changes align-display-page-card-family-with-solar`。
