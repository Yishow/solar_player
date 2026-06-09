# Baseline witness — /overview（task 1.1）

- 擷取：`http://localhost:4173/overview`，viewport 1920×1080，dev server（web :4173 / server :3000）即時資料。
- 截圖：`witness/overview-baseline.png`
- 對照樣稿：`docs/reference/Better/01.Overivew (大).png`

## 逐卡 pass/fail 與 seed 目標

| 卡片 | 現行 live | 現行 seed footerType | Better 樣稿內容物 | 判定 | 動作 |
|---|---|---|---|---|---|
| 即時發電功率 | 12.3 kW＋sparkline | `sparkline` | 迷你趨勢線 | PASS（內容物一致） | 僅 icon chip |
| 今日發電量 | 2,225 kWh＋45% 進度（目標 5,000） | `progress` | 74.5% 進度 | PASS（內容物一致） | 僅 icon chip |
| 累積發電量 | 12,346＋text「自建置起…」 | `text` | 趨勢/註記（偏簡潔，非長文字） | PARTIAL | task 5 評估改 `sparkline` 或精簡 text |
| 今日 CO2 減量 | 235＋「相當於種植…棵樹」 | `co2-tree` | 棵樹當量 | PASS | 僅 icon chip |
| 累積 CO2 減量 | 2,345＋「相當於種植…棵樹」 | `co2-tree` | 大數字註記 | PARTIAL | task 5 評估改 `text` |

> footer 數值差異（45% vs 74.5%、12.3 vs 586）來自 live 隨機/seed 資料，非版型差異，不列為 gap。

## 確認為真實 gap（icon chip）

- 現行五卡 icon 皆為**小型圓形綠色線框 icon**（`.overview-kpi-icon-shell` 白底圓形＋單色 accent）。
- Better 為**較大的圓角方形彩色 chip**，每卡分色（綠/琥珀/藍/青/橘）。
- 結論：icon chip 底色＋形狀＋每卡分色為真實缺口 → tasks 2/3/5 成立。

## 與 design/spec 衝突的發現（影響 task 4）

- **`Sparkline` 現已永遠渲染填色面積**（stroke polyline ＋ `fill="url(#sparkline-fill)"` 的 area polyline）。
- 現行**發電趨勢卡已是填色面積圖**，含 Today/7D/30D tabs 與端點數值，形態與 Better 樣稿相同。
- 因此 task 4「為 `Sparkline` 新增預設關閉的填色選項（細線→填色）」的前提（趨勢卡為細線）**與現實不符**；既有填色已滿足「填色面積」需求。
- Better 與現行趨勢卡的剩餘差異屬細節 polish（曲線資料形狀、漸層強度、是否顯示時間軸），非渲染能力缺口。
- 處置：task 4 需依使用者對「趨勢卡實際要改什麼」的指示重新界定，避免實作無視覺效果的填色開關。
