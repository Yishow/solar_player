## Why

為了解決中廊大螢幕展示系統（由 Raspberry Pi 5 驅動之自動播放無人值守看板）中，現有 Playback Footer 左右兩側之手繪感裝飾物（迷你葉子與搖擺樹枝）在大螢幕遠距離觀看下顯得不夠精緻與專業之問題。

## What Changes

- 將 Playback 模式下 Footer 左側之迷你葉子 (`LeafOrnament`) 替換為以極簡幾何切面構成的「幾何折線太陽」圖章。
- 將 Playback 模式下 Footer 右側之搖擺樹枝 (`FooterBranch`) 替換為一條帶有動態發光粒子滑過的「能量脈衝線 (Energy Pulse)」。
- 優化導航圖標：加粗 Playback Footer 導航圖標線條，且在 Active 時變為亮綠色與金色底線，並具備優雅的呼吸燈式明暗（發光）明滅變化。
- 所有的視覺美化優化僅在 Playback 模式下生效，不影響 Management 模式的簡潔配置。

## Non-Goals (optional)

- 不改變任何路由跳轉邏輯、選單文字與巡迴輪播邏輯。
- 不調整 `tokens.test.ts` 中受限的設計變數（高度維持 72px、不使用 `backdrop-filter`、不對 footer 使用 `::before`、漸層頂邊線寬度維持 90%）。

## Capabilities

### New Capabilities

- `display-playback-footer-refinement-pulse`: 定義 Playback 播放頁面 Footer 的極簡幾何太陽圖章、能量脈衝線裝飾物、圖標加粗與呼吸燈明滅變化。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-playback-footer-refinement-pulse`
- Affected code:
  - Modified:
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/styles/global.css`
