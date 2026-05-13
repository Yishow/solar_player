# 06 Energy Trend Summary 能源趨勢摘要頁

## 頁面目的

以卡片式小圖表呈現發電、用電、自發自用、減碳等能源趨勢摘要，適合輪播展示中的數據分析頁。

## 功能需求

### 篩選區

- 支援日、週、月、累積切換。
- 目前選中 Day。
- 顯示「資料每 30 秒更新一次」。

### 趨勢卡片

| 卡片 | 指標 | 圖表形式 |
|---|---|---|
| Power | 發電功率 | 日內曲線 |
| Energy | 發電量 | 累積曲線 |
| Consumption | 用電量 | 累積曲線 |
| Self-consumption | 自發自用比例 | 曲線 |
| CO₂ Reduction | 減碳量 | 累積曲線 |

每張卡需包含：

- 圖示。
- 中文/英文名稱。
- 大數字與單位。
- 圖表。
- X/Y 軸刻度。

## 資料需求

```json
{
  "period": "day | week | month | total",
  "updatedAt": "ISO timestamp",
  "series": {
    "power": [{"time": "00:00", "value": 0}],
    "energy": [{"time": "00:00", "value": 0}],
    "consumption": [{"time": "00:00", "value": 0}],
    "selfConsumptionRatio": [{"time": "00:00", "value": 0}],
    "co2Reduction": [{"time": "00:00", "value": 0}]
  }
}
```

## Design Tokens

```json
{
  "color.chart.line": "#4F7A3F",
  "color.chart.grid": "#E3E0D8",
  "color.segment.activeBg": "#4F7A3F",
  "color.segment.activeText": "#FFFFFF",
  "font.size.summaryTitle": "58px",
  "font.size.chartValue": "56px",
  "layout.chartCard.width": "345px",
  "layout.chartCard.height": "470px",
  "component.segment.height": "60px"
}
```

## 驗收條件

- 切換日/週/月/累積後所有卡片同步更新。
- 圖表不可因資料缺漏崩潰。
- 資料更新時間需清楚顯示。
