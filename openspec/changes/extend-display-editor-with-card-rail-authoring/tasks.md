## 1. 把 rail 卡片變成第一級 authoring node

- [x] 1.1 落實 `Model rail cards as selectable child authoring nodes` 與 `Treat rail cards as first-class display editor authoring items`，讓支援 card rail 的頁面在 region tree、canvas selection 與 draft binding 中都能選到個別 rail card；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`、`regionTree` tests 與 `spectra validate --strict --changes extend-display-editor-with-card-rail-authoring`。
- [x] 1.2 落實 `Keep region navigation separate from visual overlay`，讓導覽樹可列出 rail 與其 child cards，並能切換 inspector 目標到選中的卡片；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`、navigation content review 與新增 selection tests。

## 2. 建立 rail 卡片 lifecycle 與 template authoring

- [x] 2.1 落實 `Separate card lifecycle commands from template field editing` 與 `Provide card lifecycle actions inside a rail`，讓 editor 可新增、刪除、複製、排序、顯示開關與模板切換 rail cards，且變更仍屬於 current draft session；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`、history/draft session tests 與 manual workflow review。
- [x] 2.2 落實 `Use template-specific inspector schemas instead of raw array editing` 與 `Switch rail card templates through typed authoring controls`，讓 `metric-highlight` 與 `household-equivalent` 依 template key 顯示不同 typed inspector fields；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 與 template-switch regression tests。
- [x] 2.3 落實 `Describe region fields with a schema-aware inspector contract` 與 `Enforce typed inspector constraints during editing`，讓 rail card 欄位仍遵守既有 typed inspector validation，不會把不相容 template 欄位當成合法資料；驗證方式為 inspector validation tests 與 schema content review。

## 3. 讓 rail 卡片可在 canvas 內拖拉縮放

- [x] 3.1 落實 `Constrain rail card geometry inside the parent rail bounds` 與 `Manipulate display editor geometry directly on canvas`，讓 rail cards 可直接 drag/resize，但 frame 會被 parent rail bounds 約束；驗證方式為 `apps/web/src/pages/DisplayPagesEditor/canvasInteractions.test.ts`、geometry tests 與 preview assertion。
- [x] 3.2 落實 `Provide page-specific authoring coverage for supported display pages` 與 `Keep page-specific authoring bound to the current draft session`，讓 card-rail-enabled 頁面的 child cards 參與 save/reset/preview-binding workflow，而不是只存在 transient canvas state；驗證方式為 draft session tests、page-specific authoring tests 與 end-to-end editor flow review。
- [x] 3.3 完成 editor card rail authoring regression 驗證，確認 `Treat rail cards as first-class display editor authoring items`、`Provide card lifecycle actions inside a rail`、`Switch rail card templates through typed authoring controls` 與 `Keep region navigation separate from visual overlay` 都在 web tests 與 Spectra analyzer 下成立；驗證方式為 `pnpm --filter @solar-display/web test`、必要 build/test 命令與 `spectra validate --strict --changes extend-display-editor-with-card-rail-authoring`。
