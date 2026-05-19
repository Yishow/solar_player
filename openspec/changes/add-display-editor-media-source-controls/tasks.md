## 1. 擴充 persisted media binding contract

- [ ] 1.1 落實 `Extend DisplayPageMediaBinding with explicit sourceMode instead of opaque field inference` 與 `Editor SHALL expose explicit source modes for persisted display-page media bindings`，為 `DisplayPageMediaBinding` 新增顯式 `sourceMode` 與對應 payload 規則，讓 `Overview`、`Solar`、`Sustainability`、`Images` 不再依欄位有無推論來源；驗證方式為 shared type tests、config merge/load tests 與 artifact review。
- [ ] 1.2 落實 `Editor SHALL expose explicit source modes for persisted display-page media bindings`，讓 editor inspector 依 `managed-asset`、`direct-src`、`seed-default` 三種 mode 呈現對應欄位與 validation，並保留既有 `alt` 與 placement controls；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`、page config tests 與 manual inspector review。

## 2. 導入 media source resolver 與 Images 邊界

- [ ] 2.1 落實 `Keep Images playlist active asset outside persisted fallback source controls` 與 `Images main stage fallback source SHALL remain separate from playlist active media`，讓 `Images` main stage 的 editor-configured source 只作為 fallback contract，而不覆蓋有效 playlist active asset；驗證方式為 `apps/web/src/pages/Images` runtime/config tests 與 browser manual assertion。
- [ ] 2.2 落實 `Reuse existing asset health and placement controls around resolved media source` 與 `Media source mode changes SHALL preserve existing placement controls`，建立 shared media source resolver，讓 preview/runtime 在不同 source mode 下仍共用 `fitMode`、`focusX/Y`、`alignX/Y`；驗證方式為 media resolver tests、`displayPageMediaStyle` tests 與 targeted page render tests。

## 3. 更新 asset binding 規格與完成驗證

- [ ] 3.1 落實 `Bind display page media fields to managed asset library references` 的規格更新，讓 managed asset mode、direct source mode 與 seed-default mode 的持久化語義與 health/reporting 邊界一致；驗證方式為 `display-page-asset-library-binding` delta spec content review、asset health tests 與 API contract review。
- [ ] 3.2 完成 media source controls 的最終驗證，確認 `pnpm --filter @solar-display/web exec tsc --noEmit -p tsconfig.json`、targeted web tests、`pnpm --filter @solar-display/web build`、`spectra validate --strict --changes add-display-editor-media-source-controls` 通過；驗證方式為上述命令與單一 browser session 檢查四頁 source mode preview/runtime parity。
