# 11 Energy Data History 能源資料歷史頁

## 頁面目的

提供更完整的能源數據查詢與趨勢分析，支援今日、本週、本月、今年、累積等時間範圍，並呈現發電、用電、自發自用與減碳比較。

## 功能需求

### 左側時間篩選

- Today。
- This Week。
- This Month。
- This Year。
- Cumulative。

### KPI 摘要卡

| 指標 | 範例值 | 比較 |
|---|---:|---|
| Energy Generation | 8,450 kWh | 較昨日 +12% |
| Self-consumption | 2,430 kWh | 較昨日 +8% |
| Consumption | 12,680 kWh | 較昨日 +5% |
| Self-consumption Ratio | 32% | 較昨日 +3% |
| CO₂ Reduction | 4.21 t | 較昨日 +7% |

### 趨勢圖

- 今日趨勢折線圖。
- 三條線：發電量、用電量、自發自用。
- X 軸時間 00:00 到 24:00。
- Y 軸 kW。
- 需支援 hover tooltip 或播放模式靜態顯示。

### 底部摘要

- 尖峰發電與時間。
- 尖峰用電與時間。
- 資料更新時間。
- 資料來源。

## 資料需求

```json
{
  "range": "today",
  "summary": {
    "generation": 8450,
    "selfConsumption": 2430,
    "consumption": 12680,
    "selfConsumptionRatio": 32,
    "co2Reduction": 4.21
  },
  "compareWithPrevious": {
    "generation": 12,
    "selfConsumption": 8,
    "consumption": 5,
    "selfConsumptionRatio": 3,
    "co2Reduction": 7
  },
  "series": [
    {"time": "00:00", "generationKw": 0, "consumptionKw": 500, "selfConsumptionKw": 200}
  ],
  "peaks": {
    "generation": {"value": 1920, "time": "12:30"},
    "consumption": {"value": 1860, "time": "13:45"}
  }
}
```

## Design Tokens

```json
{
  "color.history.sidebarActive": "#4F7A3F",
  "color.history.generationLine": "#4F7A3F",
  "color.history.consumptionLine": "#FF7A1A",
  "color.history.selfUseLine": "#1E9BEA",
  "color.history.positive": "#4F8A3A",
  "font.size.historyKpiValue": "42px",
  "layout.sidebar.width": "295px",
  "layout.chart.height": "390px",
  "layout.chartPanel.width": "1500px",
  "component.kpiCard.height": "230px"
}
```

## 驗收條件

- 切換時間範圍後 KPI、圖表、尖峰資訊需同步更新。
- 比較百分比需可處理正負值與無前期資料。
- 圖表需在 1920×1080 內完整顯示。
