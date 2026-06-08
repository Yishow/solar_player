## Why

在之前的定位修復中，我們在全域 CSS `management.css` 中加入了 `.settings-card.mgmt-interactive-card { position: absolute; }` 來確保設定卡片具有 Hover 特效時依然保持絕對定位。然而，這覆蓋了 `PlaybackSettings` 中的特異性重寫，導致其底部放在 Grid 中的四張卡片被迫變成了 `absolute` 定位，脫離了 Grid 流而全部重疊在一起。

## What Changes

- **提高 Playback 卡片 relative 定位特異性**：在 `playbackSettings.css` 中，將原本的定位規則從 `.playback-settings-page .settings-card` 提升為 `.playback-settings-page .settings-card.mgmt-interactive-card { position: relative; }`。這在特異性上贏過了全域的 `.settings-card.mgmt-interactive-card`，使得 Playback 的底部四張卡片正確以 `relative` 排版，融入 Grid 不再重疊。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
