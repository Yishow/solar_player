## Why

Images 的 hotspot 很集中：active item change 與 playlist runtime 仍耦合太緊，導致 autoplay、manual navigation、與 playlist refresh 容易互相放大。這頁適合拆成單一 change，把「切圖是本地狀態、playlist refresh 是遠端同步」的契約寫清楚。

## What Changes

- 將 active item navigation 與 remote playlist read 分離。
- 規範 autoplay、manual navigation、playlist refresh、與 active item reconcile 的邊界。
- 鎖定 no-regression 邊界：fallback、active caption、thumbnail、與 visible stage 行為不得退化。

## Non-Goals (optional)

- 不調整 Images 的 FHD 版面或 editor schema。
- 不處理其他 playback 頁。

## Capabilities

### New Capabilities

- playback-images-local-playlist-navigation: 定義 Images 以本地 active item navigation 驅動可見切圖，並與 remote playlist refresh 解耦。

### Modified Capabilities

(none)

## Impact

- Affected specs: playback-images-local-playlist-navigation
- Affected code:
  - New: (none)
  - Modified: apps/web/src/hooks/useImagePlaylistRuntime.ts, apps/web/src/pages/Images/index.tsx
  - Removed: (none)
