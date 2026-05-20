## Why

`Display Pages Editor` 的基礎架構已經有 schema-aware inspector、geometry reuse、draft/live publishing 與 runtime preview，但部分頁面仍只停在 preview 與 route coverage。這讓 editor 已經像治理核心，卻還沒完整覆蓋所有 page-specific authoring needs。

## What Changes

- 擴大 editor 的 page-specific authoring coverage，讓目前仍只有 preview coverage 的頁面具備可編輯的 region schema 與對應 inspector controls。
- 對齊 page-specific schema、preview、typed inspector 與 reset/reuse workflow，避免某些頁只能看不能編。
- 補齊 editor regression tests，確保 page-specific authoring coverage 不再只靠 fallback message。

## Non-Goals

- 不重做 editor 三欄 layout 或 publishing workflow。
- 不要求這一輪做到每個細節都 pixel-perfect。

## Capabilities

### New Capabilities

- `display-editor-page-authoring-coverage`: 定義目前 display pages 中仍缺少 page-specific editor support 的頁面如何補齊 editable regions、typed fields 與 preview binding。

### Modified Capabilities

- `display-editor-typed-inspector-controls`: 將 typed inspector contract 從「能描述 schema」擴展到「所有受支援頁面都能實際提供 page-specific editable controls」。

## Impact

- Affected specs: `display-editor-page-authoring-coverage`, `display-editor-typed-inspector-controls`
- Affected code:
  - Modified: `apps/web/src/pages/DisplayPagesEditor/index.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/pageRegionSchemas.ts`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtime*.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`
  - Modified: `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
