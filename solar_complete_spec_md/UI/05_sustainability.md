# 05 Sustainability 永續成果頁

## 頁面目的

集中展示綠色製造成果與 ESG 成效，以品牌敘事加數據化成果呈現企業永續承諾。

## 功能需求

### Hero 區

- 背景使用工廠與太陽能板照片。
- 疊加葉片、太陽能、風機等永續線稿。
- 左側文字：
  - 綠能驅動・永續未來
  - 永續成果 持續累積
  - Sustainability in Action
- 說明企業推動綠色製造、環境管理與資源循環。

### ESG KPI 卡片

| 指標 | 範例值 | 單位/內容 |
|---|---:|---|
| 累積發電量 | 18.6 | GWh |
| 累積 CO₂ 減量 | 9,842 | t |
| 年度節能成效 | 12.4 | % |
| 綠色採購金額 | NT$ 60M+ | 金額 |
| ESG 行動摘要 | 條列 | 推動再生能源使用等 |
| 相當於種樹 | 25,600 | trees |

## 資料需求

- totalGeneration
- totalCo2Reduction
- annualEnergySavingRatio
- greenProcurementAmount
- esgHighlights[]
- treesEquivalent

## Design Tokens

```json
{
  "color.sustainability.glow": "rgba(201, 235, 171, 0.38)",
  "color.sustainability.lineArt": "rgba(235, 255, 215, 0.75)",
  "color.sustainability.primary": "#4F7A3F",
  "font.size.sustainabilityTitle": "72px",
  "font.size.kpiValueLarge": "58px",
  "layout.hero.height": "690px",
  "layout.esgCard.height": "230px",
  "component.esgIcon.size": "58px"
}
```

## 驗收條件

- ESG 條列文字需支援 2-4 條。
- 金額、樹木換算、節能比例需可由後台或設定檔管理。
- 背景照片不可影響文字可讀性。
