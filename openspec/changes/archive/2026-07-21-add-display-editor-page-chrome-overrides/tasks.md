## 1. 建立 page chrome config 分群

- [x] 1.1 落實 `Store page chrome overrides in per-page chrome groups rather than card region records` 與 `Editor SHALL expose hero chrome typography overrides for all display pages`，為五個 display 頁新增獨立 `chrome` 群組，且至少具備 hero chrome appearance config；驗證方式為 page config source tests 與 inspector schema content review。
- [x] 1.2 落實 `Separate hero chrome, decorative ornaments, and page modules into independent override groups`，讓各頁的 heroTypography、ornaments、modules 以獨立欄位群組暴露，而不是平面大物件；驗證方式為 page config tests 與 manual schema review，確認 `Images`、`Sustainability`、`FactoryCircuit` 各自只暴露支援的 chrome 群組。

## 2. 讓 preview/runtime 套用 chrome overrides

- [x] 2.1 落實 `Editor SHALL expose hero chrome typography overrides for all display pages` 與 `Editor SHALL expose decorative ornament overrides where a page defines ornaments`，讓 hero title/eyebrow/subtitle 與 gold line/leaf 等 ornament 從 persisted chrome config 解析，而不是只靠 page-local CSS hardcode；驗證方式為各頁 render/config tests 與 browser visual regression 檢查。
- [x] 2.2 落實 `Editor SHALL expose page-specific chrome module appearance overrides without changing data sources` 與 `Keep data-bound modules content-driven while only appearance is overridable`，讓 `Images` counter/arrow、`Sustainability` period chips/provenance、`FactoryCircuit` status block 等模組只改 appearance、不改資料綁定；驗證方式為 targeted page tests、source review 與 browser manual assertion。

## 3. 鎖住 fallback 與完成驗證

- [x] 3.1 落實 `Store page chrome overrides in per-page chrome groups rather than card region records` 的 reset/fallback 行為，讓缺漏或非法 chrome token 回退 seed baseline，且不支援的群組不會出現在該頁 inspector；驗證方式為 validation tests、reset-path tests 與 schema content review。
- [x] 3.2 完成 page chrome overrides 的最終驗證，確認 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`、targeted web tests、`pnpm --filter @solar-display/web build`、`spectra validate --strict --changes add-display-editor-page-chrome-overrides` 通過；驗證方式為上述命令與單一 browser session 檢查五頁 hero/chrome parity。
