# Sustainability Reference Quality Closeout

Change: `polish-sustainability-reference-quality-targets`
Inputs: `fhd-playback-boundary-classification-2026-06-05.md` + `visual-fidelity-review-2026-06-06.md`
Scope: 只調 `reference-quality-target` 列；shared header/footer 為 `protected-product-choice`，不動。

## Protected Shell Confirmation

- 未修改 shared shell 檔、`LayoutShell`、route group、shell CSS。
- Sustainability header/footer 維持 `protected-product-choice`，僅確認未變。

## Editor-Backed Tuning（before/after，git HEAD baseline）

| Surface | Field | Before | After | 依據 |
| --- | --- | --- | --- |
| Ring glow 收斂 | `chrome.ornaments.ring.glowOpacity` | 0.24 | 0.16 | review：右上角 ring glow 偏亮/偏 wash，收斂一點（中幅） |

維持不動（review「大致一致／維持即可」）：ring opacity 0.34 / overlap 118、leaf opacity 0.42、hero media geometry/fit/focus、highlight rail（2 卡密度相近）、Trees/stat 6 卡節奏與留白。

## Actual-gap（→ Phase 4 editor-capability / bug fix，禁止 page-local hardcode）

- **Hero 飽和/對比**：review 指 current hero 略淡/略洗白、需提高飽和；heroMedia 效果僅支援 opacity/blur，無飽和/對比欄位 → 屬 CSS palette actual-gap。
- **Sustainability 綠 palette**（value #57774a / icon #6a8a50 等）：CSS custom props，不在 config。
- **Hero copy-en 字級/行高/margin**：CSS 硬編碼，且 `copyEnLines` 無 editor text 欄位（只有 `copyZhLines` 有）。
- **Stat card 內部 padding(26/26/20)**：來自 shared card component，非 per-card editor 欄位。
- **Stat-desc/procure/value/esg-list 字級**：CSS 硬編碼。
- **Leaf rotation binding**：transform matrix 為 identity 但 CSS 設 `--display-leaf-rotation:-28deg`，旋轉可能未套用（潛在 bug）。review 視覺判「無明顯偏差」，故本輪不改值；binding 套用點留 Phase 4 程式追查。

## Visual Witness Status

- 本輪完成 config-level before/after 與 focused test（configRender/layout/viewModel/chrome/seed 17 pass；full web 483/483）。
- **Fresh 1920×1080 視覺 witness 重截批次延 Phase 2**（與 `docs/reference/FHD/05` 比對），屆時補 before/after。
- 取得 fresh runtime parity / publish refresh / fallback witness 前，**Sustainability launch status 維持 `blocked`**。

## Focused Test Gate

```
pnpm --filter @solar-display/web test -- \
  src/pages/Sustainability/configRender.test.ts \
  src/pages/Sustainability/layout.test.ts \
  src/pages/Sustainability/viewModel.test.ts \
  src/pages/displayPageChromeConfig.test.ts \
  src/pages/displayPageSeeds.test.ts
→ tests 17 / pass 17 / fail 0
```
