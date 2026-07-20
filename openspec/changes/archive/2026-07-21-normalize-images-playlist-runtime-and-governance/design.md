## Context

`Images` 目前已經有 playlist runtime，但治理仍混兩層：

- `image_assets`
  - 檔案、寬高、cover、legacy slideshow flags
- `image_playlist_entries`
  - 播放順序、停留秒數、fallbackMode、title、description、capturedAt、tags

管理頁在某些情況同時更新兩者，代表相同播放意圖會落在兩個地方。這會讓「頁面上顯示的目前第幾張、停留幾秒、是否可播放、fallback 原因」雖然來自 playlist runtime，但 operator 儲存流程卻可能還在寫 legacy asset 欄位。

## Goals / Non-Goals

**Goals**

- 讓 playlist entry 成為播放真相來源。
- 讓 asset library 與 playlist governance 邊界清楚。
- 讓 `Images` 顯示頁與管理頁共享同一套 fallback/provenance 語意。

**Non-Goals**

- 不新增新的素材分類層級。
- 不重做 Images 視覺。

## Decisions

### Playlist entry owns playback behavior

決策：排序、duration、enabled、fallbackMode、entry metadata 都由 playlist entry 擁有。

理由：這些都是播放語意，不應再由 asset row 的 legacy slideshow 欄位半托管。

### Asset library owns file metadata only

決策：asset row 保留檔案存在性、尺寸、cover 與描述性媒體 metadata。

理由：media library 與 slideshow runtime 是不同責任。混用時會讓管理頁不知道自己到底在改「素材」還是「播放實例」。

### Make fallback behavior explicit

決策：`display-placeholder`、`skip`、`use-cover` 等 fallback mode 要在 runtime 與 management 同步顯示，且能對應到 entry-level reason。

理由：這是使用者判斷圖片播放是否真的接上後端的重要診斷訊號。

## Implementation Contract

1. `Images` playback MUST 以 playlist entries 決定 active slide、duration、enabled state 與 fallback behavior。
2. asset updates SHALL 不再隱式覆寫 playlist playback semantics。
3. management 頁面 MUST 顯示 asset library metadata 與 playlist entry metadata 的責任分界。
4. cover image 的用途 MUST 被定義為 fallback or branding asset，而不是另一條隱性 slideshow source。

## Risks / Trade-offs

- 若 legacy slideshow 欄位不退場，之後很容易再次發生雙寫。
- 若 cover image 與 playlist fallback 的語意不寫清楚，operator 仍會誤解為「封面等於第一張播放圖」。
- 若 runtime 與 governance payload shape 不一致，前後端仍可能在 fallback mode 名稱上漂移。
