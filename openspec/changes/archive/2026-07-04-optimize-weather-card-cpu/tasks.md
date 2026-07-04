## 1. 天氣卡 React 元件雨滴重構

- [x] 1.1 修改 `WeatherCardWidget.tsx` 中的 `renderWeatherIcon` 雨天分支。新增 `<defs>` 與 `<clipPath id="overview-rain-clip">`，並在 clipPath 中套用兩組縱向錯位的雨滴 path。

## 2. 天氣卡 CSS 雨動效 GPU 加速

- [x] 2.1 修改 `apps/web/src/pages/Overview/overview.css`，將 `.overview-weather-rain-drop` 的動畫修改為操作 `.overview-weather-rain-drops` 的 `transform: translateY(8px)`，替換掉原本的 `stroke-dashoffset` 寫法。
- [x] 2.2 執行測試並生成 `fhd:witness` 確保畫面正確，無溢出。
