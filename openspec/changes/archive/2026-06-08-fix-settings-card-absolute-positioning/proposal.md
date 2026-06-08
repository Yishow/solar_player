## Why

因為 `.mgmt-interactive-card` 在 `management.css` 中被定義在 `.settings-card` 之後，其 `position: relative` 屬性覆蓋了 `.settings-card` 的 `position: absolute`。這導致所有同時套用這兩個類別的卡片（如 `MqttSettings` 的三張卡片，以及 `ImageManagement` 的兩張卡片）都從絕對定位變成了相對定位，從而在頁面中發生垂直堆疊或高度錯亂，無法正確進行水平並排對齊。

## What Changes

- **修正 position 衝突**：在 `management.css` 中明確加上 `.settings-card.mgmt-interactive-card { position: absolute; }` 的特異性重寫，確保設定卡片在具有 hover 互動效果的同時，依然維持 `absolute` 定位，從而在畫布中正確對齊。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/styles/management.css
