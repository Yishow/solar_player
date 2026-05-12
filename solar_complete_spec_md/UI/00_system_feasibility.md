# 系統構成評估：這樣的需求夠構成系統嗎？

## 結論

夠。這組畫面已經不只是單純播放頁，而是具備「展示播放 + 即時資料接入 + 後台設定 + 媒體管理 + 設備狀態 + 異常處理」的完整系統雛形。

若要進入實作，建議把它定義為：

**工廠太陽能 / 綠能資訊看板播放系統**

包含前台看板模式與後台管理模式兩大區塊。

---

## 已具備的系統模組

| 模組 | 對應頁面 | 說明 |
|---|---|---|
| 即時能源展示 | Overview、Solar、Factory Circuit、Sustainability、Energy Trend Summary | 顯示即時功率、今日發電、累積發電、用電、減碳等資料 |
| 資料來源整合 | MQTT Settings | MQTT Broker、Topic Mapping、即時資料預覽 |
| 播放控制 | Playback Settings、Slideshow Preview | 輪播順序、每頁停留時間、自動播放、排程、轉場 |
| 圖片/媒體管理 | Images、Image Management | 圖片輪播展示、上傳、排序、封面、顯示時間、啟用停用 |
| 用電迴路管理 | Factory Circuit、Circuit Settings | 用電分類、比例、MQTT Topic、閾值、圖示、顯示狀態 |
| 歷史趨勢分析 | Energy Data History、Energy Trend Summary | 日/週/月/年/累積資料，趨勢圖、比較昨日、尖峰資訊 |
| 裝置維運 | Device Status Details | Raspberry Pi 狀態、CPU/記憶體/磁碟/溫度、網路、重啟、更新 |
| 異常處理 | Offline Error Display | MQTT 離線、重新連線、最後更新時間、錯誤原因與建議處理 |

---

## 還需要補齊的需求

目前畫面足以定義系統範圍，但要開發仍需補下列規格：

1. **資料格式**
   - 每個 MQTT topic 的 payload 格式。
   - 數值單位、精度、小數位。
   - 是否含 timestamp、quality、device id。

2. **資料儲存策略**
   - 即時資料是否只顯示或也要存歷史。
   - 歷史資料保留多久。
   - 日、週、月、年統計如何聚合。

3. **角色與權限**
   - 是否需要登入。
   - 後台設定頁是否只限管理員。
   - 現場螢幕是否 kiosk mode。

4. **部署環境**
   - Raspberry Pi 型號、解析度、瀏覽器模式。
   - 是否離線可播放快取資料。
   - MQTT Broker 是內網還是雲端。

5. **播放邏輯細節**
   - 手動切頁是否暫停自動播放。
   - 閒置多久回首頁。
   - 異常頁是否強制覆蓋展示頁。

6. **告警規則**
   - MQTT timeout 幾秒算離線。
   - 迴路 warning/attention 閾值是否可自訂。
   - 是否需要通知管理者。

---

## 建議系統架構

```text
Raspberry Pi Display Client
  ├─ Frontstage Player UI
  ├─ Admin Settings UI
  ├─ MQTT Client
  ├─ Local Cache
  └─ Offline/Error Handler

Backend / Local Service
  ├─ MQTT Broker Connector
  ├─ Data Aggregation Service
  ├─ Media File Service
  ├─ Settings API
  ├─ History Database
  └─ Device Monitor Agent
```

---

## MVP 建議範圍

第一階段可先做：

- Overview、Solar、Factory Circuit、Sustainability 四個展示頁。
- MQTT Settings。
- Playback Settings。
- Offline Error Display。
- 基本圖片管理。
- Local JSON 設定檔。
- SQLite 儲存歷史資料。

第二階段再加入：

- Energy Data History 詳細分析。
- Device Status Details 維運功能。
- 完整圖片上傳/裁切/排序。
- 排程播放。
- 多台設備管理。

---

## 需求成熟度評估

| 面向 | 成熟度 | 評語 |
|---|---:|---|
| UI/UX | 高 | 視覺風格、頁面架構、資訊層級很完整 |
| 功能範圍 | 高 | 已涵蓋展示、設定、維運、異常 |
| 資料規格 | 中 | Topic 名稱有雛形，但 payload 與聚合規則未定 |
| 系統架構 | 中 | 可推導，但尚未明確定義前後端與部署方式 |
| 開發可執行性 | 高 | 補齊 API/MQTT/資料庫規格後即可進入實作 |

## 總評

這份需求已經足以構成一個完整系統。若要開發，下一步不是再畫更多頁，而是將畫面轉成：

- 功能規格書
- 資料模型
- MQTT Topic/Payload 規格
- API 規格
- Design Token
- Component 規格
- 播放狀態機
