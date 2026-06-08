## Why

實作上一輪優化後的兩項改善建議：
1. 將互動卡片的視覺屬性（漸變背景、邊框色、陰影等）代碼化為 tokens。
2. 為新抽離的 `TopicWorkspaceRow.tsx` 元件補上獨立的單元測試 `TopicWorkspaceRow.test.ts`。

## What Changes

- **Token 代碼化**：在 `tokens.css` 中宣告 `--mgmt-card-*` 變數群，並在 `management.css` 裡使 `.mgmt-interactive-card` 套用這些變數。
- **元件測試**：建立 `TopicWorkspaceRow.test.ts`，測試元件在正常狀態下以及包含 coverage 資料時的渲染正確性。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - New:
    - apps/web/src/pages/MqttSettings/TopicWorkspaceRow.test.ts
  - Modified:
    - apps/web/src/styles/tokens.css
    - apps/web/src/styles/management.css
