## Context

dirty tracking 是 editor interaction cost 的源頭之一，因為每次互動都可能觸發 full-config compare。若 dirty state 不先被獨立拆出來，後續 preview / inspector / canvas recompute 再怎麼優化，都會被全域 dirty 計算拖住。

## Goals / Non-Goals

**Goals:**

- 讓 dirty state 依賴 scoped operations，而不是 full-config serialization compare。
- 保留 dirty badge、save、publish、reload、save conflict 行為不退化。
- 將 dirty tracking contract 寫成可驗證規則。

**Non-Goals:**

- 不處理 preview / inspector / support panel recompute。
- 不新增 editor capability。

## Decisions

### Decision 1: Operation-scoped dirty tracking

dirty state 來自 applyConfigUpdate、undo、redo、reset、reload、save conflict 這些有語意的操作。

### Decision 2: Baseline-aware dirty reconciliation

dirty state 必須能依據最新 baseline 正確 reconcile，而不是只看當前 config snapshot。

### Decision 3: No-regression save and conflict behavior

dirty badge、save、publish、reload、save conflict 行為保持等價。

## Implementation Contract

- Behavior: editor SHALL 以 scoped operations 更新 dirty state；當 baseline 改變時，dirty state SHALL 重新 reconcile 而不是全量重算。
- Interface / data shape: useDisplayPageConfig 與 displayPageDraftSession 需保存 baseline-aware dirty markers。
- Failure modes: save conflict、reload failure、seed fallback 時 dirty state 仍需正確。
- Acceptance criteria: hook / interaction tests 需證明各操作後 dirty state 正確； save / conflict tests 需證明既有行為不退化。
- Scope boundaries:
  - In scope: editor dirty tracking。
  - Out of scope: preview / inspector / support panel recompute。

## Risks / Trade-offs

- [Risk] 漏掉某一種操作會讓 dirty state 錯誤。 → Mitigation: 對主要操作逐一寫測試。
