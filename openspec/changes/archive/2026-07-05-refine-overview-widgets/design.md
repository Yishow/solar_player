## Context

Overview 播放頁面的底端區域目前包含四個 dashboard widgets。其中「發電趨勢」右上角顯示了 "Today / 7D / 30D" 的區間頁籤，而「三相電力」則顯示了一個 R/S/T 各項電壓、電流和功率的表格。
依照使用者要求，我們將：
1. 移除發電趨勢右上角的日期切換頁籤，只保留更新頻率。
2. 將三相電力改為月用量曲線（Monthly Consumption Curve）。

## Goals / Non-Goals

**Goals:**

- 移除發電趨勢（GenerationTrendWidget）右上角的 "Today", "7D", "30D" 標籤，不變動重新整理的頻率標籤（15s 更新）。
- 將三相電力表格（PhasePowerTableWidget）改為過去 30 天每日工廠用電量的平滑曲線圖表，標題改為「月用量曲線」，副標題改為 "Monthly Consumption"。
- 透過呼叫 API `/api/metrics/daily-summary?range=month` 取得過去 30 天的 `consumptionTotal` 數據，若 API 呼叫失敗或無數據，回退到預設的 30 點 mock 數據。
- 保持 editor 的組件 geometry config 結構不變，將 `phasePower` 組件在 layout editor 中的描述文字與 label 更新為對應的月用量曲線說明。

**Non-Goals:**

- 不變動資料庫的欄位、MQTT topic 訂閱與 schema 機制。
- 不修改 `/display-pages/editor` 儲存 JSON 的 `phasePower` key 值（維持此鍵值以避免破壞 runtime 與 editor 的 config 讀寫架構），僅修改其 label 與 description 呈現。

## Decisions

### 1. 曲線渲染方式與數據對齊

我們將在 `PhasePowerTableWidget.tsx` 中實作一個與 `GenerationTrendChart` 同等規格的 SVG 平滑曲線：
- 透過 `toSparklineSmoothPath` 把 (x, y) 座標點序列映射為平滑的貝氏曲線。
- 使用 linearGradient 渲染綠色的填充漸層（與發電趨勢的主題對齊）。
- 計算 niceCeil 作為 Y 軸的最大邊界，並畫出 3 條水平格線（gridlines）與 Y 軸標籤。
- 在 X 軸標註時間（選取 5 個等距日期的 `MM/DD` 標籤）。
- 在曲線頂峰標註最高用量數值與單位（例如 `4,200 kWh`）。

### 2. 數據取得與 Fallback 設計

- 元件掛載時，向 `/api/metrics/daily-summary?range=month` 發送 GET 請求。
- 因 API 回傳的 summaries 是按 `date DESC`（最新在前）排列，我們需將其 `reverse()` 來按時間正序渲染。
- 當 API 資料尚在載入、載入失敗、或回傳空陣列時，改用一組固定的 mock 數據（30 個介於 2800 到 4200 之間的數值），確保在無 Socket/API 的單機播放或測試環境下依然有美觀的曲線。

## Implementation Contract

- **組件外觀**：
  - 發電趨勢（GenerationTrendWidget）右上角原本的 `Today / 7D / 30D` 區間按鈕將被移除。
  - 月用量曲線（PhasePowerTableWidget 改名或在此檔案內重構）顯示「月用量曲線 / Monthly Consumption」標題，圖表區塊渲染與發電趨勢同級的 SVG 漸層平滑折線。
- **介面與數據結構**：
  - 串接 API 取得 `{ summaries: Array<{ date: string; consumptionTotal: number | null }> }`。
  - Y 軸與格線依最大用量自適應 Nice Ceil 換算，數值後綴單位 `kWh`。
- **回退處理**：
  - 載入中或 API 失敗時，自動採用內部預設 30 點 mock 數值（例如 `[3100, 3200, 2850, 3400, ...]`）渲染，防止出現空白或 JavaScript 錯誤。
- **測試驗證**：
  - 修正 `apps/web/src/pages/Overview/widgets/overviewWidgets.test.tsx` 關於發電趨勢 Tabs 的 assertion。
  - 將 `PhasePowerTableWidget.test.tsx` 調整為驗證「月用量曲線」標題、折線 SVG 元件以及 Fallback 渲染，不再驗證 R/S/T 表格。
