## Why

將全站設定/管理頁面中的 `settings-card` 升級為高質感的 `.mgmt-interactive-card`，以提供全站一致的立體 hover 位移、漸變與陰影特效，修正傳統卡片無互動回饋或文字模糊的視覺體驗缺陷。

## What Changes

- **卡片互動升級**：在全站四個主要設定/管理介面的所有 `<section className="settings-card ...">` 加上 `mgmt-interactive-card` class。
- **清除局部重複 hover CSS**：移除或重構局部 CSS 檔案中（如 `playbackSettings.css`）多餘且陽春的 settings-card hover 規則，完全交由全域的 `.mgmt-interactive-card` 來處理卡片的外觀與動效。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/pages/MqttSettings/MqttSettingsContent.tsx
    - apps/web/src/pages/CircuitSettings/CircuitSettingsContent.tsx
    - apps/web/src/pages/ImageManagement/ImageManagementContent.tsx
    - apps/web/src/pages/PlaybackSettings/PlaybackSettingsFormSections.tsx
    - apps/web/src/pages/PlaybackSettings/playbackSettings.css
