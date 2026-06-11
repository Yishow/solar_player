## Context

MQTT Settings 與 Circuit Settings 都有清楚的 editable baseline，但 bootstrap / resync / mutation follow-up 路徑還沒有被收斂成同一個 contract。對這兩頁來說，重點不是更多 staged loading，而是讓 persisted controls 永遠先於 diagnostics 穩定可用，並把 loader reuse 邊界明確化。

## Goals / Non-Goals

**Goals:**

- 讓 MQTT Settings 與 Circuit Settings 以 reusable editable loader 恢復 persisted controls。
- 讓 readiness、weather、live metrics、topic stream diagnostics 保持在 deferred lane。
- 保留 dirty guard、masked password、save / delete / test 行為不退化。

**Non-Goals:**

- 不更動 API schema 或 permission boundary。
- 不處理其他 settings 頁。

## Decisions

### Reusable editable loader for persisted controls

bootstrap、manual resync、mutation follow-up path 都共用同一份 persisted-control loader contract。

### Deferred diagnostics stay outside the editable lane

weather、readiness、live metrics、topic stream diagnostics 只能更新 deferred lane，不得清空 persisted controls。

### No-regression dirty guard and access behavior

dirty guard、masked password、access、save / delete / test 行為維持既有語意。

## Implementation Contract

- Behavior: MQTT Settings 與 Circuit Settings SHALL 先恢復 persisted controls，再背景載入 diagnostics；manual resync 也需走同一份 editable loader。
- Interface / data shape: editable loader 與 deferred diagnostics loader 需分開，並保留 dirty state、masked password、access-denied semantics。
- Failure modes: diagnostics refresh 失敗時 persisted controls 仍可用；mutation 失敗時維持既有 error path。
- Acceptance criteria: MQTT / Circuit tests 需證明 loader reuse、dirty guard、masked password、save / delete / test 行為不退化。
- Scope boundaries:
  - In scope: MQTT Settings、Circuit Settings 的 editable loader 與 deferred diagnostics 邊界。
  - Out of scope: API schema、其他 settings 頁。

## Risks / Trade-offs

- [Risk] loader reuse 若切錯，可能讓 resync 與 bootstrap 行為分叉。 → Mitigation: 用 shared loader tests 固定 bootstrap / resync / mutation follow-up 行為。
