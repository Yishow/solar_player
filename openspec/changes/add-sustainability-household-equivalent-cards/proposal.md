## Why

業主希望在輪播展示中用 4 口之家電費換算強化綠化與節能方向，但現有 Sustainability highlights 只能呈現原始指標摘要，無法表達戶數等價、估算口徑與日/累積敘事。若沒有一個正式的 household-equivalent template 與計算來源，前台只能塞死文案，後續既無法校正假設，也無法向外說清楚數字如何得出。

## What Changes

- 新增 household-equivalent 卡片模板，支援 eyebrow、主數字、戶數標籤、說明句、估算註記與計算 profile 等欄位。
- 定義 4 口之家等價值的 derived content contract，讓 daily summary、cumulative counters 與估算口徑可以產生 今日綠電效益 與 累積綠能成果 兩種卡片值。
- 在 Sustainability 預設配置中加入兩張 household-equivalent 卡，分別對應一日電費折抵與累積一個月電費等價。
- 保留 headline 以 X 戶4口之家 為主，不把金額作為主視覺，但要保留估算依據與資料狀態。

## Capabilities

### New Capabilities

- sustainability-household-equivalent-storytelling: 讓 Sustainability 以 4 口之家等價敘事卡呈現日與累積綠電成果，並附帶估算口徑。

### Modified Capabilities

- sustainability-data-provenance: 永續頁的衍生敘事卡需攜帶估算口徑、來源與可用狀態，而不只描述既有 big numbers 與 highlights 的 provenance。

## Impact

- Affected specs: sustainability-household-equivalent-storytelling, sustainability-data-provenance
- Affected code:
  - New: packages/shared/src/householdEquivalence.ts, apps/server/src/services/householdEquivalenceService.ts
  - Modified: apps/server/src/services/sustainabilityStoryService.ts, apps/server/src/routes/sustainability-story.ts, apps/server/src/routes/sustainability-story.test.ts, apps/server/src/services/DailySummaryService.ts, packages/shared/src/sustainabilityStory.ts, packages/shared/src/index.ts, apps/web/src/pages/Sustainability/viewModel.ts, apps/web/src/pages/Sustainability/viewModel.test.ts, apps/web/src/pages/Sustainability/displayPageConfig.ts
  - Removed: none
