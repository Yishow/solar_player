## Why

目前 display editor 已經有從可見 media container 自動導向 effect-owning source 的 selection routing，但 z-order authoring 仍主要藏在左側 object list。結果是使用者即使已經在畫布上選到可重排物件，仍找不到可以直接調整 stacking order 的入口；而固定版位區塊、可重排 freeform object、shared shell object、以及只支援 effect authoring 的 media surfaces 之間，也沒有被清楚區分。

## What Changes

- 定義 display editor 中 layer authoring 的正式入口，不再只依賴左側 object list。
- 讓 freeform objects、shared shell decoration objects，以及其他明確宣告可重排的 authoring nodes，在目前 selection context 下都能看到層級操作。
- 對固定版位 regions 顯示不可調整上下層的明確說明，避免使用者誤以為功能遺失。
- 保留既有 object list 的前移/後移操作，並要求它與右側或畫布上的 layer controls 同步。
- 保留目前 media-effect selection routing 與 unsupported messaging 的邊界，不把「可編輯 effects」誤當成「可調 z-order」。

## Capabilities

### New Capabilities

- `display-editor-layer-authoring-surface`: 定義 display editor 的層級控制入口、reorderable node eligibility 與 fixed-layout explanation contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-layer-authoring-surface`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/freeformObjectList.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/index.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/objectList.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/index.test.tsx`
    - `apps/web/src/pages/ShellDecorationEditor/objectList.test.tsx`
  - New:
    - `openspec/changes/extend-display-editor-layer-authoring-beyond-object-lists/specs/display-editor-layer-authoring-surface/spec.md`
  - Removed:
    - (none)
