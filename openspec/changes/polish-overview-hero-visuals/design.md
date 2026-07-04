## Context

目前 `/overview` 播放頁面的 Hero 區塊在大螢幕 FHD (1920x1080) 投影展示時，有一些視覺細節尚待精細化優化。特別是：
- 隨機大背景圖片在亮色或複雜的圖像下，可能會使左側的標題文字對比度不足。
- 黃金分割線（Gold Line）為單一實色線條，在兩端突兀地截斷。
- 樹葉浮水印（Leaf Ornament）為完全靜態，缺乏動態展示系統的流動感。
- 背景圖片在隨機輪播更換時直接閃爍切換，缺乏平滑的 cross-fade 過渡效果。

本設計旨在不修改 API、資料庫結構及編輯器 schema 的前提下，透過純 CSS 與前端 React 組件狀態升級，提昇整體的視覺精緻度。

## Goals / Non-Goals

**Goals:**
- 在標題與副標題文字加入極為柔和的 `text-shadow`，保證任意背景圖下的可讀性。
- 將 Gold Line 改為兩端漸變淡出的金屬線。
- 為 Leaf Ornament 加入微幅的 CSS 旋轉與透明度呼吸動畫。
- 實作背景大圖的 cross-fade 平滑過渡動效。

**Non-Goals:**
- 不修改與後端 API、SQLite 或 MQTT 相關的資料結構。
- 不增加額外的編輯器 Config schema 欄位，以維護現有編輯器的相容性。

## Decisions

### 1. 文字陰影處理 (Subtle Text Shadow)
在 `overview.css` 中為標題區 `.overview-title-group` 下的標題、副標題與 eyebrow 套用柔和文字陰影。因為文字是亮色，所以使用黑色大半徑、低透明度的陰影：
```css
text-shadow: 0 4px 24px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.12);
```

### 2. 漸變金屬分割線 (Gradient Gold Line)
在 `overview.css` 中的 `.overview-gold-line` 改用 `background: linear-gradient(...)` 代替 `background-color`，使線條向兩端漸變消失為透明。

### 3. 樹葉浮水印呼吸動畫 (Leaf Ornament Animation)
利用 CSS `@keyframes` 為 `.overview-leaf-watermark` 加入以 `transform` 和 `opacity` 為主的微幅呼吸起動畫：
- 旋轉角度在 `-15deg` 至 `-12deg` 之間緩慢變動。
- 透明度在 `0.38` 與 `0.46` 之間進行微幅呼吸（預設透明度約為 `0.44`）。

### 4. 背景切換平滑 cross-fade
在 `Overview` 元件中，為了讓背景圖切換時呈現 cross-fade 效果，需要有兩個圖片的重疊渲染。可以利用 React 狀態記錄「當前背景」與「先前背景」，在背景變更時，透過 CSS transition 將舊背景透明度降至 0，新背景透明度升至 1，以達到平滑的 cross-fade。

## Implementation Contract

- **Behavior**：用戶進入 `/overview` 時標題清晰，金屬線呈漸變消隱，樹葉微微呼吸擺動。當背景圖片輪播切換時，新舊大圖平滑 cross-fade。
- **Interface / data shape**：
  - 修改 `apps/web/src/pages/Overview/overview.css`。
  - 修改 `apps/web/src/pages/Overview/index.tsx` 以支援雙背景 cross-fade 狀態管理。
- **Failure modes**：若 cross-fade 動效在切換中途因網路載入延遲而中斷，應直接以 fallback 背景或 CSS transition 降級處理，不造成頁面閃爍或白畫面。
- **Acceptance criteria**：
  - 執行 `pnpm --filter @solar-display/web test` 通過。
  - 在瀏覽器實際觀看 `/overview` 時，確認 cross-fade、金屬線漸變、文字陰影及樹葉呼吸效果正常。
- **Scope boundaries**：本案變更僅限於 `/overview` 播放頁面內的 Hero 元件與 CSS，不涉及其他頁面與系統架構。

## Risks / Trade-offs

- **[Risk]** CSS 動畫可能在低效能主機（如 Raspberry Pi 5）上造成多餘負載。
- **[Mitigation]** 所有動畫皆限制使用 `transform` 與 `opacity` 等 GPU 加速的合成器屬性，避免觸發排版重排 (reflow)，以維持流暢性能。
