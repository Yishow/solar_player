# Playback Media Evidence Bundle

## Build Result

- Command: `pnpm --filter @solar-display/web build`
- Last verified: 2026-05-13
- Result: pass
- Additional page-local verification:
  - `pnpm --filter @solar-display/web test -- src/pages/Images/viewModel.test.ts src/pages/Sustainability/viewModel.test.ts`
  - Result: pass (`15/15`)

## Route: `/images`

- Prototype screenshot anchor:
  - `docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/04-images.png`
- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/04-images.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/04-images.png`
- Current implementation notes:
  - 已對位主媒體框、左右切換箭頭、縮圖帶與右側資訊欄。
  - 缺 asset 時保留完整 media slot，顯示「等待圖片素材」placeholder，不新增後端依賴。
- Walkthrough note:
  - 本輪已補 current-route FHD screenshot；畫面維持大圖主視覺、右側資訊欄與底部 footer nav，不會因素材缺漏而退化成空白頁。

## Route: `/sustainability`

- Prototype screenshot anchor:
  - `docs/reference/kuozui-green-fhd-html-prototype/assets/generated/slideshow-preview/05-sustainability.png`
- Prototype source:
  - `docs/reference/kuozui-green-fhd-html-prototype/html-pages/05-sustainability.html`
- Current-route screenshot:
  - `artifacts/umbrella-final-fhd/05-sustainability.png`
- Current implementation notes:
  - 已對位 hero、三張 big-number 卡、三張 ESG/stat cards 與 highlights strip。
  - 缺 summary 時回退到可讀 fallback numbers，不發明新的 backend contract。
- Walkthrough note:
  - 本輪已補 current-route FHD screenshot；hero image、big-number block 與 ESG 卡片在 fallback summary 下仍維持 prototype 節奏與可讀性。
