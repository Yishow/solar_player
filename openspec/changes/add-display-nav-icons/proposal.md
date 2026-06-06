## Why

意圖參考 docs/reference/Better/01.Overivew (大).png 的底部導覽在文字標籤旁帶有圖示，遠距觀看的展示牆用「圖示＋文字」比純文字更好辨識、也更貼近 reference 質感。目前 `AppFooterNav` 的 playback 導覽只渲染文字 `navLabel`。本次在不改變現行 5 條 playback route 的前提下，為每條 playback 導覽項目加上對應圖示。

底部導覽屬 shared chrome（protected-product-choice），本變更為刻意的產品決策，需簽核；不調整 route 結構、不改文字標籤內容。

## What Changes

- 為 5 條 playback route（Overview、Solar、Factory Circuit、Images、Sustainability）各定義一個導覽圖示，透過 route metadata 帶到 playback footer 導覽項目。
- `AppFooterNav` 的 playback 模式在每個導覽項目的文字標籤前渲染對應圖示；文字標籤、active 底線、排序、route 路徑均不變。
- 圖示優先重用既有 display 圖示資源／resolver；缺少合適圖示時補與 chrome 一致的最小 inline glyph。
- 對應 targeted tests：route metadata 帶 icon、playback footer 渲染 icon＋label。

## Non-Goals

- 不改 playback route 結構、數量、順序或文字標籤內容。
- 不為 management 模式底部導覽加圖示（本次僅 playback 顯示牆導覽）。
- 不改 shared header、slogan、footer 裝飾或 route 以外的 chrome。
- 不做 icon-only 導覽：維持圖示＋文字。

## Capabilities

### New Capabilities

- `display-nav-route-icons`: playback 底部導覽為每條 playback route 在文字標籤旁顯示對應圖示，route 結構與標籤不變。

### Modified Capabilities

(none)

## Impact

- Affected specs: 新增 `display-nav-route-icons`
- Affected code:
  - Modified:
    - apps/web/src/app/routeMeta.ts
    - apps/web/src/app/playbackRouteMeta.ts
    - apps/web/src/components/AppFooterNav.tsx
  - New:
    - apps/web/src/components/AppFooterNav.icons.test.tsx
  - Removed: (none)
