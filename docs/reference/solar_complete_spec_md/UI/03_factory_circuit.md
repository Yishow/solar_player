# 03 Factory Circuit 廠區用電迴路頁

## 頁面目的

展示太陽能轉換後如何分配至廠區不同用電迴路，讓使用者理解工廠能源流向與各迴路負載比例。

## 功能需求

### 左側說明區

- 標題：廠區用電迴路 / Factory Energy Circuit。
- 說明太陽能經配電系統分配至各項用電設備。
- 需有裝飾線條與葉片圖樣。

### 中央能源路徑

路徑節點：

1. 太陽能板 / PV Modules。
2. 逆變器 / Inverter。
3. 配電盤 / Switchboard。
4. 分流至右側各用電分類。

節點需以卡片式圖示呈現，路徑使用箭頭與線條。

### 右側用電分類

| 分類 | 英文 | 範例占比 |
|---|---|---:|
| 生產線用電 | Production Line | 45% |
| 空調與環境設備 | HVAC & Environment | 20% |
| 照明系統 | Lighting | 10% |
| 辦公與公共區域 | Office & Common Area | 10% |
| 充電設備 / 綠能設施 | EV / Green Facility | 10% |
| 其他基礎設施 | Infrastructure | 5% |

每個分類需包含：

- 圖示。
- 中文名稱。
- 英文名稱。
- 占比或負載百分比。

### KPI 卡片

| 指標 | 範例值 | 單位 / 狀態 |
|---|---:|---|
| 目前廠區總用電 | 1,280 | kW |
| 太陽能供應占比 | 32 | % |
| 今日自發自用電量 | 2,430 | kWh |
| 尖峰負載 | 1,860 | kW |
| 目前綠電流向 | 供應中 | Normal |

## 資料需求

| 欄位 | 來源建議 | 說明 |
|---|---|---|
| totalFactoryPower | MQTT | 廠區總用電 |
| solarSupplyRatio | Calculated | 太陽能供應占比 |
| todaySelfConsumption | MQTT / DB | 今日自發自用電量 |
| peakLoad | DB aggregation | 今日尖峰負載 |
| greenPowerFlowStatus | MQTT / Calculated | 供應中 / 異常 / 停止 |
| circuitLoads[] | MQTT topics | 各迴路負載 |

## 狀態規則

| 狀態 | 條件建議 | 顯示 |
|---|---|---|
| Normal | 負載 < 70% | 綠色 |
| Attention | 70% ≤ 負載 < 90% | 橘色 |
| Warning | 負載 ≥ 90% | 紅色 |

## Design Tokens

### Color

```json
{
  "color.circuit.normal": "#4F7A3F",
  "color.circuit.attention": "#E0A12A",
  "color.circuit.warning": "#E85D5D",
  "color.circuit.path": "#6D8C54",
  "color.circuit.nodeBg": "#FAFAF5",
  "color.circuit.nodeBorder": "#D9E0D0"
}
```

### Typography

```json
{
  "font.size.pageTitle": "72px",
  "font.size.descriptionZh": "24px",
  "font.size.descriptionEn": "20px",
  "font.size.circuitNameZh": "23px",
  "font.size.circuitNameEn": "16px",
  "font.size.percentage": "34px"
}
```

### Layout

```json
{
  "leftPanel.width": "560px",
  "flow.area.width": "650px",
  "circuitList.width": "470px",
  "flow.node.card.width": "135px",
  "flow.node.card.height": "240px",
  "switchboard.width": "180px",
  "switchboard.height": "300px",
  "circuit.item.height": "88px"
}
```

### Component Tokens

```json
{
  "component.circuitItem.radius": "12px",
  "component.circuitItem.shadow": "0 6px 18px rgba(60,70,55,0.12)",
  "component.flowConnector.strokeWidth": "3px",
  "component.flowIcon.size": "66px"
}
```

## 驗收條件

- 右側用電分類可由設定頁動態增減或排序。
- 用電比例合計應為 100%，若資料不足需顯示 fallback。
- 負載狀態需與 Circuit Settings 閾值一致。
