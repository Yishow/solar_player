## Why

Overview 現況以空白底 + 小 logo hero 呈現，缺乏主視覺氣場（對照 `docs/reference/Better/01.Overivew (大).png` 落差明顯）。使用者已上傳整頁尺寸的太陽能廠房背景設計稿（`uploads/overview_bg-1~4.png`），希望把 Overview 改為滿版背景照片打底、真實資料 widget 疊放其上，並讓背景在每次輪播進入 Overview 時隨機切換，未來可由管理頁擴充候選圖。

## What Changes

- 在 Overview 新增「滿版背景圖池」概念：Overview 可繫結一組背景候選圖（asset/media source ref 清單），渲染時鋪滿 1920x1080 畫布作為頁面背景，現有 KPI/天氣/三相/趨勢 widget 疊放其上。
- 每次 playback rotation 進入 Overview（page component mount）時，從候選池隨機選一張作為當次背景；池為空時 fallback 回退既有 hero media（不破版）。
- 候選池由 editor/管理頁維護（指定哪些已上傳圖為 Overview 背景候選），沿用既有 asset library / media source 機制，不另造資料源。
- 首批候選以 `uploads/overview_bg-1~4.png` 作為 seed 預設。

## Non-Goals

- 不碰 server API、SQLite schema、MQTT 連線架構；背景圖沿用既有 uploads/asset 管道。
- 不改 nav/route、rotation 排程演算法本身（只在進入 Overview 時做一次隨機選圖）。
- 不把背景池機制套用到其他四個 playback 頁（本輪僅 Overview）。
- 不用 page-local hardcode 繞過 editor；候選池與 placement 皆走既有 config/editor。
- 不做背景轉場動畫（淡入淡出等）本輪不納入。

## Capabilities

### New Capabilities

- `overview-background-rotation-pool`: 讓 Overview 具備 editor 可維護的滿版背景候選圖池，並在每次 rotation 進入 Overview 時隨機選一張渲染，池為空時回退既有 hero media。

### Modified Capabilities

(none)

## Impact

- Affected specs: `overview-background-rotation-pool`
- Affected code:
  - New:
    - apps/web/src/pages/Overview/backgroundPool.ts
  - Modified:
    - apps/web/src/pages/Overview/displayPageConfig.ts
    - apps/web/src/pages/Overview/index.tsx
    - apps/web/src/pages/Overview/overview.css
    - apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx
