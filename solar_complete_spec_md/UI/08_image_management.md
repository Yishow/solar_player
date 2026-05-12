# 08 Image Management 圖片管理頁

## 頁面目的

提供管理者管理輪播圖片，包含檔案上傳、圖片啟用、標題描述、顯示秒數、裁切焦點、封面設定與刪除。

## 功能需求

### 狀態摘要

- 總圖片數。
- 已使用空間 / 總空間。
- 最後同步時間。

### 圖片來源與上傳

- Source Folder 路徑，例如 `/home/pi/images`。
- Browse 按鈕。
- 拖曳上傳區。
- Enable Slideshow 開關。
- Default Duration 設定。

### 圖片列表

每張圖片卡包含：

- 序號。
- 縮圖。
- 啟用開關。
- 檔名。
- 尺寸，例如 1920×1080。
- 檔案類型。

### 編輯面板

- 預覽圖。
- 標題輸入。
- 描述輸入。
- 顯示時間。
- 裁切/焦點調整。
- Aspect Ratio。
- Include in Slideshow。
- Set as Cover。
- Remove。

## 資料模型建議

```json
{
  "id": "string",
  "filename": "string",
  "path": "string",
  "width": 1920,
  "height": 1080,
  "mimeType": "image/jpeg",
  "title": "string",
  "description": "string",
  "durationSec": 10,
  "enabled": true,
  "isCover": false,
  "focus": {"x": 0.5, "y": 0.5},
  "aspectRatio": "16:9",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Design Tokens

```json
{
  "color.upload.border": "#B7C7A9",
  "color.upload.bg": "#FCFBF7",
  "color.imageCard.activeBorder": "#4F7A3F",
  "color.danger": "#D95F5F",
  "font.size.managementTitle": "64px",
  "layout.imageGrid.columns": 4,
  "layout.imageCard.width": "320px",
  "layout.imageCard.height": "235px",
  "layout.editPanel.width": "450px",
  "component.uploadBox.height": "100px"
}
```

## 驗收條件

- 上傳圖片需產生縮圖。
- 刪除前需二次確認。
- 設為封面後同一時間只能有一張 cover。
- 圖片啟用狀態需影響 Images 頁輪播。
