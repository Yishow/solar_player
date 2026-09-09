## Context

目前系統的裝置配對（Device Pairing）是透過在展示機或瀏覽器開啟 `/device-pairing#token=<token>` 完成一次性憑證交換。然而目前的 `/device-pairing` 路由由後端 Fastify （`apps/server/src/routes/device-pairing.ts`）直接輸出無 CSS 樣式的 raw HTML 字串，樣式極簡且無狀態動畫或友善錯誤引導。

使用者期望在不增加流程複雜度（不需要額外輸入管理密碼，簡單流暢）的前提下，將配對功能重構為美觀、專業、現代化的獨立前端頁面，提供清楚的狀態反饋、錯誤處理與流暢跳轉體驗。

## Goals / Non-Goals

**Goals:**

- 在前端 React SPA（`apps/web`）建立專屬的獨立配對頁面 `/device-pairing`。
- 視覺風格專業現代：具備高品質卡片佈局、Solar Player 品牌識別、細緻微互動與清晰的狀態視覺反饋（載入中、成功、失敗）。
- 支援極簡流暢的配對體驗：不需要管理密碼；點擊後台發行的 Fragment 連結（`#token=...`）自動抹除網址列並完成兌換；亦支援手動貼上 Token 兌換。
- 完整維持現行安全邊界：URL Fragment 立即抹除、HttpOnly Cookie 存儲、HTTPS/loopback 檢查、單次使用防護。
- 狀態自我感知：若裝置早已配對完成，直接提示已配對狀態與裝置代號，並提供一鍵前往 `/overview`。

**Non-Goals:**

- 不修改後端 `/api/device-pairing/exchange` 與 `/api/device-pairing/status` 的 API 契約與 Cookie 安全設定。
- 不引入管理密碼閘（Management Password Gate）或管理者身分檢查；配對頁面面向薄型展示機，僅以 Pairing Token 作為授權憑據。
- 不更動 Token 的 15 分鐘效期、SHA-256 雜湊存儲或 Device Fleet 發行邏輯。

## Decisions

### 前端獨立頁面架構與狀態機封裝

- **決策**：在 `apps/web/src/pages/DevicePairing/` 建立專屬頁面元件，並以獨立的 `viewModel.ts` 封裝狀態機（State Machine）。
- **理由**：配對頁面不隸屬於展示頁面輪播（`LayoutShell`），也不隸屬於受密碼保護的管理後台（`ManagementShell`）。它屬於獨立的 Setup / Landing 頁面。將業務邏輯（Token 檢查、狀態輪詢、API 請求、倒數計時）與視覺元件分離，便於編寫高覆蓋率的單元測試。
- **替代方案**：掛載於 `ManagementShell` 下。否決原因：展示機通常未登入管理端，掛在管理外殼會觸發管理密碼鎖定或未授權重導向。

### 網址 Fragment 立即抹除與防洩漏機制

- **決策**：當頁面掛載時，第一時間自 `window.location.hash` 解析 `token` 參數，解析後立即呼叫 `window.history.replaceState(null, "", window.location.pathname)` 清除 Fragment。
- **理由**：延續 `secure-device-pairing` 規範之安全承諾。Fragment 不會透過 HTTP 送給伺服器，但留在瀏覽器網址列可能遭螢幕翻拍或誤複製。立即抹除可防止重整時二次觸發 409 Token 已使用錯誤。
- **替代方案**：使用 Query Parameter（`?token=...`）。否決原因：Query Parameter 會出現在伺服器 Access Log 與 Referer Header 中，違反安全隱私原則。

### 移除後端原生 HTML 渲染並保留 API 契約

- **決策**：自 `apps/server/src/routes/device-pairing.ts` 移除 `app.get("/device-pairing", ...)` 的 raw HTML 實作，讓所有非 API 請求自然 fallback 至前端 SPA 的 `index.html`，由 React Router 接管 `/device-pairing`。
- **理由**：單一事實來源原則。避免前後端各自維護一份 HTML 樣板，並確保生產環境（Fastify 靜態託管）與開發環境（Vite Dev Server）行為一致。所有既有的後端測試同步更新為驗證 API 契約。
- **替代方案**：在 Fastify 中美化 inline HTML 字串。否決原因：字串拼裝無法享受 Tailwind CSS、React 元件生態系與現代構建工具的檢查能力，維護成本高。

### 簡約現代化 UI 視覺層次與觸控支援

- **決策**：採用深色/質感幾何卡片設計，包含品牌 Logo、大尺寸易觸控按鈕、密碼式遮罩輸入框、平滑載入動畫，以及成功配對時 1.5 秒自動平滑導向 `/overview` 的進度提示。
- **理由**：展示端可能為 1080p FHD 螢幕、觸控螢幕或一般維運筆電，高對比與適度放大的表單元件能確保在遠距離或觸控環境下皆清晰易用。

## Implementation Contract

- **Behavior**:
  - 使用者訪問 `/device-pairing#token=xyz`：網址列立刻變為 `/device-pairing`，畫面顯示「正在驗證裝置憑證...」，自動呼叫兌換，成功後顯示綠色勾選與成功提示，1.5 秒後跳轉至 `/overview`。
  - 使用者訪問 `/device-pairing`（無 Token）：檢查配對狀態。若未配對，顯示現代化輸入介面，提示「請輸入一次性配對 Token」，使用者貼上 Token 後點選「開始配對」即進行兌換。若已配對，顯示「此裝置已完成配對」與 Device Client ID，並提供「進入總覽頁」與「更換配對」按鈕。
  - 兌換失敗：停留在輸入介面，顯示在地化錯誤提示（如 Token 已過期、已使用或無效），並自動重設輸入焦點以供重新輸入。
- **Interface / data shape**:
  - 前端路由：`apps/web/src/app/router.tsx` 註冊 `/device-pairing`。
  - 後端 API：`POST /api/device-pairing/exchange` 接收 `{ token: string }`，成功回傳 204 並設置 `solar_device_credential` HttpOnly Cookie。
  - 後端 API：`GET /api/device-pairing/status` 回傳 `{ success: boolean, data: { paired: boolean, deviceId?: number, clientId?: string } }`。
- **Failure modes**:
  - Token 無效或已過期：顯示在地化錯誤訊息，允許手動重新貼上新 Token。
  - 網路錯誤或伺服器無法連線：顯示「伺服器連線失敗，請檢查網路狀態」提示。
- **Acceptance criteria**:
  - 前端單元測試覆蓋 `DevicePairing` 狀態機所有分支（已配對導向、Fragment 自動兌換、手動輸入兌換、錯誤在地化處理）。
  - 後端單元測試確認移除 raw HTML 後，API `/api/device-pairing/exchange` 與 `/api/device-pairing/status` 行為依舊完整通過。
  - 執行 pnpm test 與 pnpm verify 全數通過。
- **Scope boundaries**:
  - In scope: 前端配對頁面開發、狀態機邏輯、後端 raw HTML 路由移除與 SPA 路由對齊。
  - Out of scope: 修改配對 Token 生成機制、更動 Device Fleet 後台介面、引進管理密碼驗證。

## Risks / Trade-offs

- [Risk: SPA 資源載入延遲可能使未配對 Kiosk 啟動初期出現空白畫面] → Mitigation: 保持 `DevicePairing` 元件輕量化，不載入重型圖表與播放器引擎；骨架畫面即時渲染。
- [Risk: 舊版腳本或測試若假設 GET /device-pairing 返回純文字 HTML 可能會受到影響] → Mitigation: 檢查後端測試，確認所有部署腳本（如 `deploy/`）皆只依賴 API 呼叫而非 raw HTML 內容。
