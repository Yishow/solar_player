# 02 Solar 太陽能頁

## 頁面目的

說明太陽能如何提供工廠用電，並以流程圖呈現「太陽能板 → 變流器 → 工廠用電 / 減碳效益」的能源轉換概念。

## 主要使用情境

- 對訪客解釋太陽能系統運作。
- 顯示今日發電、自發自用比例、減碳、系統效率等重點成效。
- 作為輪播第二頁，承接首頁總覽後進一步介紹太陽能。

## 功能需求

### 主視覺文字

- 標語：綠能驅動・永續未來。
- 主標：太陽能驅動 製造新能源。
- 說明：乾淨的太陽能，為工廠注入綠色動能。
- 英文：Clean solar energy powers our factory。

### 能源流程圖

流程需包含：

1. 太陽能板 / Solar Panels。
2. 變流器 / Inverter。
3. 工廠用電 / Factory Consumption。
4. 減碳效益 / Carbon Reduction。

視覺要求：

- 使用圓形節點。
- 節點之間以綠色箭頭連接。
- 從變流器分支到工廠用電與 CO₂ 減碳。
- 可加入橘色輔助線表示分流。

### 背景圖片

- 左下方展示太陽能棚或工廠照片。
- 圖片需有柔和淡出邊界，不應搶過主要流程圖。

### KPI 卡片

| 指標 | 範例值 | 單位 |
|---|---:|---|
| 今日發電量 | 3,842 | kWh |
| 自發自用比例 | 78 | % |
| 今日減碳量 | 1.9 | t |
| 累積減碳量 | 9,842 | t |
| 系統效率 | 96.4 | % |

## 資料需求

| 欄位 | 來源建議 | 說明 |
|---|---|---|
| todayGeneration | MQTT / DB aggregation | 今日累積發電量 |
| selfConsumptionRatio | Calculated / MQTT | 自發自用比例 |
| todayCo2Reduction | Calculated / MQTT | 今日減碳 |
| totalCo2Reduction | DB / MQTT | 累積減碳 |
| systemEfficiency | MQTT / Calculated | 太陽能系統效率 |

## 互動需求

- 播放模式下無互動。
- 管理模式可點擊底部導覽切換頁面。
- 若系統效率低於警戒值，可在 KPI 卡加入狀態提示。

## Design Tokens

### Color

```json
{
  "color.solar.icon": "#4F7A3F",
  "color.solar.sun": "#F5A623",
  "color.flow.line": "#4F7A3F",
  "color.flow.branch": "#D99A22",
  "color.circle.bg": "#FBFAF6",
  "color.circle.border": "#D8C694",
  "color.surface.imageOverlay": "rgba(250,248,242,0.72)"
}
```

### Typography

```json
{
  "font.size.pageTitle": "72px",
  "font.size.pageTitleHighlight": "76px",
  "font.size.subtitle": "26px",
  "font.size.flowLabelZh": "24px",
  "font.size.flowLabelEn": "18px",
  "font.size.kpiValue": "58px"
}
```

### Layout

```json
{
  "flow.node.size": "230px",
  "flow.node.iconSize": "86px",
  "flow.horizontalGap": "150px",
  "hero.left.width": "620px",
  "image.preview.width": "930px",
  "image.preview.height": "230px",
  "kpi.card.height": "220px"
}
```

### Component Tokens

```json
{
  "component.flowNode.radius": "999px",
  "component.flowNode.shadow": "0 8px 24px rgba(60,70,55,0.12)",
  "component.flowArrow.strokeWidth": "4px",
  "component.kpi.iconCircleSize": "62px"
}
```

## 驗收條件

- 能源流程方向清楚，不因縮放或不同資料狀態而錯位。
- KPI 與首頁共用資料格式與卡片元件。
- 自發自用比例與系統效率需支援百分比小數位設定。
