## Context

這三個頁面雖然功能不同，但優化風險相同：background refresh 若沒有 guard，很容易覆蓋應保留的狀態。Offline Error 需要先保留 minimal fault lane；Device Status 需要保留 access-denied 與 safe-op guidance；Brand Assets 需要保留 dirty draft 與 pending destructive action。把 guarded-refresh contract 合成一個 change，最能直接回應「不能功能退化」的要求。

## Goals / Non-Goals

**Goals:**

- 讓 Offline Error、Device Status、Brand Assets 的 guarded state 在 refresh 時被保留。
- 保留 reconnect、safe operations、dirty draft、pending action、access-denied 語意。
- 將這些 safety guard 寫成可驗證 contract。

**Non-Goals:**

- 不更動 API schema。
- 不處理 other support pages。

## Decisions

### Decision 1: Minimal fault lane is protected

Offline Error 的 reconnect、return routing、minimal fault guidance 不得被 deferred diagnostics 覆蓋。

### Decision 2: Access and partial-success state is protected

Device Status 的 access-denied、partial-success、safe-op guidance 必須在 refresh 期間保留。

### Decision 3: Dirty draft and pending action state is protected

Brand Assets 的 dirty draft、selection、pending destructive action 在 background refresh 期間必須保留。

## Implementation Contract

- Behavior: Offline Error、Device Status、Brand Assets 在 guarded state 存在時，background refresh SHALL 只更新未受保護的 lane，不得覆蓋 reconnect、access-denied、safe-op guidance、dirty draft、selection、pending action。
- Interface / data shape: 每頁需要顯式區分 protected lane 與 refreshable lane。
- Failure modes: refresh 失敗時保留既有 protected lane，並顯示既有 degraded semantics。
- Acceptance criteria: offline / device / brand tests 需證明 protected lane 不被覆蓋； reconnect、safe operations、dirty draft 行為不退化。
- Scope boundaries:
  - In scope: Offline Error、Device Status、Brand Assets 的 guarded refresh。
  - Out of scope: other support pages、API schema、preview foundation。

## Risks / Trade-offs

- [Risk] guard 太強可能延後某些新資料進入畫面。 → Mitigation: 只保護受保護 lane，refreshable lane 照常更新。
