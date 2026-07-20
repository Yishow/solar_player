## 1. Solar playback shell

- [x] 1.1 完成 “Render the solar route inside a dedicated FHD playback canvas shell” 並對應 ### Introduce a playback-only DisplayCanvas shell alongside PageScaffold，新增 playback-only `DisplayCanvas` 或等價元件，讓 `/solar` 在 1920x1080 設計座標中呈現 brand area、product title、clock/date、weather、MQTT status、footer nav、page number 與 mock shell metadata，同時讓管理頁維持既有 `PageScaffold` contract；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查 `/solar` 不再顯示管理頁 title/description scaffold。
- [x] 1.2 完成 “Render the solar route inside a dedicated FHD playback canvas shell” 的 viewport scaling contract，讓 `/solar` 在非 1920x1080 viewport 仍保留 header、hero、flow、KPI row 的相對位置而不回退成 stacked dashboard；驗證方式為人工調整 browser viewport，確認主要區塊仍維持 FHD canvas 關係。

## 2. Reference composition and asset mapping

- [x] 2.1 完成 “Map the solar page composition and assets to the reference playback prototype” 並對應 ### Render solar as absolute-position reference regions instead of dashboard panels，把 title group、leaf watermark、gold line、hero banner、4 個 flow nodes、3 條 connectors、5 張 KPI cards 改成接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 的 absolute-position composition；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/02-solar.html` 檢查主要區塊關係。
- [x] 2.2 完成 ### Keep solar reference layout constants and asset bindings page-local，將座標常數、shell mock metadata、hero/flow/KPI asset mapping 收斂到 page-local layout 或 asset 模組，讓 `apps/web/src/pages/Solar/index.tsx` 主要消費已整理的 mapping，而不是散落的 magic numbers、asset import 分支或 emoji icon literals；驗證方式為 code review，確認 JSX 只保留 render 結構與已整理的 mapping 存取。

## 3. Runtime contract preservation

- [x] 3.1 完成 “Preserve live metric bindings and fallback behavior during solar visual migration” 並對應 ### Preserve buildSolarViewModel as the runtime data boundary while replacing emoji icons，讓 `buildSolarViewModel()` 維持 live metrics/fallback 判斷責任，同時改用 `iconKey` 或等價 asset identifier 供 flow/KPI icon 查找；驗證方式為 code review，確認 `useLiveMetrics()`、fallback value/helper 與 socket contract 未被搬回 JSX 或改 shape。
- [x] 3.2 完成 `/solar` 最終驗證，確認 generated PNG icon、hero asset、mock shell metadata、flow diagram 與 KPI row 都已生效，且斷線或缺值情境下仍維持完整 FHD composition；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工檢查 fallback 情境沒有空卡片、缺節點或錯位 connector。
