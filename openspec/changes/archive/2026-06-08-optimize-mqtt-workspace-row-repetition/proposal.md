## Why

優化 `TopicWorkspaceRow.tsx` 卡片元件中的程式碼重複問題，包括消除重複的屬性輸入框結構，以及移除 JSX 中手動硬編碼的重複間隔點（Divider span），改以 CSS 偽元素實現。

## What Changes

- **輸入框重構**：在 `TopicWorkspaceRow.tsx` 中封裝 `renderInputGroup` 輔助函數，統一口屬性輸入框（Topic / Unit）的渲染邏輯與 onChange 處理。
- **隔開點 CSS 化**：移除 JSX 裡重複編寫的 `<span className="meta-divider">•</span>`，在 `mqttSettings.css` 的 `.topic-workspace-row__meta` 中引入 `span + span::before` 的 CSS 偽元素，以自動渲染間隔點。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.tsx
    - apps/web/src/pages/MqttSettings/mqttSettings.css
