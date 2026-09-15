# FHD Playback Boundary Classification — 2026-06-05

Run id: `reference-informed-closeout`
Witness command: `pnpm run fhd:witness -- --base-url http://localhost:5173 --run-id reference-informed-closeout`
Evidence bundle: `docs/fhd-witness/runs/reference-informed-closeout/evidence-bundle.md`
Viewport: 1920x1080 · capture freeze: `?autoplay=0`

這份 boundary classification 是五頁 reference-informed closeout 的執行輸入。所有 measured 值來自 freeze 後（`?autoplay=0`）的真實 DOM 量測（`getBoundingClientRect` / `getComputedStyle`），不是 pixel-diff，也不是臆造。下游四個 page closeout change 只能處理本表 `reference-quality-target` 列，或本表明確列出的 `actual-gap` follow-up。

## Capture Method And A Capture Blocker That Was Fixed

- 首次 witness 五頁截圖內容相同：根因為 (1) 只起 `pnpm dev:web`（缺後端 `:3000`，playback API 無資料 → 頁面空），與 (2) playback 頁 autoplay 輪播會把 deep-link 帶回當前輪播幀。
- 修正：改用完整 `pnpm dev`（server + web），並新增 witness-only freeze 控制 `?autoplay=0`（`apps/web/src/layouts/playbackRotationFreeze.ts`，接入 `LayoutShell`，`scripts/capture-fhd-witness.mjs` 截圖前自動套用）。freeze 只關閉輪播 tick 與 URL 對齊，不改任何 shell 視覺或佈局。
- 修正後重截：五張 playback 截圖 hash 各異、finalUrl 各自停在正確 route、DOM 內容為各頁本身。

## Protected Shell Boundary (All Five Pages)

| Surface | Classification | Protected Attributes | Measured | Witness Evidence | Accepted By | Revisit Trigger |
| --- | --- | --- | --- | --- | --- | --- |
| Shared display header | `protected-product-choice` | Height, top position, connection/weather info density | Top chrome band reserves 110–146px content offset; header element lives in shared shell, not page subtree | 五頁 freeze witness + 2026-06-05 product direction | Product review, 2026-06-05 user direction | Header content wraps/overlaps or loses 3–5m readability |
| Shared display footer / bottom band | `protected-product-choice` | Height, bottom position, five-route nav density | Bottom shell band ~72px (Solar/Sustainability measured y=1008 h=72) | 五頁 freeze witness + 2026-06-05 product direction | Product review, 2026-06-05 user direction | Nav labels wrap, footer overlaps content, or route count changes |

Protected 列只含 shared header/footer。任何 hero、KPI、flow、circuit、media stage、caption、ornament、highlight rail 一律進入 page content review（下方各頁表），不被 shell protection 豁免。

## Overview — `polish-overview-solar-reference-quality-targets`

| Surface | Classification | Measured | Editor-backed field | Revisit Trigger |
| --- | --- | --- | --- | --- |
| Hero photo fade (gradient + horizontal mask) | `reference-quality-target` | 2 overlay spans 540,146 750x690; gradient rgba(255,253,247,.96→.72@56%→0); mask linear-gradient(90deg, black 0→42%→transparent) | `heroMedia.effects` (overview-hero-media surface) | 人工看 01 PNG 確認 fade 柔和度/mask stop |
| Bilingual title line-height | `reference-quality-target` | font-size 82px, line-height 94.3px (1.15), letter-spacing 3px, weight 900 | `chrome.heroTypography.title*` | reference 雙語節奏比對 |
| Eyebrow / lead line-height | `reference-quality-target` | eyebrow 26/39 ls5 mb18; lead 26/35.1 (1.35) mt24 | `chrome.heroTypography.eyebrow*/subtitle*` | reference 比對 |
| KPI card height | `reference-quality-target` | 5 cards 352x232, radius 20, padding 20/16/24/24 | `kpiCards[key].height/width` + `cardStyles[key]` | reference KPI 量體 |
| KPI horizontal rhythm (gap) | `reference-quality-target` | gaps all 20px, lefts 40/412/784/1156/1528 (pitch 372) | `kpiCards[key].left` | reference 間距 |
| KPI hierarchy (value/title/icon) | `reference-quality-target` | value 64, title 18, subtitle 13, iconBox 54 | `cardStyles[key].valueFontSize/...` | reference 層級張力 |
| Gold line / leaf ornament | `reference-quality-target` | gold thickness 1 opacity 0.78; leaf opacity 0.44 scale 1.45 rotate -15deg | `chrome.ornaments.goldLine.*` / `leaf.*` | ornament balance |

Overview actual-gap：**無**。所有 page-content FHD direction 皆 editor-backed，可直接 polish。

## Solar — `polish-overview-solar-reference-quality-targets`

