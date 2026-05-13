# 07 Slideshow Preview 循環播放預覽頁

## 頁面目的

讓管理者檢視目前輪播狀態、當前頁面、每頁停留時間、下一頁倒數與整體播放順序。

## 功能需求

### 左側播放狀態

- Playback Status。
- 自動播放中 / Auto Play。
- 啟用中 / Enabled。
- 目前頁面，例如 3 / 5。
- 目前頁面名稱：Factory Energy Circuit。
- 每頁停留時間，例如 20 秒。
- 下一頁切換倒數，例如 12 秒。
- 倒數進度條。

### 中央輪播卡片

- 顯示各頁縮圖卡。
- 當前頁需以綠色外框強調。
- 左右箭頭切換。
- 下方 timeline dots 顯示位置。

### 播放設定摘要

- Playback route。
- Display Duration。
- Transition Effect。
- Auto Play 狀態。
- Last Updated。

## 資料需求

```json
{
  "playbackStatus": "playing",
  "autoplay": true,
  "currentPageIndex": 2,
  "totalPages": 5,
  "currentPageName": "Factory Energy Circuit",
  "displayDurationSec": 20,
  "nextPageInSec": 12,
  "transitionEffect": "fade",
  "lastUpdated": "2025-05-28T09:30:00+08:00",
  "pages": [
    {"id": "overview", "order": 1, "title": "總覽頁", "thumbnail": "..."}
  ]
}
```

## Design Tokens

```json
{
  "color.preview.active": "#2F7D32",
  "color.preview.inactiveDot": "#D5D5D0",
  "color.preview.progress": "#4F7A3F",
  "font.size.previewTitle": "32px",
  "font.size.previewNumber": "48px",
  "layout.previewCard.width": "260px",
  "layout.previewCard.height": "435px",
  "layout.statusPanel.width": "280px",
  "component.previewCard.radius": "12px",
  "component.activeBorderWidth": "3px"
}
```

## 驗收條件

- 此頁顯示內容需與 Playback Settings 實際設定一致。
- 倒數每秒更新。
- 當前頁切換時，active card 與進度點同步更新。
