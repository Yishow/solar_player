## 1. Layout and asset foundation for display routes

- [x] 1.1 完成 “Align display surface page bodies to reference compositions through page-local layout constants and asset mapping” 並對應 ### Use page-local layout modules for every in-scope display route，為 `/overview`、`/solar`、`/images`、`/trends`、`/history`、`/slideshow-preview`、`/device-status` 建立或更新 page-local layout constants 與 asset mapping；驗證方式為 code review，確認各頁 major region geometry 與 asset keys 不散落在 JSX literal。
- [x] 1.2 完成 “Preserve existing route-level data hooks, view-models, and fallback contracts during display page migration” 並對應 ### Preserve view-model boundaries and only add display-facing fields when needed，讓各頁只在 view-model 增加 display-facing fields 而不改 service/backend contract；驗證方式為 code review，確認 hook、viewModel 與 fallback 邊界仍存在。

## 2. Hero, media, and flow display pages

- [x] 2.1 完成 “Migrate the declared display surface routes onto the shared playback canvas shell” 的 hero/media/flow family，讓 `/overview`、`/solar`、`/images` 改用 shared playback canvas shell 與對應 reference composition；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `01-overview.html`、`02-solar.html`、`04-images.html` 檢查 hero、flow、media staging 已脫離 dashboard title block。
- [x] 2.2 完成上述三頁的 asset/fallback 驗證，確認 generated assets、mock assets 或 fallback presentation 都透過 page-local mapping 生效，且不新增 API；驗證方式為人工檢查缺資產情境與 code review。

## 3. Dense chart and data display pages

- [x] 3.1 完成 ### Group display routes by visual composition family inside one change without touching settings pages 的 chart/data family，讓 `/trends` 與 `/history` 改用 shared playback canvas shell 與對應 reference chart/table hierarchy；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `06-energy-trend-summary.html` 與 `11-energy-data-history.html` 檢查 chart/data staging。
- [x] 3.2 完成 `/trends` 與 `/history` 的 mock/live/fallback 保留驗證，確認 range tabs、chart lines、summary rows、history table 仍沿用既有 view-model contract；驗證方式為 code review 與人工檢查無資料時版面不破。

## 4. Status and preview display pages

- [x] 4.1 完成 status/preview family 遷移，讓 `/slideshow-preview` 與 `/device-status` 改用 shared playback canvas shell 與對應 reference composition；驗證方式為執行 `pnpm --filter @solar-display/web build`，並人工對照 `13-slideshow-preview.html` 與 `14-device-status-details.html` 檢查 preview stage、resource panels、summary bands。
- [x] 4.2 完成 `/slideshow-preview` 與 `/device-status` 的 runtime contract 保留驗證，確認 playback controller state、device status fetch、action feedback 與 fallback rows 未被 view migration 破壞；驗證方式為 code review 與人工 smoke check。

## 5. Batch verification and scope guard

- [x] 5.1 完成 display surface batch 驗證，確認七條 in-scope routes 已接上 shared playback shell，且 settings pages 不在本 change scope；驗證方式為執行 `pnpm --filter @solar-display/web build`，並內容 review `docs/reference-match/all-pages-audit.md` 與 change artifacts 的 route 清單。
- [x] 5.2 完成 narrow-scope 收尾，確認本 change 沒有聲稱完成 settings-form alignment、backend contract changes 或 shared shell host foundation 重構；驗證方式為 `spectra analyze align-reference-display-surface-pages --json` 與 artifact review。
