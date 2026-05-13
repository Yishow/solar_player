# 04 Images 綠能現場影像頁

## 頁面目的

以照片輪播方式展示廠區綠能設施、太陽能板、工廠環境與永續實踐場景，增加展示系統的真實感與品牌形象。

## 功能需求

### 左側資訊區

- 標題：綠能現場影像 / Green Energy in Action。
- 說明文字：記錄廠區內綠能設施、綠色環境與永續實踐。
- 顯示目前照片序號，例如 03 / 08。
- 顯示自動輪播說明，例如「每 15 秒切換一張」。
- 顯示進度條。

### 主要圖片展示

- 大圖展示目前選取圖片。
- 圖片需支援 16:9。
- 圖片右側疊加資訊卡。

### 圖片資訊卡

內容包含：

- 圖片分類/標題，例如「太陽能光電系統」。
- 描述文字。
- 地點資訊，例如「國瑞中壢廠區」。
- 圖示：太陽能、定位等。

### 縮圖輪播

- 顯示多張縮圖。
- 目前選取圖片需有綠色外框。
- 左右切換按鈕。
- 支援自動播放與手動切換。

## 資料需求

| 欄位 | 說明 |
|---|---|
| image.id | 圖片 ID |
| image.src | 圖片路徑 |
| image.thumbnailSrc | 縮圖路徑 |
| image.title | 標題 |
| image.description | 描述 |
| image.location | 地點 |
| image.duration | 顯示秒數 |
| image.enabled | 是否加入輪播 |
| image.order | 輪播順序 |

## 互動需求

- 點縮圖可切換主圖。
- 左右箭頭可上一張/下一張。
- 自動播放時需更新進度條。
- 手動操作後可選擇重置倒數或暫停一段時間。

## Design Tokens

### Color

```json
{
  "color.image.activeBorder": "#4F7A3F",
  "color.image.overlayCard": "rgba(255,255,250,0.94)",
  "color.image.progressTrack": "#E6E3DA",
  "color.image.progressFill": "#4F7A3F",
  "color.image.arrowBg": "#F8F7F2"
}
```

### Typography

```json
{
  "font.size.imagePageTitle": "64px",
  "font.size.counterCurrent": "58px",
  "font.size.counterTotal": "30px",
  "font.size.infoCardTitle": "28px",
  "font.size.infoCardBody": "20px",
  "font.size.thumbnailLabel": "14px"
}
```

### Layout

```json
{
  "mainImage.width": "1290px",
  "mainImage.height": "620px",
  "mainImage.radius": "12px",
  "infoCard.width": "375px",
  "infoCard.height": "360px",
  "thumbnail.width": "260px",
  "thumbnail.height": "110px",
  "thumbnail.gap": "20px"
}
```

### Component Tokens

```json
{
  "component.carousel.arrow.size": "64px",
  "component.thumbnail.radius": "10px",
  "component.thumbnail.activeBorderWidth": "3px",
  "component.progress.height": "8px",
  "component.progress.radius": "999px"
}
```

## 驗收條件

- 圖片缺失時需略過或顯示 fallback。
- 輪播進度需與實際 duration 同步。
- 圖片資料來源應與 Image Management 共用。
