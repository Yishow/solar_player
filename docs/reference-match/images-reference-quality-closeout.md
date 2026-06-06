# Images Reference Quality Closeout

Change: `polish-images-reference-quality-targets`
Inputs: `fhd-playback-boundary-classification-2026-06-05.md` + `visual-fidelity-review-2026-06-06.md`
Scope: 只調 `reference-quality-target` 列；shared header/footer 為 `protected-product-choice`，不動。

## Protected Shell Confirmation

- 未修改 shared shell 檔（header/footer height、footer position、shell density）、`LayoutShell`、route group、shell CSS。
- Images header/footer 維持 `protected-product-choice`，僅確認未變。

## Editor-Backed Tuning（before/after，git HEAD baseline）

| Surface | Field | Before | After | 依據 |
| --- | --- | --- | --- |
| Media stage 量體 | `imagesMainLayout.{width,height}` | 1292 × 622 | 1316 × 642 | review：current 舞台略小，放大一點點貼近 reference（小幅） |
| Caption / info panel 寬度 | `imagesInfoLayout.width` | 374 | 398 | review：caption card 比 reference 窄，加寬拉張力 |
| Caption body 字級 | `rhythm.imagesCaption.bodyFontSize` | 19 | 21 | review：caption 文字張力弱，字級加大 |

維持不動：fitMode cover / focus（review：裁切比例接近）、gold ornament opacity 0.88、hero typography、counter/arrows（review 大致一致）。

## Blocked（需資料才可驗，→ Phase 3）

- **Thumbnail 4-up 密度**：config 定義 4 slots（stride 278 / gap 22），但 runtime playlist 目前僅 1 entry，只渲染 1 張置中 thumb，無法評估 4-up 排佈。review 列為 **BLOCKED**。→ Phase 3 補 ≥4 筆 playlist seed 後，於 Phase 2 witness 重截評估；本輪不改 thumbnail slot 幾何。

## Actual-gap（→ Phase 4 editor-capability，禁止 page-local hardcode）

- **Media stage 圓角(16px)/soft-shadow 與 reference 全出血切換**：目前由 viewModel `isReferenceHeroCrop` 自動決定，無 editor toggle。
- **Thumbnail 圓角(18px)/object-fit**：寫死於 `images.css`。
- **Hero copy lead 字級/行高/字距**：寫死於 `.images-copy-block` CSS（只有 geometry 可調）。
- **Caption 內容**：目前是 placeholder（屬資料，非視覺），需真實 caption 內容才有完整張力。

## Visual Witness Status

- 本輪完成 config-level before/after 與 focused test（layout/configRender/cardStyle/seed 12+ pass）。
- **Fresh 1920×1080 視覺 witness 重截批次延 Phase 2**（與 `docs/reference/FHD/04` 比對），4-up 需 Phase 3 補 seed 後才可判定。
- 取得 fresh runtime parity / publish refresh / fallback witness 前，**Images launch status 維持 `blocked`**。

## Focused Test Gate

```
pnpm --filter @solar-display/web test -- \
  src/pages/Images/layout.test.ts \
  src/pages/Images/configRender.test.ts \
  src/pages/Images/viewModel.test.ts \
  src/pages/displayPageSeeds.test.ts
→ all pass；full web 483/483
```
