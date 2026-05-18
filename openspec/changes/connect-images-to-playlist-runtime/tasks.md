## 1. Playlist runtime adapter

- [x] 1.1 實作 `Drive Images playback from ordered playlist runtime entries`：在 `apps/web/src/services/api.ts` 與 `apps/web/src/pages/Images/` 建立 `/api/image-playlist` 的讀取與 route adapter。
- [x] 1.2 實作 `Resolve Images metadata panels from the active playlist entry`，並依 `Treat Images as a playlist runtime, not a mock gallery` 將 main stage、counter、info panel 與 thumbnails 改為消費 ordered playlist entries 與 active entry，不再只依賴 `imageMocks`。

## 2. Fallback behavior

- [x] 2.1 實作 `Apply playlist fallback behavior in the playback route`，並依 `Keep playlist fallback modes visible in the playback surface` 將 `display-placeholder`、`skip`、`use-cover` 等 playlist fallback mode 反映到播放畫面行為。
- [x] 2.2 依 `Preserve layout config as presentation-only state` 保留既有 display page config 與 FHD 幾何，確認這次 change 只替換 runtime data source。

## 3. Verification

- [x] 3.1 補齊 `apps/web/src/pages/Images/viewModel.test.ts` 與相關 render tests，覆蓋 ready、pending、missing、skip、use-cover 與 empty playlist 情境。
- [x] 3.2 執行 `pnpm --filter @solar-display/web test -- src/pages/Images/viewModel.test.ts src/pages/Images/configRender.test.ts` 與 `pnpm --filter @solar-display/web build`。
