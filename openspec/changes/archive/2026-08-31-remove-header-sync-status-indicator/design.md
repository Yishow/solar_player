## Context

展示看板前台 Header 移除了技術性的同步狀態標籤；同時後台 `/settings/device-status` 面板存在 Title 與 Card 空間重疊（`top: 28px` 與 `top: 64px` 互相遮壓）以及若新增 Card 會導致垂直破版的問題。為滿足方案 A 與排版修復（1+2+3），需全面重構 `DeviceStatus` 佈局並在裝置資訊中整合時間同步指標。

## Goals / Non-Goals

**Goals:**
- 前台展示 Header 移除 `· {appTime.stateLabel}` 狀態文字與其樣式。
- 後台 `DeviceStatus` 面板對齊全站 Management 規範（`top: 118px`），徹底消除 Card 壓到 Title 的問題。
- 中間面板（`ds-info`）高度設為 570px 並啟用 `overflow-y: auto`，防止內容溢出破版。
- 在 `DeviceStatus` 的「裝置資訊」中呈現動態跳動的「伺服器權威時間」與「時間同步狀態」彩色燈號。

**Non-Goals:**
- 不增加左側狀態卡片數量，維持 3 張卡片避免破版。
- 不更動後端 `server:time` 協議。

## Decisions

### 移除 AppHeader 中的同步狀態字樣與樣式

- **決策**：在 `AppHeader.tsx` 的 `ClockArea` 中移除包含 `appTime.stateLabel` 的元素與 `stateTone`。
- **理由**：展示大螢幕應給訪客純粹簡潔的觀看體驗。

### 對齊 DeviceStatus 全站頂部標準與佈局重構

- **決策**：在 `layout.ts` 中將 `side`、`info`、`photo` 的起始位置調整為 `118px`，與 `title`（`top: 28px`）保持 30px 呼吸距離；調整 `resource`（`top: 366px`）、`network`（`top: 626px`）、`actions`（`top: 708px`）與 `feedback`（`top: 778px`）。
- **理由**：與全站 `--mgmt-page-surface-top` 一致，杜絕 Card 壓到 Title。

### 在裝置資訊整合伺服器時間與同步狀態（方案 A）

- **決策**：在 `viewModel.ts` 中新增 `appTime` 格式化邏輯，於 `systemRows` 開頭注入「伺服器時間」與「時間同步狀態」，並由 `DeviceStatusContent.tsx` 渲染狀態燈號。
- **理由**：維運人員可在最顯眼的裝置資訊列表即時掌握校時與 Socket 同步狀況，完全不增加左側卡片高度負擔。

## Implementation Contract

- **可觀察行為**：
  - 前台展示頁面 Header 不再出現 `· 已同步` 或 `· 等待同步`。
  - 後台 `/settings/device-status` 的標題「裝置狀態」與下方卡片有完整 30px 空隙，無任何文字或圖層遮壓。
  - 「裝置資訊」清單首兩列為即時更新的「伺服器時間」與帶有燈號的「時間同步狀態」。
  - 中間面板在內容超長時可平滑垂直滾動，整體版面絕不破版。
- **驗收條件**：
  - `apps/web/src/pages/DeviceStatus/layout.test.ts`、`viewModel.test.ts` 與 `DeviceStatusContent.test.tsx` 通過。
  - `pnpm --filter @solar-display/web test` 通過。

## Risks / Trade-offs

- **[風險] `useAppTime` 每秒更新可能引發整體 DeviceStatus 重繪** → [緩解] `systemRows` 的時間僅格式化目前秒數，`DeviceStatusContent` 結構穩定且輕量，無不必要重新計算。
