## Why

就算 schema、renderer、inspector 都完成，如果 rollout 還是只停在個別頁面或沒有明確 support matrix，使用者看到的還是「某些頁可以、某些頁不行、為什麼不行也不知道」。這包要把 composable effects 真的落到支援頁面上，並把 unsupported 說明寫清楚。

## What Changes

- 為支援的 page media surfaces 宣告 effect kinds 與 zone support matrix。
- 先完成 `Overview hero`、`Images main stage` 等高需求 surface 的 rollout。
- 為暫不支援的 surface 顯示明確 explanation。
- 補齊 page config、runtime page definitions、editor schema 與 regression tests。

## Capabilities

### New Capabilities

- `display-page-media-effect-surface-rollout`: 定義 composable media effects 在各 page media surfaces 的 support matrix、rollout 邊界與 unsupported explanation contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-media-effect-surface-rollout`
- Affected code:
  - Modified:
    - `apps/web/src/pages/Overview/displayPageConfig.ts`
    - `apps/web/src/pages/Images/displayPageConfig.ts`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
  - New:
    - `openspec/changes/roll-out-composable-media-effects-to-supported-page-surfaces/specs/display-page-media-effect-surface-rollout/spec.md`
  - Removed:
    - (none)
