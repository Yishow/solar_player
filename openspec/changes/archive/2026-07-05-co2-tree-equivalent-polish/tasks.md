## 1. 調整計算係數與顯示文案

- [x] 1.1 依據決策 "1. 調整計算係數與文案結構"，修改 `apps/web/src/pages/Overview/OverviewKpiFooter.tsx`，將 `co2TreeEquivalentFactor` 係數改為 `6.25`，並將顯示文字更新為 `約種植 {treeEquivalent} 棵樹（1棵樹20年，平均吸收160kg co2）`，以滿足 "KPI card default styles and CO2 indicator animation" 需求。驗證方式：`pnpm run build` 成功構建。
- [x] 1.2 修改 `apps/web/src/pages/Overview/kpiFooter.test.tsx` 測試，將對 CO2 樹木換算的斷言從原本的 `相當於種植 32 棵樹` 改為 `約種植 78 棵樹（1棵樹20年，平均吸收160kg co2）`。驗證方式：執行 `pnpm --filter @solar-display/web test` 驗證測試綠燈。
