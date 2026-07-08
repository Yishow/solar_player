## Why

因為在 Hover 狀態下，卡片套用位移（translateY）與放大（scale）動畫時，若滑鼠剛好停留在卡片邊緣，會因為卡片上移使滑鼠脫離卡片，進而造成卡片在「觸發 Hover」與「失去 Hover」之間快速交替，產生嚴重的抖動（flickering）問題。

## What Changes

- 移除全站互動式卡片（管理卡片、素材庫卡片、資料源設定卡片、準備度項目等）在 Hover 狀態下的位移（`translateY`）與縮放（`scale`）動畫。
- 僅保留陰影加深、邊框顏色與背景色的平滑轉場變化，確保在不產生抖動的前提下提供良好的互動反饋。

## Non-Goals (optional)

- 不調整非 Hover 觸發的位移動畫（例如置中對齊用的 `translateY(-50%)` 或天氣的雨滴動畫）。
- 不改變卡片基本的陰影、邊框和背景色的轉場時間與樣式。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

(none)

## Impact

- Affected code:
  - Modified:
    - apps/web/src/styles/management.css
    - apps/web/src/pages/AssetLibrary/assetLibrary.css
    - apps/web/src/pages/CircuitSettings/circuitSettings.css
    - apps/web/src/pages/ImageManagement/imageManagement.css
    - apps/web/src/pages/Images/images.css
    - apps/web/src/pages/DataSourceSettings/index.tsx
