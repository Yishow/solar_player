## Summary

從展示頁 Header 移除「· 已同步」等同步狀態字樣，使訪客僅見純淨時鐘；同時修復後台 `DeviceStatus` 頁面 Card 遮擋 Title 的版面問題，優化垂直佈局與滾動，並在「裝置資訊」中整合伺服器權威時間與同步狀態監控。

## Motivation

1. **訪客體驗**：展示頁大螢幕（Overview, Solar, FactoryCircuit, Sustainability, Images）不需向客人暴露通訊同步細節。
2. **後台維運與版面修復**：
   - 後台 `/settings/device-status` 現有佈局中，頂部 Title（`top: 28px`）被 `top: 64px` 的卡片直接遮壓；若在左側新增卡片更會導致垂直破版。
   - 依方案 A，將內容起始高度對齊全站標準 `top: 118px`，並在中間面板的「裝置資訊」定義清單中加入即時跳動的「伺服器權威時間」與「時間同步狀態」，使維運人員在後台即可清晰掌握校時與連線健康度。
   - 為中間面板啟用 `overflow-y: auto`，徹底防止內容溢出破版。

## Proposed Solution

1. **前台展示 Header 調整**：
   - 在 `apps/web/src/components/AppHeader.tsx` 移除 `· {appTime.stateLabel}` 狀態點及 `stateTone` 樣式。
2. **後台 DeviceStatus 排版修復與佈局優化**：
   - 在 `apps/web/src/pages/DeviceStatus/layout.ts` 將主內容區（`side`, `info`, `photo`）的 `top` 調整為 `118px`，對齊全站 `--mgmt-page-surface-top`，徹底解決壓到 Title 的問題。
   - 調整 `actions`（`top: 708px`）與 `feedback`（`top: 778px`）垂直位置，使 FHD 858px 畫布獲得均衡呼吸空間。
   - 在 `apps/web/src/pages/DeviceStatus/device.css` 為 `.ds-info` 開啟 `overflow-y: auto` 與 `scrollbar-gutter: stable`。
3. **後台 DeviceStatus 整合時間同步監控（方案 A）**：
   - 在 `apps/web/src/pages/DeviceStatus/viewModel.ts` 與 `DeviceStatusContent.tsx` 中整合 `useAppTime`，於「裝置資訊」清單最上方加入「伺服器權威時間」與「時間同步狀態」監控項目，並支援狀態燈號色調。

## Non-Goals

- 不修改後端 `server:time` 廣播協議。
- 不增加左側卡片數量，避免擠壓底部操作列。

## Impact

- Affected specs:
  - `server-authoritative-app-time`
  - `device-status-observability-surface`
- Affected code:
  - Modified:
    - `apps/web/src/components/AppHeader.tsx`
    - `apps/web/src/components/AppHeader.test.ts`
    - `apps/web/src/pages/DeviceStatus/layout.ts`
    - `apps/web/src/pages/DeviceStatus/layout.test.ts`
    - `apps/web/src/pages/DeviceStatus/device.css`
    - `apps/web/src/pages/DeviceStatus/viewModel.ts`
    - `apps/web/src/pages/DeviceStatus/viewModel.test.ts`
    - `apps/web/src/pages/DeviceStatus/index.tsx`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx`
    - `apps/web/src/pages/DeviceStatus/DeviceStatusContent.test.tsx`
