# Handoff — apply-playback-brightness-orientation-runtime

## Manual Witness Result (2026-06-07, running app)

在 `pnpm dev`（server:3000 + web:5173）以 `PUT /api/playback/settings` 改值後，用 `pnpm run fhd:witness` 截圖驗證：

- **Brightness**：設 `brightness=40` → 整個 playback surface 明顯變暗（run `phase3-brightness`）。✓
- **Orientation**：設 `orientation=portrait` → 內容旋轉 90°（run `phase3-portrait`）。✓
  - 註：witness 工具固定以 1920×1080（橫向）viewport 截圖，故 portrait 旋轉後在橫向截圖中呈左側直條，屬預期；實際填滿需在實體直立螢幕（portrait viewport）驗收，屬 operator/hardware 範疇。
- **Images 4-up**：seed 後 `/api/image-playlist` 回 6 entries，`/images` thumbnail strip 渲染 4 張（run `phase3-seed`）。✓
- 驗證後已將 settings 重置為 `brightness=100`、`orientation=landscape`。

## Test / Build Gates

- `pnpm --filter @solar-display/web test` → 492 pass / 0 fail
- `pnpm --filter @solar-display/server test` → 228 pass / 0 fail
- `pnpm run build` → exit 0、0 TS error（含修復既有 `displayTransition.ts`、`fhdEditorCapabilityGapLedger.test.ts`）

## Notes

- brightness/orientation 為 surface 級套用（`DisplayCanvas` viewport），不改各頁 1920×1080 內容座標。
- 既有未使用 import `createMetricHighlightCard`（Sustainability）、`React`（DisplayCanvas）為 pre-existing，未在本 change 處理。
- 種子 slideshow demo 影像現為預設；runtime playlist 測試以 `clearSeedSlideshowMembership()` 隔離 seed demo 內容。
