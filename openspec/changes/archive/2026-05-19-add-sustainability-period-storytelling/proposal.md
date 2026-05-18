## Why

Sustainability 頁目前主要是單一時間點的大數字、highlight rail 與少量 stat cards，雖然畫面完成度足夠，但還沒有期間切換、來源透明度與故事模組，無法承接真正的永續敘事。若不把這頁的內容模型獨立規畫，後續很容易把更多硬編碼數字塞進同一個版型而失去可維護性。

## What Changes

- 為 Sustainability 建立期間切換能力，至少支援月、季、年與累積視角，讓大數字與 highlight rail 能依期間切換。
- 補上資料來源與更新時間顯示，讓各個永續指標不只是顯示數值，也能呈現來源與同步狀態。
- 建立故事模組與里程碑內容區塊，讓永續頁可展示專案成果、ESG 行動摘要與關鍵 milestone，而不只是一頁固定卡片。
- 將 Sustainability 的 fallback 與 hardcoded 摘要值替換為可配置內容模型，便於後續串接真實摘要資料。

## Capabilities

### New Capabilities

- `sustainability-period-comparison`: 提供 Sustainability 的期間切換與多期間指標比較能力。
- `sustainability-data-provenance`: 提供 Sustainability 指標的資料來源、更新時間與同步狀態顯示能力。
- `sustainability-story-modules`: 提供 Sustainability 的里程碑、專案成果與 ESG 敘事模組能力。

### Modified Capabilities

(none)

## Impact

- Affected specs: `sustainability-period-comparison`, `sustainability-data-provenance`, `sustainability-story-modules`
- Affected code:
  - Modified: `apps/web/src/pages/Sustainability/index.tsx`, `apps/web/src/pages/Sustainability/viewModel.ts`, `apps/web/src/pages/Sustainability/displayPageConfig.ts`, `apps/web/src/pages/DisplayPagesEditor/runtime.tsx`, `apps/web/src/services/api.ts`
  - New: `packages/shared/src/sustainabilityStory.ts`, `apps/server/src/services/sustainabilityStoryService.ts`, `apps/server/src/routes/sustainability-story.ts`
  - Removed: none
