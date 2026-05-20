## Context

`Slideshow Preview` 已經能透過 `usePageRotation()` 顯示目前頁、倒數、進度與可視卡片，但它還不知道現在的有效播放序列是如何被 rotation plan、skip state、fallback route 決定的。對 operator 來說，這頁好看但還不夠可調試。

## Goals / Non-Goals

**Goals**

- 讓 `Slideshow Preview` 揭露 rotation debug 所需的有效序列與決策資訊。
- 對齊這頁與 `Playback Settings` / display ops summary 的 rotation 語意。
- 補齊預覽 debug regression tests。

**Non-Goals**

- 不把這頁做成新的設定編輯器。
- 不重寫輪播控制器演算法。

## Decisions

### Expose effective rotation reasoning in the preview surface

除了目前的視覺卡片與倒數，預覽頁還應顯示目前 effective rotation rows、被 skip 的頁面、以及 fallback route。這些資訊 already exists elsewhere；本 change 是把它拉進 preview surface 成為可調試資訊。

### Keep preview debug state aligned with the playback controller

`Slideshow Preview` 不能自己發明另一套輪播解讀邏輯。它必須使用與 playback controller、rotation preview、display ops summary 同源的 state，避免 debug 頁與真正播放決策分裂。

## Implementation Contract

- Behavior: `Slideshow Preview` SHALL 顯示 effective rotation sequence、skipped pages、與 fallback route，讓 operator 能理解為什麼現在播的是這一頁。
- Interface / data shape: preview view model SHALL 產出可視播放序列與 debug sequence 的差異、skip summaries、fallback route、以及目前頁的決策上下文。
- Failure modes: 若 debug state 無法取得，頁面可退回基本 preview，但必須顯示 debug 資訊 unavailable，而不是假裝沒有 skip/fallback。
- Acceptance criteria: `apps/web/src/pages/SlideshowPreview/viewModel.test.ts` 與 `apps/web/src/pages/SlideshowPreview/index.test.ts` SHALL 覆蓋 skip state、fallback route、以及 debug rows 的輸出。
- Scope boundaries: 本 change 只提升 preview 為 debug surface，不修改 rotation engine 的排程邏輯。

## Risks / Trade-offs

- [Risk] 預覽頁資訊過多 → Mitigation: 把 debug state 放在清楚的摘要區塊，不干擾原本 carousel 視覺重點。
- [Risk] debug state 與 controller 不同步 → Mitigation: 讓 preview 僅消費既有 playback/rotation state，不自行重算。
