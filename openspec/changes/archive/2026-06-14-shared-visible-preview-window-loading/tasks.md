## 1. 建立 shared preview window contract

- [x] [P] 1.1 交付 Preview consumers load the requested visible window first，並落實 Requested visible window first：在 apps/web/src/pages/shared/useLiveDisplayPagePreviewCatalog.ts 與 apps/web/src/pages/shared/liveDisplayPagePreviewCatalogLoader.ts 加入 requested window contract，並以 preview catalog tests 驗證 visible cards 不等待 deferred keys。
- [x] [P] 1.2 交付 Deferred preview failures stay isolated 與 Visible preview loading preserves page-instance identity，並落實 Deferred keys keep isolated state：在 shared preview loader tests 中固定 single-key failure isolation 與 duplicate-instance identity，驗證失敗 card 不清空其他 usable cards，且不同 pageKey 不被合併。

## 2. 整合 preview consumer

- [x] 2.1 將 Preview consumers load the requested visible window first 與 No-regression preview refresh boundary 套用到 apps/web/src/pages/PlaybackSettings/index.tsx 與 apps/web/src/pages/SlideshowPreview/index.tsx，並以 focused component tests、spectra analyze、與 spectra validate 驗證 refresh semantics 不退化。
