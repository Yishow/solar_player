## Summary

將 DisplayCanvas 由非等比的雙軸縮放改為等比縮放（取長短邊較小比例）並置中 letterbox，使非 16:9 或直向螢幕不再變形；16:9 螢幕行為維持完全不變。

## Motivation

`DisplayCanvas` 目前以 `transform: scale(scaleX, scaleY)` 分別依寬高縮放固定的 1920×1080 畫布。當實際螢幕不是精確 16:9（或使用直向 portrait）時，內容會被拉伸：圓形變橢圓、字體比例失真、logo 變形。`playback_settings` 甚至提供 portrait 選項，但縮放邏輯並不支援非 16:9，兩者矛盾。改為等比縮放可保留正確長寬比，代價是非 16:9 時出現 letterbox 留白。

## Proposed Solution

- 新增純函式 `computeCanvasLayout(viewport, design)` 計算 `{ scale, offsetX, offsetY }`：`scale = min(viewport.width / design.width, viewport.height / design.height)`，並將縮放後的畫布置中（letterbox 留白平均分配於兩側或上下）。
- `DisplayCanvas` 改用單一 `scale` 與置中位移渲染畫布，外層 viewport 容器以 `--stage-bg` 作為 letterbox 底色。
- 16:9 viewport 時 `offsetX = offsetY = 0` 且行為等同現況（像素級不變）。

## Non-Goals (optional)

(none — design.md 會記錄 Goals/Non-Goals)

## Alternatives Considered (optional)

- 維持雙軸縮放：最省事但保留變形問題，且與既有 portrait 設定矛盾，不採用。
- 以 CSS `object-fit`/`aspect-ratio` 容器處理：畫布為絕對定位的 transform 縮放結構，改用容器排版牽動較大，純函式 + transform 位移改動最小。

## Impact

- Affected specs: display-canvas-aspect-preserving-scaling（新增）
- Affected code:
  - New:
    - apps/web/src/components/displayCanvasLayout.ts
  - Modified:
    - apps/web/src/components/DisplayCanvas.tsx
  - Removed:
    - (none)