| Surface | Classification | Measured | Editor-backed field |
| --- | --- | --- | --- |
| Hero typography (title/eyebrow/subtitle) | `reference-quality-target` | title 80/92 ls6; eyebrow 24/36 ls9 mb18; subtitle 22/30.8 mt20 | `chrome.heroTypography.*` |
| Connector stroke width | `reference-quality-target` | solarToInverter 9px, inverterToFactory 9px, inverterToCo2 5px (orange) | `connectorTreatments[key].strokeWidth/lineCap/radius/opacity` |
| Flow node absolute coords | `reference-quality-target` | solar 795,162 · inverter 1180,162 · factory 1550,162 · co2 1545,494 (all 230x230) | `flowNodes[key].{left,top,width,height}` |
| Flow node source-like language | `reference-quality-target` | radius 999 圓底, bg rgba(255,253,247,.62), treatments default | `flowNodeTreatments[key].iconScale/iconLabelGap/valueAlign` |
| KPI row width/rhythm | `reference-quality-target` | widths 380/330/330/350/360, gap ≈16 不均 | `kpiCards[key].{left,width}` |

Solar actual-gap（→ editor capability follow-up，polish change 不得偷加 schema）：
- **Gold line 基底 left/top/width 與傾斜角**：`index.tsx` page-local hardcode；config 只有 thickness/opacity/offsetY。
- **Leaf ornament 基底 layout (left/top/width/height)**：`index.tsx` hardcode；config 只有 offset/scale/opacity。
- **Hero stage 圓角/框線 treatment**：heroContainer 只含 geometry，無 stage 圓角/邊框欄位（需人工看 02 PNG 確認是否需要）。

## Factory Circuit — `polish-factory-circuit-reference-quality-targets`

| Surface | Classification | Measured | Editor-backed field |
| --- | --- | --- | --- |
| Hero typography | `reference-quality-target` | title 80/92(1.15) ls6; subtitle 26/36.4(1.4) mt20; copy-zh 21/34.65(1.65) | `hero.*` + `heroTypography` (字級部分 CSS 固定) |
| Gold line ornament | `reference-quality-target` | height 2px opacity 1 | `chrome.ornaments.goldLine.thickness/opacity` |
| Leaf ornament opacity/scale | `reference-quality-target` | seed opacity 0.38 但實測 watermark img opacity 1（疑套用點不一致） | `chrome.ornaments.leaf.opacity/scale/offset*` |
| Flow node geometry | `reference-quality-target` | solar 666,322 136x240 · inverter 862,322 · board 1076,286 182x336 | `nodes[key].{left,top,width,height}` |
| Node icon scale/label/value align | `reference-quality-target` | iconScale 1, iconLabelGap 0, valueAlign center | `nodeTreatments[key].*` |
| Load panel geometry (避免管理表格) | `reference-quality-target` | 1392,146 470x580 | `loadPanel.*` |
| Load row vertical rhythm | `reference-quality-target` | 6 rows h84 pitch 95 gap 11 | `loadRows[key].top/height` |
| Load row internal rhythm | `reference-quality-target` | label 22/25.3 ls1; value 31/31; gap 24; padX 26; radius 16 | `rhythm.factoryLoadRows.*` |
| KPI card geometry | `reference-quality-target` | 5 cards h220 at top 760, per-card widths | `kpiCards[key].*` |

Factory actual-gap（→ follow-up）：
- **電路線條粗細**（最大 blocker）：可見 routing 線是烘焙進 `.factory-circuit-routing-reference` 的 PNG 點陣圖，不是 config 驅動 SVG stroke；`connectorTreatments.strokeWidth`（seed 16）量不到對應渲染。若 reference 要求調整線寬 → 需另開 change 評估把 routing 換成可調 SVG，禁止 polish change 偷加 schema。
- **KPI value/title 字級、hero copy-en 字級、line-leaf/leaf-vine opacity**：寫死於 `factoryCircuit.css` custom props，無 config 欄位。
- **Leaf opacity binding 疑異**：seed 0.38 vs 實測 1，需確認套用點（可能是 binding bug，需人工/程式追）。

## Images — `polish-images-reference-quality-targets`

| Surface | Classification | Measured | Editor-backed field |
| --- | --- | --- | --- |
| Media stage geometry | `reference-quality-target` | 584,148 1292x622 | `mainStage.{left,top,width,height}` |
| Media stage fit/focus/align | `reference-quality-target` | object-fit cover, object-position 50% 52% | `mainStage.fitMode/focusX/focusY/alignX/alignY` |
| Thumbnail strip density | `reference-quality-target` | config 4 slots stride 278 gap 22 (256x132); live 僅 1 thumb（playlist 1 entry） | `thumbnailSlots[*].{left,top,width,height}` |
| Caption body/meta rhythm | `reference-quality-target` | body 19/33.06(1.74) mt18; meta 18/25.2(1.4) | `rhythm.imagesCaption.*` |
| Info panel geometry + cardStyle | `reference-quality-target` | 1470,414 374x376; title 28, radius 22, padding 34/30/30/30 | `infoPanel.*` + `cardStyles.infoPanel` |
| Hero typography | `reference-quality-target` | title 76/87.4(1.15) ls4; eyebrow 24 ls9 mb44; subtitle 26/36.4 mt20 | `chrome.heroTypography.*` |
| Slide counter / arrows | `reference-quality-target` | counter current 76/total 38; arrows 68x68 radius 34 | `chrome.modules.counter.*` / `arrows.*` |
| Gold/grass ornament | `reference-quality-target` | opacity 0.88 | `chrome.ornaments.goldLine.opacity/offsetY` |

