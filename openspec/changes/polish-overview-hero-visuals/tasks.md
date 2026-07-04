## 1. 視覺美化與微動效實作 (Visual Refinement & Micro-animations)

- [x] 1.1 實作 1. 文字陰影處理 (Subtle Text Shadow) 以保證任意背景圖下的可讀性，並於 `/overview` 播放頁面手動檢查文字可讀性。
- [x] 1.2 實作 2. 漸變金屬分割線 (Gradient Gold Line) 使 Gold Line 兩端漸變消隱，並於播放頁面手動確認線條在畫面兩側自然漸變消失。
- [x] 1.3 實作 3. 樹葉浮水印呼吸動畫 (Leaf Ornament Animation) 讓 Leaf Ornament 微微呼吸擺動，並於播放頁面手動觀察樹葉是否有微幅擺動與透明度呼吸效果。

## 2. 背景切換過渡與測試驗證 (Background Transition & Verification)

- [x] 2.1 實作 4. 背景切換平滑 cross-fade 支援新舊背景大圖 cross-fade 平滑過渡，並於 `/overview` 播放頁面切換背景時，手動觀察平滑漸變效果。
- [x] 2.2 執行單元與渲染測試以確保無 regression，執行 `pnpm --filter @solar-display/web test` 通過。
- [x] 2.3 跑 witness 並更新 evidence bundle，執行 `pnpm run fhd:witness` 重新產出截圖。
