## Context

`Display Pages Editor` 已具備 schema-aware inspector、geometry reuse、draft/live publishing、asset health 與 runtime preview 等基礎，但程式內仍保留「這個頁面的 page-specific editor 尚未在本 phase 展開」的 fallback 訊息。這代表 editor 基礎穩了，page-specific authoring coverage 還沒齊。

## Goals / Non-Goals

**Goals**

- 補齊目前缺少 page-specific editor support 的 display pages。
- 讓新增 coverage 仍沿用既有 typed inspector、region schema、preview binding、reset/reuse workflow。
- 補齊相應 editor regression tests。

**Non-Goals**

- 不重做 editor 的三欄架構。
- 不把這輪工作擴成 pixel-perfect 視覺微調。

## Decisions

### Replace coverage gaps with page-specific region schemas

目前 coverage 缺口的根源不是 preview 缺少，而是缺少 page-specific region schema 與 editable bindings。新增 coverage 時應以 schema 為中心，而不是寫死每個欄位在 UI 中的特例。

### Keep new page-specific controls inside the existing typed inspector contract

新頁面 coverage 不應繞過 typed inspector。所有新增 page-specific fields 都要落在既有 schema-aware inspector contract 內，才能保留 reset、geometry reuse、draft binding 等現有能力。

## Implementation Contract

- Behavior: 先前只有 preview coverage 的 display pages SHALL 補齊 page-specific editable regions 與 typed inspector controls，讓 operator 不再只看到 fallback message。
- Interface / data shape: page-specific region schema SHALL 成為對應頁面的單一欄位契約來源；preview binding 與 typed inspector 都從該 schema 派生。
- Failure modes: 若某頁仍未完全支援，頁面可以保留明確 unsupported message，但不得假裝已具備可編輯 controls。
- Acceptance criteria: `apps/web/src/pages/DisplayPagesEditor/runtimePageDefinitions.test.tsx`、`apps/web/src/pages/DisplayPagesEditor/inspectorFields.test.tsx` 與對應 page schema tests SHALL 覆蓋新增頁面 coverage。
- Scope boundaries: 本 change 只補 page-specific authoring coverage，不改 publishing workflow 或 canvas interaction foundation。

## Risks / Trade-offs

- [Risk] 新增 schema 後 editor complexity 上升 → Mitigation: 讓每頁 schema 仍維持 page-local，不把所有欄位塞進全域大表。
- [Risk] 新頁 coverage 直接寫特例會破壞 inspector 一致性 → Mitigation: 強制所有新增 controls 經由 typed inspector contract。
