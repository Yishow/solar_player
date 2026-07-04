## Context

目前天氣卡的雨滴動畫採用修改 `stroke-dashoffset` 屬性，這會造成瀏覽器在每一幀都對 SVG 進行 Paint（重繪），造成不必要的 CPU 負擔。

## Goals / Non-Goals

**Goals:**
- 將雨滴動畫完全改為 `transform` (GPU) 驅動。
- 使用 `clip-path` 限制雨滴的渲染與位移範圍。

**Non-Goals:**
- 不改變天氣卡的佈局或配色。

## Decisions

### Decision 1: 使用 `clipPath` 與兩組縱向錯位雨滴實現無縫循環位移
- **方案**：
  1. 在 `WeatherCardWidget.tsx` 中，為雨天狀態的 SVG 新增 `<defs>`，內含 `<clipPath id="overview-rain-clip"><rect x="2" y="14" width="20" height="8" /></clipPath>`。
  2. 將雨滴路徑改為一個包在 `<g clipPath="url(#overview-rain-clip)">` 下的 `<path className="overview-weather-rain-drops">`。
  3. 雨滴路徑 `d` 包含兩組 y 座標相差 8px 的雨滴：`d="M8 15v3 M12 17v3 M16 16v3 M8 7v3 M12 9v3 M16 8v3"`。
  4. 當路徑往下移動 8px (y 從 -8px 到 0，或 0 到 8px) 時，視覺上完全無縫銜接。
- **理由**：`transform: translateY` 屬於 GPU 合成屬性，完全不觸發 Paint 流程，在效能敏感的 Kiosk（如 Raspberry Pi 5）上能完全釋放 CPU。

## Implementation Contract

**觀察行為 (Behavior)**
- 進入 `/overview` 時，雨天狀態的天氣卡會展示平滑降落的雨滴效果，且無任何卡頓或 CPU 高負載跡象。

**驗收標準 (Acceptance Criteria)**
- 控制台無報錯，單元測試通過。
- 透過 `pnpm run fhd:witness` 擷取截圖，檢查雨天狀態（若可模擬）圖示正常，雨滴沒有溢出雲朵或指標晶片。
