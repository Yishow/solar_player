## Why

為了解決中廊大螢幕展示系統（由 Raspberry Pi 5 驅動之自動播放無人值守看板）中，現有 Playback Footer 左右兩側之手繪感裝飾物（迷你葉子與搖擺樹枝）在大螢幕遠距離觀看下顯得不夠精緻與專業之問題。

## What Changes

- 將 Playback 模式下 Footer 左側之迷你葉子 (`LeafOrnament`) 替換為以緩慢旋轉幾何刻度環與發光 LIVE 狀態燈構成的「太陽能發電核心」幾何儀表。
- 將 Playback 模式下 Footer 右側之搖擺樹枝 (`FooterBranch`) 替換為一組微幅波動的幾何「動態數據波線 (Data Wave)」與運作狀態字樣（例如 `SYS ACTIVE // RPI-5`）。
- 優化導航圖標：加粗 Playback Footer 導航圖標線條，並為 Active 項目之圖標與文字加上亮綠與金色的雙色調搭配，以及微弱的霓虹發光 (Glow) 效果。
- 所有的視覺美化優化僅在 Playback 模式下生效，不影響 Management 模式的簡潔配置。

## Non-Goals (optional)

- 不改變任何路由跳轉邏輯、選單文字與巡迴輪播邏輯。
- 不調整 `tokens.test.ts` 中受限的設計變數（高度維持 72px、不使用 `backdrop-filter`、不對 footer 使用 `::before`、漸層頂邊線寬度維持 90%）。

## Capabilities

### New Capabilities

- `display-playback-footer-refinement`: 定義 Playback 播放頁面 Footer 的科技儀表視覺裝飾物、圖標加粗、雙色調亮色及呼吸發光動態。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-playback-footer-refinement`
- Affected code:
  - Modified:
    - `apps/web/src/components/AppFooterNav.tsx`
    - `apps/web/src/styles/global.css`
