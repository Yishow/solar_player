## Why

有了 schema 與 renderer 還不夠，editor 仍需要一套真正能操作 composable effects 的 inspector。這包的目標不是再加幾個欄位，而是提供 layer list、zone 選擇、percentage coverage、強度調整與 current selection 導向 source 的正式 authoring surface。

## What Changes

- 在 `屬性` 面板中建立 composable effect inspector。
- 提供 effect layer list、新增/刪除、啟用/停用、排序與 per-layer field editing。
- 支援 type、zone、coverage、strength、feather 等欄位。
- 當使用者點到可見 container 時，自動導到真正持有 effect config 的 media source。

## Capabilities

### New Capabilities

- `display-editor-composable-effect-inspector`: 定義 composable effect inspector UI、layer lifecycle、selection-to-source routing 與 editor-only authoring contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-composable-effect-inspector`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
    - `apps/web/src/pages/shared/displayPageMediaEffectConfig.ts`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx`
  - New:
    - `apps/web/src/pages/DisplayPagesEditor/effectInspector.tsx`
    - `openspec/changes/build-display-editor-composable-effect-inspector/specs/display-editor-composable-effect-inspector/spec.md`
  - Removed:
    - (none)
