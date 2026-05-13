## 1. Media-Heavy Playback Alignment

- [x] 1.1 完成 “Align images and sustainability as the dedicated media-heavy playback batch” 並對應 ### Keep media-heavy playback routes in a dedicated batch，明確限制本 change 只覆蓋 `/images` 與 `/sustainability`；驗證方式為內容 review，確認其他 playback routes 不在本 scope。
- [x] 1.2 完成 `playback-images-sustainability-alignment` 的 `/images` prototype 對位，讓主媒體框、縮圖帶、側欄資訊接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`。
- [x] 1.3 完成 `playback-images-sustainability-alignment` 的 `/sustainability` prototype 對位，讓 hero、big-number、ESG sections 接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`。

## 2. Fallback Preservation

- [x] 2.1 完成 “Preserve media and sustainability fallback presentation” 並對應 ### Preserve placeholder and fallback presentation instead of inventing new contracts，確認缺 asset / 缺 summary 時仍有完整 fallback presentation；驗證方式為人工檢查缺資料情境不空白不破版。
- [x] 2.2 完成 playback media evidence bundle，記錄 `/images`、`/sustainability` 的 prototype 對照、build 結果與 fallback gap note；驗證方式為內容 review，確認兩條 route 都有 screenshot 與未完成註記。
