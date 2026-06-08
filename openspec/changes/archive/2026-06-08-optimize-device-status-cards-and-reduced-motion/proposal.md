## Why

實作上一輪的兩項建議優化：
1. 擴展全域互動卡片 `.mgmt-interactive-card` 至 `DeviceStatusContent.tsx` 中的五個監控與資源卡片。
2. 在 `management.css` 中引入 `prefers-reduced-motion` 媒體查詢，以兼顧低效能裝置與動效偏好使用者的效能與 Accessibility。

## What Changes

- **裝置狀態卡片升級**：在 `DeviceStatusContent.tsx` 的五個 `mgmt-surface` 加上 `mgmt-interactive-card` class。
- **動效 Accessibility 優化**：在 `management.css` 中，為 `.mgmt-interactive-card` 卡片定義 `prefers-reduced-motion: reduce` 媒體查詢，停用 hover 物理位移與平滑 transition。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
    - apps/web/src/styles/management.css
