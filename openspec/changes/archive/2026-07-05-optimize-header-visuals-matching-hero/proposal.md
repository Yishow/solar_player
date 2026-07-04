## Why

本變更旨在優化播放端（Playback）Header 標題列的視覺外觀，使其融入下方 Overview 頁面 Hero 區域的精緻設計語彙（包括文字陰影、色彩層次與金色漸層分割線等特徵），從而提升整體系統的視覺一致性與高級質感。

## What Changes

- 調整 Header 的品牌與系統標題，為其套用與 Hero 主標題一致的文字陰影效果，增強立體感。
- 將系統標題「綠能展示系統」中的關鍵字「綠能」改為強調綠色（var(--display-emphasis-green)）。
- 將時鐘區域的時間文字加上微弱的綠色/金色背光光暈（Glow）。
- 將 Header 下方的灰色漸層分割線替換為金色漸層分割線（--display-ornament-gold-strong）。
- 為 Header 右側天氣 SVG 圖示加上溫和的慢速旋轉與呼吸微動畫。
- 微調時鐘區的日期與星期顏色，使其更柔和（改為 var(--shell-kicker-muted)），突出發光時鐘的視覺層次。
- 為右側天氣文字與連線狀態標籤套用與左側一致的文字陰影，確保在各種播放背景下的可讀性。

## Non-Goals

- 不在此變更中為 Header 引入複雜的玻璃擬態圓角卡片化背景（維持原有的透明背景特徵）。
- 不調整 Header 的佈局結構、Z-Index、MQTT 連線邏輯與天氣資料來源 API。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/components/AppHeader.tsx
    - apps/web/src/styles/global.css
