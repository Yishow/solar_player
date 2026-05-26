## Why

即使前四包都做完，如果 effect stack 沒有摘要、常用 presets、合法範圍 guardrails 與衝突提示，operator 仍然會在複雜設定中迷路。這包的角色是把 framework 拉到可用產品層，而不是只停在 engine 與 schema 正確。

## What Changes

- 在 `來源連接` 或對應 summary surface 顯示 effect stack 摘要。
- 提供常用 presets，例如上方霧化、左側柔化、四邊淡出、全幅柔焦。
- 加入 coverage / feather / strength 的 guardrails 與 out-of-range feedback。
- 提供 stacking order 與潛在衝突提示，避免 effect layers 互相遮掉卻毫無說明。

## Capabilities

### New Capabilities

- `display-editor-effect-presets-and-guardrails`: 定義 effect summary、presets、range guardrails 與 stacking feedback contract。

### Modified Capabilities

(none)

## Impact

- Affected specs: `display-editor-effect-presets-and-guardrails`
- Affected code:
  - Modified:
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/index.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx`
    - `apps/web/src/pages/DisplayPagesEditor/index.test.tsx`
  - New:
    - `openspec/changes/add-display-editor-effect-summary-presets-and-guardrails/specs/display-editor-effect-presets-and-guardrails/spec.md`
  - Removed:
    - (none)
