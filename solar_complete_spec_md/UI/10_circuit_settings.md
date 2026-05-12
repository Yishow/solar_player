# 10 Circuit Settings 用電迴路設定頁

## 頁面目的

管理廠區用電迴路的顯示順序、名稱、圖示、單位、MQTT Topic、負載狀態閾值與是否顯示。

## 功能需求

### 表格欄位

| 欄位 | 說明 |
|---|---|
| 顯示順序 | 支援拖曳排序 |
| 迴路名稱 | 中文與英文名稱 |
| 圖示 | 下拉選擇 icon |
| 單位 | kW 等 |
| MQTT Topic | 對應迴路資料來源 |
| 正常閾值 | 例如 0-70 |
| 注意閾值 | 例如 70-90 |
| 警示閾值 | 例如 90-100 |
| 是否顯示 | 控制前台顯示 |

### 預設迴路

- Production Line。
- HVAC & Environment。
- Lighting。
- Office & Common Area。
- EV / Green Facility。
- Infrastructure。

### 操作

- 新增迴路。
- 儲存設定。
- 拖曳排序。
- 修改圖示與單位。
- 切換顯示狀態。

## 資料模型建議

```json
{
  "id": "production",
  "order": 1,
  "nameZh": "生產線用電",
  "nameEn": "Production Line",
  "icon": "factory",
  "unit": "kW",
  "mqttTopic": "factory/power/production",
  "thresholds": {
    "normal": [0, 70],
    "attention": [70, 90],
    "warning": [90, 100]
  },
  "visible": true
}
```

## Design Tokens

```json
{
  "color.table.headerBg": "#F4F1EA",
  "color.table.rowBg": "#FFFFFF",
  "color.threshold.normalBg": "#F1F6ED",
  "color.threshold.attentionBg": "#FFF7E6",
  "color.threshold.warningBg": "#FFF0F0",
  "font.size.circuitSettingsTitle": "56px",
  "layout.table.width": "1810px",
  "layout.table.rowHeight": "78px",
  "component.dragHandle.size": "24px",
  "component.thresholdInput.width": "105px",
  "component.saveButton.width": "210px"
}
```

## 驗收條件

- 閾值不可重疊且必須覆蓋合理區間。
- MQTT Topic 不可為空。
- 隱藏迴路後 Factory Circuit 頁不可顯示該項。
- 排序需立即反映至前台用電列表。
