## 1. Low-Risk Settings Batch

- [x] 1.1 完成 “Align playback settings and image management as the low-risk settings batch” 並對應 ### Treat playback settings and image management as the low-risk settings batch，明確限制本 change 只處理 `/settings/playback` 與 `/settings/images`；驗證方式為內容 review，確認 MQTT、circuits、monitoring pages 不在本 scope。
- [x] 1.2 完成 `settings-playback-images-alignment` 的 `/settings/playback` prototype 對位，讓設定分區、schedule controls、page reorder 區塊接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/07-playback-settings.html`。
- [x] 1.3 完成 `settings-playback-images-alignment` 的 `/settings/images` prototype 對位，讓資產清單、狀態標記、快速操作區接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/08-image-management.html`。

## 2. Interaction Preservation

- [x] 2.1 完成 “Preserve playback scheduling and image-management interactions” 並對應 ### Preserve settings interactions before optimizing layout density，確認播放排序、啟用開關、儲存與 image rows 的可讀性不回歸；驗證方式為執行 `pnpm --filter @solar-display/server test -- src/routes/playback.test.ts src/routes/images.test.ts`，並人工 smoke test 主要操作。
