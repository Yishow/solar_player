## Why

目前 editor 部分 media binding 已有 `managed-asset` source mode，但覆蓋範圍不完整：多數 card icons 仍是 `asset-image` direct `src`、`reference-glyph` 或 `page-icon-key`；葉飾與 ornament 仍是 chrome config 或 ornament key；Shell ornament 也只有固定 `leaf` key。結果 operator 看不到 card icon、葉飾等現有視覺元素可以從圖庫替換，和「背景圖、card icon、葉飾等都可作為圖庫物件自由替換」的產品期待不一致。

## What Changes

- 擴充 display editor visual source schema，讓 card icon、flow/node icon、thumbnail placeholder、leaf ornament、gold ornament fallback 等 visual primitives 可選 managed asset。
- 將目前只支援 direct `src`、reference glyph、page icon key、ornament key 的欄位，補上 managed asset mode 與 gallery-backed picker。
- 保留既有 registry glyph / ornament primitive 作為 seed fallback，不破壞目前播放畫面。
- 讓 publish validation、asset health、delete guard 能追蹤這些新增 managed asset references。

## Capabilities

### New Capabilities

- `display-editor-managed-visual-replacement`: 定義 display editor 中所有主要視覺 primitive 都必須能從 managed asset library 選擇替換來源。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-managed-visual-replacement
- Affected code:
  - Modified: packages/shared/src/displayPageConfig.ts, apps/web/src/pages/shared/displayIconSourceConfig.ts, apps/web/src/components/displayPageIconResolver.tsx, apps/web/src/pages/*/displayPageConfig.ts, apps/server/src/services/displayPageAssetService.ts
  - Tests: apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx, apps/web/src/pages/displayPageIconRendering.test.ts, apps/server/src/routes/display-pages-asset-governance.references.test-suite.ts, apps/server/src/services/displayPageObjectValidation.test.ts
