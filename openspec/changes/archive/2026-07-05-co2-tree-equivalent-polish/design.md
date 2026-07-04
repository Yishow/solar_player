## Context

目前 Overview KPI 卡片下方的 CO2 減量換算樹木係數為 `2.6`，顯示文案為「相當於種植 ? 棵樹」。
為使數值計算更具科學依據並向用戶揭示換算公式，我們將依據「1棵樹20年，平均吸收160kg co2」的基準更新計算因子與顯示文案。

## Goals / Non-Goals

**Goals:**

- 更新換算係數，使其符合：1 噸 CO2 = 1000 kg，除以每棵樹 160 kg = 6.25 棵樹。
- 更新文案為：「約種植 ？ 棵樹（1棵樹20年，平均吸收160kg co2）」。
- 更新相關單元測試以確保正確的計算邏輯和格式斷言。

**Non-Goals:**

- 不影響其他非 CO2 類型的 KPI 卡片（例如自用率或即時功率等）的 footer 邏輯。

## Decisions

### 1. 調整計算係數與文案結構

在 `OverviewKpiFooter.tsx` 中：
- 將 `co2TreeEquivalentFactor` 設為 `6.25`。
- 重構 `case "co2-tree"` 的 JSX 輸出文字：
  `約種植 {treeEquivalent} 棵樹（1棵樹20年，平均吸收160kg co2）`
- 保持 dot 指標與 pulsing 動畫不變。

## Implementation Contract

- **文案顯示**：輸入 12.4 噸 CO2 時，應輸出 `約種植 78 棵樹（1棵樹20年，平均吸收160kg co2）`。
- **係數設定**：`co2TreeEquivalentFactor = 6.25`。
