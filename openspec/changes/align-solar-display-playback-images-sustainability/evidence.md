# Playback Media Evidence Bundle

## Build Result

- Command: `pnpm --filter @solar-display/web build`
- Last verified: 2026-05-13
- Result: pass

## Route: `/images`

- Prototype screenshot anchor:
  - `docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/04-images.png`
- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`
- Current implementation notes:
  - 已對位主媒體框、左右切換箭頭、縮圖帶與右側資訊欄。
  - 缺 asset 時保留完整 media slot，顯示「等待圖片素材」placeholder，不新增後端依賴。
- Fallback gap note:
  - 尚未存入「目前 route 的實際執行截圖」。這輪本機沒有可直接使用的 screenshot CLI，需在下一輪用 browser automation 補抓 current-route screenshot。

## Route: `/sustainability`

- Prototype screenshot anchor:
  - `docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/05-sustainability.png`
- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`
- Current implementation notes:
  - 已對位 hero、三張 big-number 卡、三張 ESG/stat cards 與 highlights strip。
  - 缺 summary 時回退到可讀 fallback numbers，不發明新的 backend contract。
- Fallback gap note:
  - 尚未存入「目前 route 的實際執行截圖」。這輪先用 prototype screenshot 當對照錨點，current-route screenshot 待 browser automation 補件。
