## Why

Overview、Solar 與 Factory Circuit 現在仍大量依賴 page-local fallback、硬編碼 metric key 與 heuristic slot mapping，讓展示頁內容雖然能顯示，但難以對資料來源、告警狀態與故事語意建立一致模型。若不把這三頁的語意層補起來，editor 與 settings 再怎麼補強，最終仍會落回脆弱的硬編碼展示。

## What Changes

- 為 Overview 建立可配置的 KPI metric binding、摘要狀態與告警層，讓總覽不再只是一組固定卡片。
- 為 Solar 建立 flow state、目標對比與發電情境語意，使 flow node 與 KPI 能反映實際運行狀態，而不只是靜態文案。
- 為 Factory Circuit 建立明確 slot binding、異常原因與 row 顯示策略，取代目前依 icon 與名稱推測的資料對應方式。
- 建立這三頁共用的 monitoring story model，讓資料 freshness、alert tone、fallback 與 story block 可用一致契約驅動。

## Capabilities

### New Capabilities

- `overview-story-metric-binding`: 提供 Overview 的 KPI 綁定、摘要狀態與告警層能力。
- `solar-flow-state-storytelling`: 提供 Solar 的 flow state、目標對比與運行情境敘事能力。
- `factory-circuit-slot-binding-and-alerts`: 提供 Factory Circuit 的 slot binding、異常原因與 row 顯示策略能力。
- `display-monitoring-story-model`: 提供上述展示頁共用的資料 freshness、alert tone 與 fallback 敘事模型。

### Modified Capabilities

(none)

## Impact

- Affected specs: `overview-story-metric-binding`, `solar-flow-state-storytelling`, `factory-circuit-slot-binding-and-alerts`, `display-monitoring-story-model`
- Affected code:
  - Modified: `apps/web/src/pages/Overview/viewModel.ts`, `apps/web/src/pages/Solar/viewModel.ts`, `apps/web/src/pages/FactoryCircuit/viewModel.ts`, `apps/web/src/pages/Overview/displayPageConfig.ts`, `apps/web/src/pages/Solar/displayPageConfig.ts`, `apps/web/src/pages/FactoryCircuit/displayPageConfig.ts`, `apps/web/src/services/socket.ts`, `packages/shared/src/types.ts`
  - New: `packages/shared/src/displayStory.ts`, `apps/server/src/services/displayStoryService.ts`, `apps/server/src/routes/display-story.ts`
  - Removed: none
