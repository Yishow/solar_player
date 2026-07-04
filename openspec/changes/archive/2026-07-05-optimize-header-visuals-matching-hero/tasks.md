## 1. 樣式調整與實作

- [x] 1.1 依據 "Decision: 在 CSS 中統一管理 Header 的 Hero 語彙樣式" 的決定，修改 global.css，為播放端 Header 套用與 Hero 一致 the 文字陰影效果，並將下方灰色分割線改為金色漸層線，驗證方式為手動確認 CSS 語意及透過瀏覽器檢查 Element 樣式。
- [x] 1.2 修改 AppHeader.tsx，將「綠能展示系統」的「綠能」關鍵字改為強調綠色 (var(--display-emphasis-green))，並為時鐘區數字引進微弱的 Glow 光暈，驗證方式為手動啟動 web App 並確認 Header 的文字樣式符合視覺標準。
- [x] 1.3 依據 "Decision: 優化天氣圖示動畫與時鐘資訊層次對比" 的決定，為天氣太陽 SVG 圖示在 global.css 中實作慢速旋轉與呼吸感的 @keyframes 動畫，並在 AppHeader.tsx 中為 WeatherGlyph 套用該 class，驗證方式為手動啟動 App 觀察動畫是否流暢播放。
- [x] 1.4 修改 AppHeader.tsx，將時鐘區的日期與星期文字顏色改為 var(--shell-kicker-muted)，以強化與時鐘發光數字的視覺對比，驗證方式為確認網頁文字顏色渲染符合預期。
- [x] 1.5 修改 AppHeader.tsx，為右側天氣文字與連線狀態標籤套用極輕微、發散的軟陰影（方案 A），驗證方式為手動啟動 App 確認視覺陰影輕盈無髒感。

## 2. 測試驗證

- [x] 2.1 執行 pnpm test，確認所有與 Header 或頁面 Chrome 相關的測試皆能通過，驗證方式為 CLI 輸出成功且無 regression。
