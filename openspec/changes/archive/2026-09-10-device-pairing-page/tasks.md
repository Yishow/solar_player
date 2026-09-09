## 1. 後端路由收斂與 API 契約驗證

- [x] 1.1 依設計決策「移除後端原生 HTML 渲染並保留 API 契約」與規範「Issue short-lived single-use Pairing Tokens」，於 `apps/server/src/routes/device-pairing.ts` 移除 `app.get("/device-pairing")` 的 raw HTML 渲染字串，使請求回歸 SPA 靜態託管處理，並保留 `/api/device-pairing/exchange` 與 `/api/device-pairing/status` 既有 API 契約。以更新後的 `apps/server/src/routes/device-pairing.test.ts` 執行測試驗證 API 行為維持不變。

## 2. 前端狀態機與安全機制實作

- [x] [P] 2.1 依設計決策「前端獨立頁面架構與狀態機封裝」與「網址 Fragment 立即抹除與防洩漏機制」，在 `apps/web/src/pages/DevicePairing/viewModel.ts` 實作配對狀態機邏輯：於掛載時讀取 `window.location.hash` 中的 Token 並立即透過 `history.replaceState` 抹除網址列，支援無 Fragment 時查詢 `/api/device-pairing/status`，並提供無管理密碼的手動貼上 Token 兌換與在地化錯誤碼轉換。在 `apps/web/src/pages/DevicePairing/viewModel.test.ts` 撰寫測試驗證所有狀態轉移。

## 3. 前端現代化配對頁面與路由整合

- [x] 3.1 依設計決策「簡約現代化 UI 視覺層次與觸控支援」，在 `apps/web/src/pages/DevicePairing/index.tsx` 實作獨立美觀的現代化配對介面，包含品牌識別、大尺寸易觸控輸入框、兌換進度動畫、以及配對成功後 1.5 秒自動導向 `/overview` 的倒數提示。在 `apps/web/src/pages/DevicePairing/index.test.tsx` 撰寫元件測試驗證已配對、手動輸入與錯誤狀態之 DOM 結構與操作流程。
- [x] 3.2 在 `apps/web/src/app/router.tsx` 註冊獨立路由 `/device-pairing`，確保配對流程獨立於管理密碼閘之外；並執行 `pnpm --filter @solar-display/web test` 與全域型別檢查確保前端整合通過。

## 4. 裝置管理與播放策略版本重構治理

- [x] 4.1 全面正名「車隊」為「裝置管理」（Device Management），徹底移除「50 台」限制文案、固定容量暗示與硬編碼邊界。
- [x] 4.2 整合「播放策略版本」至「裝置管理」內部作為分頁（Sub-nav Tabs），支援 URL 查詢參數（`?tab=profiles`）雙向同步與外部受控模式（Controlled Mode）。
- [x] 4.3 升級 `FleetKpiBar` 為具備即時過濾互動卡片（在線正常、待配對、全部、群組錨點跳轉），並在表格上方呈現過濾狀態提示橫幅與空狀態重置操作。
- [x] 4.4 在 `DeviceTableSection` 實作心跳相對時間（Relative Time），並於 DOM 透過 `title` 保留完整 ISO 時間以相容既有單元測試契約。
- [x] 4.5 在 `ProfileListSidebar` 與 `PlaybackProfilesContent` 實作播放策略版本之影響力透視（Blast Radius），動態統計並顯示關聯群組與受影響機台數。
- [x] 4.6 全面套用專案 Design Tokens，將超長檔案解耦重構至單檔 `< 400 行` 標準，維持前後端測試 100% 通過與打包驗證無誤。

