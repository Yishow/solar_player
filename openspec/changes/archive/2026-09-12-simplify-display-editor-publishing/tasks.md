## 1. 前端展示編輯器發布互動簡化

- [x] 1.1 實作「1. 檢查並發布時自動儲存未存草稿」機制，確保 Editor check and publish action automatically persists pending draft changes：在 `DisplayPagesEditor/index.tsx` 與 `EditorToolbar.tsx` 中，當 `dirty === true` 時點擊「檢查並發布」自動先呼叫 `handleSave()` 儲存草稿，成功後開啟發布抽屜進行預檢，工具列按鈕不再因 `dirty` 反灰；以單元測試 `EditorToolbar.test.tsx` 驗證按鈕可用性與點擊行為。
- [x] 1.2 修正抽屜與預檢的未儲存狀態連鎖，確保儲存後立即清除 `UNSAVED_BINDINGS`；以單元測試或 Playwright 流程驗證使用者修改卡片後直接點擊檢查並發布不會出現未儲存阻擋。

## 2. 後端發布預檢與廠區用電解耦

- [x] 2.1 實作「2. Overview 頁面與廠區用電門禁解耦」，確保 Overview display page publication is decoupled from site energy preflight：在 `displayPagePublishingService.ts` 中將 `ENERGY_PUBLISH_PAGES` 限縮為 `factory-circuit` 與 `factory-circuit-guanyin`，讓 `overview` 發布預檢不再檢查 `readProfileReadiness`，避免因電錶讀值超時（`STALE_BOUNDARY`）阻擋發布；以 `display-pages.test.ts` 驗證 Overview 在無用電資料下可順利發布。
- [x] 2.2 更新關聯測試以符合解耦契約：更新 `site-energy-readiness-publishing.test.ts`，將用電門禁測試目標由 `overview` 調整為真正的迴路頁面（`factory-circuit`），確保迴路用電檢查契約不受影響；以 `pnpm --filter @solar-display/server test` 驗證全數通過。

## 3. 系統端到端驗證

- [x] 3.1 執行端到端 Playwright 驗證：在展示編輯器中隱藏卡片並直接點擊「檢查並發布」，驗證自動存檔、抽屜展示「沒有阻擋問題」、確認發布成功；以 Playwright 截圖與流程記錄驗證。
- [x] 3.2 執行全專案 `pnpm verify` 檢查，確認前端、後端、部署與 HTML 契約 100% 通過。
