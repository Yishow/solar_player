## Why

將 MQTT 設定頁面的 Topic 工作區卡片封裝為獨立元件，以提升可維護性與可讀性；同時修正卡片在 Hover 上移時因硬體加速導致的文字模糊問題，以及因外層容器裁剪或疊層順序導致卡片陰影和位移被遮擋的問題。

## What Changes

- **元件抽離**：將卡片內容從 `MqttSettingsContent.tsx` 提取至獨立的 `TopicWorkspaceRow.tsx` 元件。
- **全域樣式抽離**：將卡片的 hover 位移、漸變與陰影特效抽離為 `.mgmt-interactive-card` 全域/共用類別，便於未來在其他頁面推廣。
- **修正文字模糊**：使用 `transform: translate3d(0, -2px, 0)` 並搭配 `backface-visibility: hidden;` 與 `will-change: transform`，修正 hover 時的文字抖動與模糊。
- **修正邊界裁剪與遮擋**：
  - 在卡片 hover 時提升 `z-index: 2`（相較於預設的 `z-index: 1`），避免被下方卡片遮蓋。
  - 為 `topic-workspace-list` 容器提供適當的橫向與縱向 `padding`（呼吸空間），確保 `overflow-y: auto` 滾動條不會截斷 hover 狀態的陰影。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - New:
    - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
  - Modified:
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/MqttSettings/mqttSettings.css
