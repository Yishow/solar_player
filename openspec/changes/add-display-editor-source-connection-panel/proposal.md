## Why

`/display-pages/editor` 右側目前只有 `屬性`、`素材健康`、`發布`。來源相關欄位被混在一般 inspector fields 裡，例如 `Source Mode`、`Managed Asset Ref`、`Image Source`、`Icon Source Mode`，operator 很難一眼看出目前選取物件到底連到 seed default、direct src、managed asset、icon registry、reference glyph 或 ornament key。隨著 seed assets 進圖庫、card icon/葉飾等 visual primitives 也要能替換，來源狀態需要獨立成一個可理解的 panel。

## What Changes

- 在 Display Pages Editor 右側新增 `來源連接` tab，與 `屬性`、`素材健康`、`發布` 並列。
- `來源連接` 只處理來源、替換、回復預設、圖庫連結與引用狀態；不搬移圖片特效、opacity、fade、blur、layout、geometry controls。
- 針對目前選取的 region/object/card/visual primitive 顯示來源摘要：seed/default、managed asset、direct src、icon registry、reference glyph、ornament key、fallback src。
- 提供一致行動入口：從圖庫替換、開啟 editor 內圖庫 workspace、回復 seed default、跳回屬性調整特效或 layout。
- 顯示圖片特效與其他呈現設定的摘要，但 controls 留在 `屬性` tab。

## Capabilities

### New Capabilities

- `display-editor-source-connection-panel`: 定義 Display Pages Editor 右側來源連接分頁，集中呈現與操作選取項目的 source linkage。

### Modified Capabilities

(none)

## Impact

- Affected specs: display-editor-source-connection-panel
- Related pending changes:
  - `bootstrap-display-seed-assets-into-asset-library`
  - `extend-managed-asset-replacement-to-visual-primitives`
  - `integrate-asset-library-workspace-into-display-editor`
  - `upgrade-display-editor-asset-picker-experience`
- Affected code:
  - New: apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx
  - Modified: apps/web/src/pages/DisplayPagesEditor/index.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx, apps/web/src/pages/DisplayPagesEditor/localization.ts
  - Tests: apps/web/src/pages/DisplayPagesEditor/index.test.tsx, apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx, apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx
