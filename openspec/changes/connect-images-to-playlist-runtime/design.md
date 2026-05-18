## Context

`/images` 的 FHD layout、main stage、info panel 與 thumb grid 已經完成，但播放內容仍主要來自 page-local `imageMocks`。server 端其實已經提供 `/api/image-playlist`，包含 ordered entries、per-entry duration、fallback mode 與 metadata。

這代表目前頁面只完成了「看起來像 Images page」，還沒有真正接到正式播放資料域。若這條 runtime 不接上，MVP 仍停在 prototype-aligned mock，而不是正式可控的播放面。

## Goals / Non-Goals

**Goals**

- 讓 `/images` 以 `/api/image-playlist` 的 ordered entries 與 active entry 作為主要播放來源。
- 將 info panel、counter、duration 與 fallback mode 顯示改為跟隨 playlist payload。
- 保留既有 FHD 幾何、display page config 與主畫面/縮圖 layout。
- 補齊 playlist request adapter、fallback handling 與 targeted tests。

**Non-Goals**

- 不重做圖片頁的 reference layout。
- 不新增新的 asset storage backend。
- 不把 playlist runtime 與 image management 治理 UI 合成同一個 change。

## Decisions

### Treat Images as a playlist runtime, not a mock gallery

決策：播放頁直接消費 playlist entries 與 active entry，而不是從 `imageMocks` 再組一次類似資料。

理由：duration、排序、fallback mode 與 metadata 都屬於 playlist domain，不該停留在 page-local mock。

### Keep playlist fallback modes visible in the playback surface

決策：`display-placeholder`、`skip`、`use-cover` 等 fallback mode 必須影響 main stage 與 info panel 的顯示結果。

理由：這是正式播放行為，不是純管理資訊。

### Preserve layout config as presentation-only state

決策：main stage、counter、thumb grid 與 info panel 幾何仍由 display page config 控制，playlist payload 只負責內容與播放順序。

理由：避免把內容資料和畫面配置綁死在一起。

## Implementation Contract

1. `/images` SHALL 以 `/api/image-playlist` 的 `entries` 與 `activeEntry` 作為主要播放來源。
2. slide counter、active duration、info panel metadata 與 thumbnail order SHALL 來自 playlist payload，而不是 `imageMocks`。
3. fallback mode 與 fallback reason MUST 在 main stage、placeholder 或 cover usage 上有一致的播放行為。
4. 既有 FHD layout、display page config 與 media geometry MUST 維持現況。
5. targeted tests SHALL 覆蓋 ready asset、pending asset、missing asset、use-cover、skip 與空 playlist 情境。

## Risks / Trade-offs

- 若播放頁仍部分依賴 `imageMocks`，管理頁更新 playlist 後畫面可能看不出差異。
- 若 fallback mode 只存在資料層而不影響畫面，現場會誤以為播放正常。
- 若沒有驗證空 playlist / skip，正式播放最容易出錯的情境會被忽略。
