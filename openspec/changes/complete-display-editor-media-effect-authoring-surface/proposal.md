## Why

目前 display editor 的 media effect 只有一半成形。現況只有 `edgeFade(left/right)`、`bottomFade(bottom)`、`blur(整張圖)`、`opacity(整張圖)`，而 mist 只是從 fade 派生出的固定 blur/opacity 遮罩。這不只讓使用者找不到入口，也讓效果模型無法表達像「上方 20% 霧化 + 同區域模糊 + 下方淡出」這種真實需求。

## What Changes

- 將目前零散的 blur / fade / opacity / mist authoring，升級為可組合的 media effect framework。
- 定義 shared effect layer model，讓每個效果都能描述 effect type、target zone、coverage 百分比、強度與 enabled state。
- 對稱支援 top、bottom、left、right、dual-edge 與 all-edges 等常見 zone scopes，而不是只有 left/right/bottom 三種特例方向。
- 讓多個 effect layers 可以疊加到同一個 target zone，例如 mist + blur、mist + opacity、fade + blur。
- 定義 page-level support matrix，宣告每個 media surface 支援哪些 effect types 與哪些 zones。
- 保留 `屬性` 作為 effect authoring 唯一可編輯入口，並讓可見 container selection 自動連到真正持有 effect config 的 media source region。

## Capabilities

### New Capabilities

- `display-editor-media-effect-authoring-surface`: 定義 display editor 內 composable media effects 的 shared schema、zone targeting、coverage/strength controls、effect stacking、page support matrix 與 authoring surface contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-media-effect-authoring-surface`
- Affected code:
  - Modified:
    - `packages/shared/src/displayPageMediaEffects.ts`
    - `packages/shared/src/displayPageConfig.ts`
    - `apps/web/src/pages/displayPageMediaStyle.ts`
    - `apps/web/src/pages/shared/displayPageMediaEffectConfig.ts`
    - `apps/web/src/pages/shared/displaySurfaceChrome.css`
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
    - `apps/web/src/pages/Overview/displayPageConfig.ts`
    - `apps/web/src/pages/Images/displayPageConfig.ts`
    - `apps/web/src/pages/displayPageMediaStyle.test.tsx`
    - `apps/web/src/pages/shared/displaySurfaceChrome.test.ts`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx`
  - New:
    - `openspec/changes/complete-display-editor-media-effect-authoring-surface/specs/display-editor-media-effect-authoring-surface/spec.md`
  - Removed:
    - (none)
