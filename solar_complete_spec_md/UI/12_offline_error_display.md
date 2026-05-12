# 12 Offline Error Display 離線錯誤顯示頁

## 頁面目的

當系統無法取得即時資料時，清楚告知使用者目前狀態、錯誤原因、最後更新時間與建議處理方式，避免看板顯示空白或錯誤資料。

## 觸發條件

- MQTT 連線逾時。
- 超過指定秒數未收到任何資料。
- Topic payload 連續解析失敗。
- Broker 無法連線。
- 網路中斷。

## 功能需求

### 主訊息

- 大圖示：雲端上傳/連線失敗 + 紅色錯誤標記。
- 主標：無法取得即時資料。
- 英文：Unable to retrieve live data。
- 狀態文字：系統正在嘗試重新連線中... / Reconnecting...

### 錯誤資訊卡

| 欄位 | 範例 |
|---|---|
| 最後更新時間 | 2025/05/28 09:12:45 |
| 錯誤原因 | MQTT 連線逾時 / Connection Timeout |
| 建議處理方式 | 請檢查網路或聯絡系統管理員 |

### 重試提示

- 顯示倒數：將於 30 秒後重新嘗試連線。
- 支援 spinner 動畫。

## 離線策略建議

- 若只是短暫斷線：繼續顯示最後一筆資料並標示 stale。
- 若超過 timeout：切換至本離線頁。
- 若重新連線成功：自動回到原播放頁或首頁。

## Design Tokens

```json
{
  "color.error.primary": "#E60012",
  "color.error.iconGreen": "#2F7D32",
  "color.error.cardBg": "rgba(255,255,255,0.94)",
  "color.error.textPrimary": "#303236",
  "font.size.errorTitle": "42px",
  "font.size.errorSubtitle": "30px",
  "font.size.errorCardLabel": "22px",
  "layout.errorPanel.width": "740px",
  "layout.errorCard.width": "740px",
  "layout.backgroundImage.opacity": "0.55",
  "component.retryBar.height": "74px"
}
```

## 驗收條件

- 錯誤頁不可依賴 MQTT 資料才能顯示。
- 倒數結束需觸發重新連線。
- 重新連線成功後需恢復播放。
- 錯誤原因需可國中英雙語顯示。
