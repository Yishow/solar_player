## Why

目前 Solar Player 的 `/device-pairing` 裝置配對頁面由後端 Fastify 直接以字串拼裝輸出無 CSS 樣式的原始 HTML，缺乏現代化視覺體驗與狀態回饋，且與前端 React SPA 架構脫節。將裝置配對收斂為前端專屬獨立頁面，能提供美觀、專業、現代化的極簡配對流程，使展示端開機設置更加流暢直覺。

## What Changes

- 在前端（`apps/web`）新增 `/device-pairing` 獨立頁面，具備美觀現代的視覺層次、品牌標誌、狀態提示與流暢動效。
- 簡化配對流程：不需要輸入管理密碼，支援由網址 Fragment（`#token=...`）自動讀取兌換，亦支援手動貼上 Token。
- 安全防護：於瀏覽器端讀取 Fragment 後立即抹除網址列 Token，防止洩漏；透過既有 `/api/device-pairing/exchange` 交換 HttpOnly Cookie。
- 狀態感知：載入時自動檢查 `/api/device-pairing/status`，若裝置已配對則清楚提示並提供快速導向播放頁按鈕；兌換失敗時提供在地化錯誤說明與重試按鈕。
- 後端 Fastify 移除原生 raw HTML 渲染路由，將 `/device-pairing` 完全交由前端 SPA 接管，保留既有 API 與安全邊界。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `secure-device-pairing`: 將原本由後端直接輸出的純 HTML 落地頁，升級為前端 React SPA 獨立頁面，維持 Fragment 隱密性、HttpOnly Cookie 與自動導向 `/overview` 的安全契約。

## Impact

- Affected specs: `secure-device-pairing`
- Affected code:
  - New:
    - `apps/web/src/pages/DevicePairing/index.tsx`
    - `apps/web/src/pages/DevicePairing/viewModel.ts`
    - `apps/web/src/pages/DevicePairing/viewModel.test.ts`
    - `apps/web/src/pages/DevicePairing/index.test.tsx`
  - Modified:
    - `apps/web/src/app/router.tsx`
    - `apps/server/src/routes/device-pairing.ts`
    - `apps/server/src/routes/device-pairing.test.ts`
