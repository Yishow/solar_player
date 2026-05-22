## Why

`Images` 已經有 playlist entry、enabled state 與 per-entry duration，但實際播放頁只支援手動點擊箭頭與縮圖切換，沒有依 playlist duration 自動前進。這讓 `Images` 在系統裡更像可切換的 gallery，而不是正式輪播鏈的一部分，也使管理端設定的每張停留秒數沒有真正生效。

## What Changes

- 讓 `Images` 播放頁依 resolved playlist entry 的 `durationSeconds` 自動推進 active slide。
- 明確定義 autoplay 在 manual navigation、fallback entry、單張 playlist 與無可播放項目時的 runtime 行為。
- 讓 autoplay timer 與既有 playlist runtime refresh contract 相容，避免 refresh 後跳回錯誤 index 或重複重置。
- 保持現有 image management/governance 與 fallback mode 模型不變，只補上播放 runtime 的輪播控制。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `images-playlist-management`: 將 `Images` display route 對 playlist sequence 的使用擴大為 duration-driven autoplay runtime，而不是僅支援手動切換。

## Impact

- Affected specs: `images-playlist-management`
- Affected code:
  - New: `apps/web/src/hooks/useImagesAutoplay.ts`, `apps/web/src/hooks/useImagesAutoplay.test.ts`
  - Modified: `apps/web/src/pages/Images/index.tsx`, `apps/web/src/pages/Images/viewModel.ts`, `apps/web/src/hooks/useImagePlaylistRuntime.ts`, `apps/web/src/pages/Images/layout.test.ts`, `apps/web/src/pages/Images/viewModel.test.ts`, `apps/web/package.json`
  - Removed: none
