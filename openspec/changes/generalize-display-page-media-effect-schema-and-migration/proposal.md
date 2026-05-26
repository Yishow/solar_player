## Why

現在的 display page media effects 還是特例模型：`edgeFade(left/right)`、`bottomFade(bottom)`、`blur(整張圖)`、`opacity(整張圖)`。只要想支援 top、雙邊、四邊、percentage coverage、同區域疊加，就會立刻卡住，因為底層 schema 根本沒有 zone 與 effect layer 概念。

## What Changes

- 將 shared media effect schema 從特例欄位重構成 composable effect layer model。
- 定義 zone targeting、coverage、feather、strength 與 enabled state 的 shared contract。
- 定義 effect kind 與 zone support 的 shared typing，供 page config、editor、renderer 共同使用。
- 建立 legacy migration 與相容讀取路徑，讓既有 blur/fade/opacity seed data 不會失效。

## Capabilities

### New Capabilities

- `display-page-media-effect-schema-migration`: 定義 composable media effect layers、zone model、legacy migration 與 shared type contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-page-media-effect-schema-migration`
- Affected code:
  - Modified:
    - `packages/shared/src/displayPageMediaEffects.ts`
    - `packages/shared/src/displayPageConfig.ts`
    - `packages/shared/src/index.ts`
    - `apps/web/src/pages/shared/displayPageMediaEffectConfig.ts`
    - `apps/web/src/pages/displayPageSeeds.test.ts`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`
  - New:
    - `packages/shared/src/displayPageMediaEffects.test.ts`
    - `openspec/changes/generalize-display-page-media-effect-schema-and-migration/specs/display-page-media-effect-schema-migration/spec.md`
  - Removed:
    - (none)
