## Why

這個 change 原本是在 display editor media effects 還停留在 `edgeFade(left/right)`、`bottomFade(bottom)`、`blur(整張圖)`、`opacity(整張圖)` 的時期提出，用來定義整體目標。後續實作已經拆成更小、可驗證的五個 change，分別處理 shared canonical schema、renderer、inspector、surface rollout、以及 summary/preset/guardrails。現在需要把這個 umbrella change 修正成符合現況的總結，而不是繼續看起來像一個尚未開始的一次性實作。

## What Changes

- 將本 change 改寫為 umbrella 記錄，明確對齊已經落地的五個 follow-up changes：
  - `generalize-display-page-media-effect-schema-and-migration`
  - `render-composable-display-page-media-effects`
  - `build-display-editor-composable-effect-inspector`
  - `roll-out-composable-media-effects-to-supported-page-surfaces`
  - `add-display-editor-effect-summary-presets-and-guardrails`
- 保留這個 change 作為 `display-editor-media-effect-authoring-surface` capability 的總體產品契約，並把已交付的 canonical layer schema、target-zone rendering、page support matrix、Properties-only editing、summary/preset/guardrails 納入現況描述。
- 明確記錄 legacy blur/fade/opacity 相容讀取、visible-container-to-source routing、以及 unsupported surface explanations 已不再是未來工作，而是現有 baseline。

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
    - `packages/shared/src/index.ts`
    - `apps/web/src/pages/displayPageMediaStyle.ts`
    - `apps/web/src/pages/shared/displayPageMediaEffectConfig.ts`
    - `apps/web/src/pages/shared/displaySurfaceChrome.css`
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/displayPageMediaEffectAuthoring.ts`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.tsx`
    - `apps/web/src/pages/Overview/displayPageConfig.ts`
    - `apps/web/src/pages/Images/displayPageConfig.ts`
    - `apps/web/src/pages/shared/liveDisplayPagePreview.tsx`
    - `apps/web/src/pages/displayPageMediaStyle.test.tsx`
    - `apps/web/src/pages/shared/displaySurfaceChrome.test.ts`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/mediaEffectInspector.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx`
    - `packages/shared/src/displayPageMediaEffects.test.ts`
  - New:
    - `openspec/changes/complete-display-editor-media-effect-authoring-surface/specs/display-editor-media-effect-authoring-surface/spec.md`
  - Removed:
    - (none)
