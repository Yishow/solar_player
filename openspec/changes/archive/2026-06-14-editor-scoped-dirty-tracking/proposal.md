## Why

DisplayPagesEditor 的第一個高風險 hotspot 是 dirty tracking：目前仍依賴 full-config serialization compare，這會直接放大 drag、resize、typed inspector 的互動成本。這個議題夠核心，也夠危險，應該單獨拆成一個 change。

## What Changes

- 以 operation-scoped dirty tracking 取代 full-config serialization compare。
- 規範 applyConfigUpdate、undo、redo、reset、reload、save conflict 的 dirty state contract。
- 加入 no-regression 邊界：dirty badge、save、publish、reload、conflict 行為不得退化。

## Non-Goals (optional)

- 不處理 editor preview / inspector / support panel recompute；那是另一個 change。
- 不新增 editor capability。

## Capabilities

### New Capabilities

- editor-scoped-dirty-tracking: 定義 DisplayPagesEditor 以 operation-scoped 邏輯維護 dirty state 的契約。

### Modified Capabilities

(none)

## Impact

- Affected specs: editor-scoped-dirty-tracking
- Affected code:
  - New: (none)
  - Modified: apps/web/src/hooks/displayPageDraftSession.ts, apps/web/src/hooks/displayPageDraftSession.test.ts, apps/web/src/hooks/useDisplayPageConfig.ts, apps/web/src/hooks/useDisplayPageConfig.test.ts, apps/web/src/pages/DisplayPagesEditor/history.ts, apps/web/src/pages/DisplayPagesEditor/index.tsx
  - Removed: (none)
