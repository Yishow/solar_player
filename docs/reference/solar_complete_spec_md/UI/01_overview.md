# 01 Overview 總覽頁

## 頁面目的

作為播放系統首頁，快速傳達工廠綠能形象與核心能源績效。此頁兼具品牌展示、綠能宣傳與即時數據總覽。

## 主要使用情境

- 大廳、展示牆、廠區接待區播放。
- 讓訪客快速理解：工廠導入太陽能、正在產生綠電、減少碳排。
- 作為輪播起始頁或閒置返回頁。

## 功能需求

### Header

- 顯示品牌 Logo、公司名稱「國瑞汽車 / KUOZUI MOTORS」。
- 顯示系統名稱「國瑞汽車中廠綠能展示播放器」。
- 顯示目前時間、日期、星期。
- 顯示天氣狀態與溫度。
- 顯示 MQTT 連線狀態。

### Hero 區

- 大圖展示工廠與太陽能板。
- 左側標語：
  - 綠能驅動・永續未來
  - 以綠色製造 驅動美好生活
  - Driving a Better Future with Green Manufacturing
- 圖片需支援漸層遮罩，確保文字可讀。

### KPI 卡片

需顯示以下即時/累積數據：

| 指標 | 範例值 | 單位 |
|---|---:|---|
| 即時發電功率 | 586 | kW |
| 今日發電量 | 3,842 | kWh |
| 累積發電量 | 18.6 | GWh |
| 今日 CO₂ 減量 | 1.9 | t |
| 累積 CO₂ 減量 | 9,842 | t |

每張 KPI 卡需包含：

- 圖示。
- 中文標題。
- 英文副標。
- 大數字。
- 單位。
- 小型 sparkline 趨勢線。

### Footer / Navigation

- 顯示頁碼「01」。
- 顯示分頁導覽：Overview、Solar、Factory Circuit、Images、Sustainability。
- 目前頁籤需有綠色底線。
- 顯示 slogan：「永續，從現在開始 / Sustainability Starts with Us」。

## 資料需求

| 欄位 | 來源建議 | 更新頻率 |
|---|---|---|
| realtimePower | MQTT | 5-30 秒 |
| todayGeneration | MQTT / Aggregation | 30 秒 |
| totalGeneration | DB / MQTT | 30 秒 |
| todayCo2Reduction | 計算或 MQTT | 30 秒 |
| totalCo2Reduction | DB / MQTT | 30 秒 |
| weather | Weather API 或固定資料 | 10-30 分鐘 |
| mqttStatus | MQTT Client | 即時 |

## 互動需求

- 播放模式下通常不需要互動。
- 若為管理模式，可點擊底部頁籤切換頁面。
- MQTT 離線時，Header 狀態需變更，必要時導向 Offline Error Display。

## Design Tokens

### Color

```json
{
  "color.brand.primary": "#4F7A3F",
  "color.brand.primaryDark": "#2F5E26",
  "color.brand.primarySoft": "#EAF1E5",
  "color.accent.sun": "#F5A623",
  "color.text.primary": "#303236",
  "color.text.secondary": "#6B6F72",
  "color.text.muted": "#929895",
  "color.surface.base": "#FAF8F2",
  "color.surface.card": "#FFFFFF",
  "color.border.soft": "#E4E1D8",
  "color.shadow.card": "rgba(62, 68, 55, 0.14)"
}
```

### Typography

```json
{
  "font.family.zh": "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif",
  "font.family.en": "Inter, Roboto, Arial, sans-serif",
  "font.size.heroTitle": "72px",
  "font.size.heroEyebrow": "28px",
  "font.size.body": "22px",
  "font.size.kpiValue": "58px",
  "font.size.kpiLabel": "20px",
  "font.size.headerTime": "48px",
  "font.weight.regular": 400,
  "font.weight.medium": 500,
  "font.weight.bold": 700
}
```

### Layout

```json
{
  "screen.width": "1920px",
  "screen.height": "1080px",
  "header.height": "148px",
  "footer.height": "92px",
  "page.paddingX": "34px",
  "card.radius": "12px",
  "card.padding": "24px",
  "card.gap": "16px",
  "kpi.card.width": "360px",
  "kpi.card.height": "230px"
}
```

### Component Tokens

```json
{
  "component.header.logoSize": "72px",
  "component.statusPill.height": "56px",
  "component.statusPill.radius": "14px",
  "component.nav.activeUnderlineHeight": "3px",
  "component.sparkline.height": "28px",
  "component.hero.imageRadius": "0px"
}
```

## 驗收條件

- 1920×1080 解析度下無捲動。
- 主要 KPI 於 3 秒內完成資料刷新。
- MQTT 連線狀態與實際 client 狀態一致。
- 大圖載入失敗時需顯示預設背景或 fallback。
