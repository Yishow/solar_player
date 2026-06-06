# FHD Playback Fresh Witness — polish-pass-1 (2026-06-06)

Run id: `polish-pass-1` · viewport 1920×1080 · freeze `?autoplay=0` · base-url `http://localhost:5173`
Screenshots: `docs/fhd-witness/runs/polish-pass-1/playback/*.png`
比對對象：`docs/reference/FHD/01-05`。本輪由具視覺能力的主 session 親自讀圖比對（非 proxy）。

這份是 Phase 1 四個 polish change 完成後的 fresh 視覺 witness，確認 config-backed 調整是否朝 reference 收斂，並標記殘留 actual-gap。**本輪只取得視覺/結構證據，不取得 runtime parity / publish refresh / fallback witness，故五頁 launch status 維持 `blocked`。**

## Per-Page Result

| Route | config-backed 目標 | 視覺結果（vs reference） | 殘留缺口（classification） |
| --- | --- | --- | --- |
| `/overview` | KPI 字級/padding 微增、左緣 fade 放寬 | **PASS**：5 卡高度/value 主導性與節奏對齊 reference；左緣 fade 柔和 | hero 照片偏洗白且偏建物特寫，缺前景草地/光電板綠意（素材/CSS actual-gap，非 fade 參數） |
| `/solar` | connector 三條加粗、KPI 等寬 | **PASS**：solar→inverter→factory 綠線清晰可辨、orange CO2 線在；五卡等寬 | flow node icon 偏淡/generic，需提綠飽和（CSS actual-gap） |
| `/factory-circuit` | 無（全 actual-gap） | **GAP 確認**：配電盤→6 負載的扇出電路線在 fresh 幾乎不可見，reference 為清晰綠色扇出 | 電路線寬：可見 routing 為 PNG 點陣，需改可調 SVG（Phase 4 最高優先） |
| `/images` | media stage 放大、info panel 加寬、caption 字級 | **PASS**：stage 量體略增、caption card 加寬 | 4-up thumbnail 僅 1 張（playlist 1 entry，BLOCKED→Phase 3 seed）；caption 內容 placeholder（資料） |
| `/sustainability` | ring glowOpacity 0.24→0.16 | **PASS**：右上 ring glow 較克制、不再過亮 | hero 整體偏淡/洗白、綠 palette 飽和不足（CSS actual-gap） |

## Cross-Page Themes（Phase 4 優先序）

1. **Factory 電路線不可見（最嚴重）**：reference 的綠色扇出 routing 在 current 幾乎消失；需把 routing 從烘焙 PNG 換成 config 可調 SVG stroke。
2. **Hero 照片偏洗白**：Overview / Sustainability 的 hero 比 reference 淡、飽和不足；屬 CSS/media saturation actual-gap（heroMedia 效果僅 opacity/blur，無飽和欄位）。
3. **Node / icon 飽和偏淡**：Solar flow node、Factory node tile 偏 generic；CSS palette actual-gap。
4. **Placeholder 資料**：Images caption、Sustainability 多張 stat 顯示「內容整理中」/placeholder，使畫面不如 reference 真實——屬資料/seed，非視覺 config。

## Launch Status

五頁維持 `blocked`（見 `display-launch-witness-matrix.md`）。本輪僅 visual/structure witness；runtime parity、publish refresh、fallback witness 尚未取得。視覺改善不單獨使任何頁 launch-ready。
