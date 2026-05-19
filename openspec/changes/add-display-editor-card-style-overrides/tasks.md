## 1. 建立 card style config 契約

- [ ] 1.1 落實 `Store card style overrides alongside region config` 與 `Editor SHALL expose persisted card appearance controls for eligible display-card regions`，讓 `Overview`、`Solar`、`Sustainability`、`Images` 各自新增獨立 `cardStyles` record 而不是把 style token 混進幾何 rect；驗證方式為 page config source tests 與 inspector schema content review，確認 eligible card region 都有對應的 style path。
- [ ] 1.2 落實 `Editor SHALL expose persisted card appearance controls for eligible display-card regions`，讓 editor inspector 為 eligible card region 顯示 title/subtitle/value/unit typography、padding、radius、header gap、icon box、footer spacing、value-row alignment 等細粒度欄位；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 與 page config render tests。

## 2. 讓 shared primitives 成為唯一 renderer

- [ ] 2.1 落實 `Reuse shared display card primitives as the only renderer` 與 `Card appearance overrides SHALL render through shared display card primitives`，讓 `displayPageCards` 從 resolved `cardStyles` token 渲染 shared CSS variables 或 props，並讓 preview 與 playback 讀到同一份 contract；驗證方式為 `apps/web/src/components/displayPageCards.test.tsx`、各頁 render/config tests，以及 manual content review 確認不再靠 page-local baseline override 才成立。
- [ ] 2.2 落實 `Card appearance overrides SHALL render through shared display card primitives`，讓 `Overview`、`Solar`、`Sustainability`、`Images` 的 page-local CSS 只保留內容槽位與非共用 surface 細節，不再直接重寫 shared card typography/rhythm baseline；驗證方式為 targeted CSS/source regression tests 與 browser computed-style 檢查。

## 3. 鎖住邊界與驗證

- [ ] 3.1 落實 `Keep card appearance separate from geometry and source binding` 與 `Card appearance overrides SHALL NOT change region geometry or source binding`，確保 style-only 編輯不改 `left/top/width/height`、icon source、media source 或 geometry history；驗證方式為 geometry/history tests、config diff review 與 browser manual assertion。
- [ ] 3.2 完成 card style override 的 validation、reset、fallback 與最終驗證，讓非法/缺漏 token 回退 shared baseline，並確認 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`、targeted web tests、`pnpm --filter @solar-display/web build`、`spectra validate --strict --changes add-display-editor-card-style-overrides` 通過；驗證方式為上述命令與單一 browser session 檢查四頁 card style parity。
