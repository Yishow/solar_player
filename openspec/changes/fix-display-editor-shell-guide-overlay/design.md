## Context

現行 editor preview 結構將 `AppHeader` 與 `AppFooterNav` 作為 shell chrome，page content 另放在 content viewport。`DisplayEditorCanvasOverlay` 目前附著在 content viewport，因此 page guides 有 dashed style，但 header/footer 區域不會被 overlay 畫到。

## Goals

- 在同一個 `/display-pages/editor` preview 中顯示完整 shell dashed guides。
- 讓 header/content/footer 分界可視化，避免 operator 只能靠猜測對齊 shell chrome。
- 不改 display page draft/live schema，也不把 shell decoration authoring 合進本 change。

## Non-Goals

- 不新增 shell decoration 物件編輯能力。
- 不改 playback runtime 的 header/footer layout 尺寸。
- 不改現有 page region measurement 計算語意。

## Decisions

### Overlay Anchoring

Guide overlay SHALL be anchored to the full preview shell coordinate system, then derive content guide positions from the existing content offset. This keeps header/footer and page content guides in one visual layer without requiring separate unscaled overlays.

### Shell Band Guides

The editor SHALL render explicit dashed shell band guides for:

- shell top edge
- header/content boundary
- content/footer boundary
- shell bottom edge

Existing page region guides remain page-scoped and keep their current labels.

### Interaction Safety

The new shell-wide overlay remains passive. It MUST NOT intercept pointer events intended for canvas region selection, drag, resize, zoom, or pan.

## Verification

- Unit tests cover shell band guide generation and style mapping.
- Editor route tests assert header/footer guide elements exist when edit mode and full-canvas overlay are active.
- Existing canvas interaction tests continue to pass to prove overlay anchoring did not break manipulation.
