## Context

composable effects 會讓表達能力大幅上升，但也會把操作複雜度一起帶上來。若沒有 summary、presets 與 guardrails，user 很容易做出三四層效果卻不知道目前到底生效了什麼，也不知道哪一層在互相打架。

## Goals

- 讓 effect stack 一眼可讀。
- 讓常見效果有 preset 入口，不必每次從零組。
- 讓不合理範圍與 layer 衝突有可見回饋。

## Non-Goals

- 不在這包新增新的 effect kinds。
- 不把 presets 做成不可再編輯的黑盒模板。

## Decisions

### Summarize the active effect stack in a read-only companion surface

`來源連接` 或相鄰 summary surface 應列出 active layers、zones 與重要參數，讓 operator 不用每次都展開 `屬性` 才看懂當前狀態。

### Offer editable presets as accelerators, not locked templates

presets 是建立初始 layer 組合的捷徑，而不是最終不可拆解的模板。套用 preset 後，layer 仍可逐一編輯。

### Guard against unreadable or self-canceling stacks

當 coverage、strength、feather 超出建議範圍，或多層效果在同 zone 可能互相抵銷時，UI 應提供 feedback，而不是靜默讓畫面變糊成一片。

## Implementation Contract

**Behavior**

- summary surface 可讀出目前有哪些 active effect layers。
- presets 套用後會生成可編輯 layers。
- guardrails 對極端 coverage/feather/strength 與 stacking 衝突提供可見說明。

**Failure modes**

- 若 effect stack 無法從 summary surface 快速讀懂，視為未完成。
- 若 preset 套用後不能再編輯，視為未完成。
- 若 layer 衝突沒有任何可見提示，視為未完成。

## Verification

- `apps/web/src/pages/DisplayPagesEditor/sourceConnectionPanel.test.tsx` 驗證 summary output。
- `apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 驗證 preset 套用與 editable layer output。
- `apps/web/src/pages/DisplayPagesEditor/index.test.tsx` 驗證 guardrail feedback 與 workflow continuity。
