## 1. 建立 shared card rail config 契約

- [ ] 1.1 落實 `Store card rails as explicit template-tagged config records` 與 `Persist template-based card rails in display page configuration`，讓共用 display page config、draft envelope 與 `Provide draft and live publishing channels for display page configuration` 都能保存 rail container 與 template-tagged cards；驗證方式為 `apps/web/src/hooks/useDisplayPageConfig.test.ts`、page config source tests 與 `spectra validate --strict --changes generalize-display-page-highlight-rails-to-card-rails`。
- [ ] 1.2 落實 `Reuse the shared display page persistence channel instead of a new rail store`，讓 server 讀寫與 publish path 以既有 display page draft/live channel 保存 card rail，而不是建立額外資料來源；驗證方式為 `apps/server/src/routes/display-pages.test.ts` 與 API content review，確認 draft/live payload 都含同一份 rail contract。

## 2. 讓 runtime 以模板解析 card rail

- [ ] 2.1 落實 `Render card rails through template resolvers`，讓 Sustainability preview 與 playback 能依 template key 渲染 rail cards，而不是假設固定四格 item 陣列；驗證方式為 `apps/web/src/pages/Sustainability/configRender.test.ts`、`apps/web/src/pages/Sustainability/index.tsx` source review 與受影響 web tests。
- [ ] 2.2 落實 `Keep metric-highlight as a first-class compatibility template`，讓既有四格摘要在新 rail schema 下仍以 `metric-highlight` 正式模板保存與顯示；驗證方式為 seed config tests、`apps/web/src/pages/Sustainability/viewModel.test.ts` 與 manual content review 確認舊摘要內容不消失。

## 3. 鎖住發布安全與回歸驗證

- [ ] 3.1 落實 `Validate rail cards through publish-time card rail safety rules` 與 `Run layout safety guards before publish`，讓 rail card 越界或缺少模板必填欄位時 publish 會回傳 blocking findings；驗證方式為 `apps/server/src/routes/display-pages.test.ts` 新增 rail validation cases。
- [ ] 3.2 完成 shared card rail regression 驗證，確認 `Persist template-based card rails in display page configuration`、`Render card rails through template resolvers` 與 `Keep metric highlight cards as a first-class compatibility template` 在型別、web build 與 Spectra analyzer 下都成立；驗證方式為 `pnpm --filter @solar-display/web test`、`pnpm --filter @solar-display/web build` 與 `spectra validate --strict --changes generalize-display-page-highlight-rails-to-card-rails`。
