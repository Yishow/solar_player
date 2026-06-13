## 1. 收斂 Images 切圖契約

- [x] [P] 1.1 交付 Images advances the active item locally from a reusable playlist payload，並落實 Local active item navigation first：在 apps/web/src/hooks/useImagePlaylistRuntime.ts 與 apps/web/src/pages/Images/index.tsx 分離 reusable playlist payload 與本地 active item state，並以 autoplay / manual navigation / shuffle tests 驗證不會 per-item remote read。
- [x] [P] 1.2 交付 Images reconciles the active item after playlist refresh without visible regression，並落實 Remote refresh only on playlist changes：在同一 hook 與頁面組件收斂 refresh 後的 active item reconcile，並以 refresh tests 驗證 playlist 更新時可見 stage 不退化。

## 2. 鎖定 fallback 邊界

- [x] 2.1 交付 Images reconciles the active item after playlist refresh without visible regression，並落實 No-regression visible stage, shuffle, and fallback behavior：以 caption / thumbnail / shuffle / fallback focused tests、spectra analyze、與 spectra validate 驗證可見結果等價。
