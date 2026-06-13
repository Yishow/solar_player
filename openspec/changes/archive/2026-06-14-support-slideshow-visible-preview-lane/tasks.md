## 1. 建立 Slideshow Preview visible lane

- [x] [P] 1.1 交付 Slideshow Preview loads visible cards before deferred preview cards，並落實 Visible-card preview lane first：在 apps/web/src/pages/SlideshowPreview/index.tsx 收斂 visible card window 與 deferred cards 的 preview lane，並以 visible-card tests 驗證 deferred cards 不阻塞首屏 queue。
- [x] [P] 1.2 交付 Slideshow Preview keeps controls and queue behavior stable during deferred preview loading，並落實 Rotation controls stay outside deferred preview loading：以 summary、queue、manual next / prev tests 驗證 controls 不退化。

## 2. 鎖定 queue / error 語意

- [x] 2.1 交付 Slideshow Preview keeps controls and queue behavior stable during deferred preview loading，並落實 No-regression queue and error behavior：以 error-lane focused tests、spectra analyze、與 spectra validate 驗證 failed card 不拖垮整頁。
