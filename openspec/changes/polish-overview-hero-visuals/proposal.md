## Why

為了使 `/overview` 播放頁面的 Hero 區塊（文字標題、圖片 Banner 與裝飾線條）在 1920x1080 FHD 投影展示時具備更高級的視覺張力與閱讀性，需要對其字型排版、背景羽化融合、金屬線條漸變及樹葉浮水印等視覺細節進行精細化美化與微動效優化，同時保護標題文字在大圖背景下的對比度。

## What Changes

- **標題文字組 (Typography & Hierarchy) 優化**：
  - 為 `.overview-title-group` 的大標題與副標題加上非常柔和的大半徑文字陰影 (`text-shadow`)，確保背景輪播切換到高亮圖片時依然具備極佳的對比度與閱讀性。
  - 微調 Eyebrow 的字距 (`letter-spacing`) 與標題字 (Em強調字) 的視覺細節。
- **金屬分割線 (Gold Line) 視覺升級**：
  - 將原本突兀在兩端切斷的實線改為向兩端漸變淡出的炫光金屬線條。
- **樹葉浮水印 (Leaf Ornament) 微動效**：
  - 為樹葉裝飾添加極微弱的呼吸或擺動動效，使播放頁面呈現動態流暢的生命感。
- **Hero 背景圖切換過渡 (Background Transition)**：
  - 為背景圖載入與切換添加 cross-fade 平滑漸變動效。

## Non-Goals

- 不修改全站的路由架構與 `LayoutShell` 結構。
- 不修改後端 API、SQLite 資料庫結構與 MQTT 數據通訊格式。
- 不退化 Playback 播放頁面的沉浸式排版為 Management（管理面）的扁平表格或工具欄堆疊。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- 影響程式碼：
  - Modified: apps/web/src/pages/Overview/overview.css
  - Modified: apps/web/src/pages/Overview/index.tsx
  - Modified: apps/web/src/pages/Overview/configRender.test.tsx
