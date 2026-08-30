## 1. 前台展示 Header 調整

- [x] 1.1 移除 AppHeader 中的同步狀態字樣與樣式，使展示 Header 在 Broadcast an ordered Server Time Signal 下僅渲染乾淨的時間、日期與星期，不再向訪客展示 `appTime.stateLabel` 狀態標籤。驗證目標：檢查 `apps/web/src/components/AppHeader.tsx` 的 `ClockArea` 輸出不含狀態點與同步文字。

## 2. 前台測試更新

- [x] 2.1 保留 useAppTime 底層時間計算與後台診斷能力，並更新 AppHeader 單元測試以反映無同步狀態標籤的時鐘渲染。驗證目標：執行 `pnpm --filter @solar-display/web test`，確保 `apps/web/src/components/AppHeader.test.ts` 驗證時間格式正常且不再斷言「已同步」或「等待同步」文字。

## 3. 後台 DeviceStatus 排版修復與時間同步整合（1+2+3）

- [x] 3.1 對齊 DeviceStatus 全站頂部標準與佈局重構，將主內容區 `top` 調整為 `118px` 消除 Card 壓到 Title 的問題，並在 `device.css` 為 `.ds-info` 加入 `overflow-y: auto` 避免破版。驗證目標：檢查 `apps/web/src/pages/DeviceStatus/layout.ts` 與 `layout.test.ts`。
- [x] 3.2 在裝置資訊整合伺服器時間與同步狀態（方案 A），在 Present device status as a summary-first observability dashboard 下於「裝置資訊」定義清單中呈現動態跳動的「伺服器權威時間」與「時間同步狀態」燈號。驗證目標：檢查 `apps/web/src/pages/DeviceStatus/viewModel.ts`、`DeviceStatusContent.tsx` 與 `index.tsx`。
- [x] 3.3 更新 DeviceStatus 相關單元測試並執行完整驗證。驗證目標：執行 `pnpm --filter @solar-display/web test` 確保前端測試全數綠燈通過。

## 4. 頂部操作按鈕整合與中間面板全面繁中化

- [x] 4.1 將 3 個按鈕（更新狀態診斷、匯出診斷摘要、離開系統）移至頂部 Title 右側（top: 32px），與標題完美水平呼應。驗證目標：檢查 `layout.ts`、`device.css` 與 `DeviceStatusContent.tsx`。
- [x] 4.2 全面繁中化中間面板（`ds-info`）內所有區塊標題、Hero 卡片、警示分流、心跳監控、日誌記錄與裝置規格。驗證目標：檢查 `viewModel.ts`、`viewModel.test.ts` 與 `DeviceStatusContent.test.tsx`。
- [x] 4.3 執行完整單元測試與 build 驗收。驗證目標：執行 `pnpm --filter @solar-display/web test` 與 build 全數通過。
