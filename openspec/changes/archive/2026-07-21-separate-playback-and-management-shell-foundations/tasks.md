## 1. Shell split

- [x] 1.1 實作 `Separate playback shell from management shell`，建立 playback-only `DisplayCanvas` 邊界，落實 `displaycanvas is playback-only`。
- [x] 1.2 調整 route-to-shell resolution，讓 management routes 不再經過 playback scaling，落實 `management shell should own normal scrolling and width`。

## 2. Surface verification

- [x] 2.1 驗證 display editor、Playback Settings、Image Management、Device Status 等管理頁可 full-bleed 使用 viewport。
- [x] 2.2 檢查共用 header/footer/nav 在兩種 shell 下的尺寸與互動一致性，落實 `shared brand chrome can stay, layout strategy cannot`。

## 3. Regression tests

- [x] 3.1 補 layout or render regression tests，防止 management surface 再次被包回 playback canvas。
- [x] 3.2 執行 web tests 與 build。
