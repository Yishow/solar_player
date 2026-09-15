# Phase 4 視覺 witness 比對 — 2026-06-07

對象 change：`extend-display-editor-ornament-and-media-controls`、`extend-typography-palette-and-fix-ornament-bindings`
Witness run：`phase4-pass-1`（`docs/fhd-witness/runs/phase4-pass-1/playback/*.png`）
基準：`docs/reference/FHD/01–05`。方法：主 session 逐頁讀圖（方向+幅度，非像素）。

## 逐頁判讀

| 頁 | change 範疇的視覺項 | 判讀 |
| --- | --- | --- |
| Overview | hero media 飽和、KPI 字級、nav 圖示 | hero 左側仍偏洗白（△ 改善不明顯）；nav 圖示已渲染（✓，bonus）；版面對齊 reference 佳 |
| Solar | gold line 傾角、connector、flow node | connector/flow 結構貼 reference（✓）；node tile 綠飽和仍偏淡偏 generic（△ 已知缺口未動） |
| Factory Circuit | leaf opacity binding、palette | leaf 已呈低 opacity 細緻態，非滿版（✓ binding fix 落地）；node 綠偏淡（△） |
| Images | media stage 圓角/shadow/全出血、thumb 圓角 | stage 圓角+shadow、caption card、thumb strip 全到位（✓ 最貼 reference 的一頁） |
| Sustainability | hero 飽和、ring/leaf、copy-en 字級、leaf rotation binding、palette | leaf rotation 非 identity（✓）；hero 左側仍偏洗白（△）；palette 整頁仍略冷（△） |

## 結論

- **這兩個 change 的 config 改動確實落地且可驗**：Images stage、Factory/Sustainability leaf binding、Solar connector、（附帶）nav 圖示。
- **部分目標僅部分達成/不確定**：Overview/Sustainability hero「偏洗白」改善幅度小；整頁綠 palette 仍略冷；Solar/Factory node tile 綠飽和偏淡 — 後者是 handoff 已標、不屬這兩個 change 範疇的另開缺口。
- **截圖整體仍明顯短於 reference 的主因不是視覺 config，而是 DATA**：五頁普遍是 placeholder/錯量級值（如 Sustainability `0.0 GWh`、`75.0%`、`內容整理中`；Overview `111 kWh` vs `3,842`）。屬 seed/runtime data，非本兩個 change 的 scope。
- **brand logo** 全頁渲染為紅色角標 vs reference 綠色「K」，跨頁一致 — 屬 brand asset/config 差異，非這兩個 change 造成。
- 待查小項：Sustainability hero 區出現兩張浮動小卡（`0 / 28 P CO2 減`），reference 無對應 — 疑為 layout/data artifact，值得單獨確認。

## 後續建議（不在本次驗證 scope）
1. node tile 綠飽和 + hero 洗白 + palette 偏冷：可併入既有 ornament/palette change 範疇再 tune 一輪，或另開小 change。
2. demo/seed data 飽滿度：另開 seed/runtime data change，與視覺 config 分離。
3. Sustainability 浮動小卡：先確認是 config 還是 data 來源。

launch status 維持 `blocked`。