Images actual-gap（→ follow-up）：
- **Media stage 圓角(16px)/soft-shadow 與 reference 全出血切換**：只由 viewModel `isReferenceHeroCrop` 自動決定，無 editor toggle。
- **Thumbnail 圓角(18px)/object-fit**：寫死於 `images.css`。
- **Hero copy lead 字級/行高/字距**：寫死於 `.images-copy-block` CSS（只有 geometry 可調）。
- 注意 runtime：目前 playlist 僅 1 entry、`mainStageIsReference=false`；4-up thumbnail 密度與全出血模式需人工看 04 PNG 對照（屬 runtime/content witness，下游 change 處理時記錄）。

## Sustainability — `polish-sustainability-reference-quality-targets`

| Surface | Classification | Measured | Editor-backed field |
| --- | --- | --- | --- |
| Hero media geometry/overlap | `reference-quality-target` | 574,146 1346x560 | `heroMedia.{left,top,width,height}` |
| Hero fit/focus | `reference-quality-target` | object-fit cover, object-position 50% 48% | `heroMedia.fitMode/focus*/align*` |
| Ring ornament (opacity/scale/overlap/thickness/glow) | `reference-quality-target` | opacity 0.34, 286x286 scale 1, overlap 118px; thickness/glow 為內層 SVG（rect 量不到） | `chrome.ornaments.ring.*` |
| Leaf ornament | `reference-quality-target` | opacity 0.42, 520,564 178x96 | `chrome.ornaments.leaf.*` |
| Hero typography | `reference-quality-target` | title 80/92(1.15) ls6; subtitle 26/36.4 mt20 | text fields + `heroTypography` |
| Highlight rail container + cards | `reference-quality-target` | container 42,545 519x167 (live 覆寫 seed 470x108); 2 cards w257/w242 gap 20 | `highlightRail.container.*` + `cards[].frame` |
| Highlight card rhythm | `reference-quality-target` | padding 14/16, value 30, label 13 ls1.04 | `rhythm.highlightRail.*` |
| Trees/stat card row geometry | `reference-quality-target` | 6 cards h220 top760 (trees w236, stat w304) | `statCards.*` + `kpiCards.*` |
| Stat/KPI cornerRadius / value font | `reference-quality-target` | radius 24, value 66 | `cardStyles[key].cornerRadius/valueFontSize` |

Sustainability actual-gap（→ follow-up）：
- **Hero copy-en 字級/行高/margin**：CSS 硬編碼，且 `copyEnLines` 無 editor text 欄位（只有 `copyZhLines` 有）。
- **Stat card 內部 padding(26/26/20)**：來自 shared card component，非 per-card editor 欄位。
- **Stat-desc/procure/value/esg-list 字級**：CSS 硬編碼。
- **Sustainability 綠色 palette**（value #57774a / icon #6a8a50 等）：CSS custom props，不在 config。
- 注意：leaf transform matrix 為 identity 但 CSS 設 `--display-leaf-rotation:-28deg`，旋轉可能未套用（潛在 bug，需人工/程式確認）。

## Downstream Handoff

| Page | Closeout change | reference-quality-target rows | actual-gap follow-ups |
| --- | --- | --- | --- |
| Overview + Solar | `polish-overview-solar-reference-quality-targets` | Overview 7 列、Solar 5 列 | Solar 3 項（gold line 基底、leaf 基底、hero stage framing） |
| Factory Circuit | `polish-factory-circuit-reference-quality-targets` | 9 列 | 電路線寬、CSS 字級、leaf opacity binding |
| Images | `polish-images-reference-quality-targets` | 8 列 | stage 圓角/全出血、thumb 圓角、copy lead 字級 |
| Sustainability | `polish-sustainability-reference-quality-targets` | 9 列 | copy-en/stat padding/stat 字級/palette、leaf rotation |

## Launch Matrix Relationship

本表為 supporting evidence。`docs/reference-match/display-launch-witness-matrix.md` 仍是唯一 authoritative launch status ledger。五頁 launch status 維持 `blocked`：本輪只取得 visual/structure boundary 證據，尚未取得 fresh runtime parity / publish refresh / fallback witness。沒有任何 boundary row 可單獨把頁面標成 launch-ready。
