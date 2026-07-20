## 1. 建立 icon source schema

- [x] 1.1 落實 `Represent icon source with an explicit mode-and-payload object` 與 `Editor SHALL expose explicit icon source modes for eligible icon regions`，為 5 個 display 頁的 eligible icon region 新增明確的 icon source mode/payload config，而不是依 `src` 或 helper 推斷來源；驗證方式為 page config source tests 與 schema content review，確認 `asset-image`、`reference-glyph`、`page-icon-key` 三種 mode 都有對應欄位。
- [x] 1.2 落實 `Editor SHALL expose explicit icon source modes for eligible icon regions`，讓 editor inspector 根據 source mode 顯示正確欄位，並只對適用頁面的 region 開放 icon source controls；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 與各頁 config render tests。

## 2. 導入 shared icon resolver

- [x] 2.1 落實 `Keep page-local registries behind a shared icon resolver` 與 `Page-local icon registries SHALL remain addressable through the shared icon resolver`，建立共用 icon resolver，讓 `ReferenceGlyph`、asset image 與 `Sustainability` / `FactoryCircuit` page-local registry 都經由同一入口解析；驗證方式為 resolver unit tests 與 `Overview`、`Solar`、`Sustainability`、`FactoryCircuit`、`Images` source-level render tests。
- [x] 2.2 落實 `Page-local icon registries SHALL remain addressable through the shared icon resolver`，把五頁 icon-bearing region 改接 shared resolver，同時保留 `Solar` asset icon 仍輸出 `IMG`、其他 registry/glyph 仍輸出對應 `svg`；驗證方式為 targeted render tests 與 browser DOM 檢查。

## 3. 鎖住 fallback 與完成驗證

- [x] 3.1 落實 `Fail safe to seed icon source when source payload is invalid` 與 `Invalid icon source payloads SHALL fall back to the seed icon source`，讓 invalid asset、unknown glyph、unknown registry key 都回退 seed baseline 並顯示 editor validation issue；驗證方式為 resolver failure tests、inspector validation tests 與 manual preview assertion。
- [x] 3.2 完成 icon source controls 的最終驗證，確認 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`、targeted web tests、`pnpm --filter @solar-display/web build`、`spectra validate --strict --changes add-display-editor-icon-source-controls` 通過；驗證方式為上述命令與單一 browser session 逐頁檢查 icon mode parity 與 fallback 行為。
