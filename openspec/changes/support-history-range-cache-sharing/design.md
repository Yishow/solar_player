## Context

Energy Trend 已有部分 range cache，Energy History 則仍以多個 source 的 runtime refresh 為主。兩頁其實共享大量 history data，若不把 shared warm cache 拆成獨立 change，後續很難分辨哪個頁面還在重複 cold load。

## Goals / Non-Goals

**Goals:**

- 共享相同 range 的 warm history payload。
- 保留 Energy History 的 source-level loading / degraded semantics。
- 保留 chart、counter、range 行為不退化。

**Non-Goals:**

- 不改 metrics API。
- 不處理其他 support 頁。

## Decisions

### Shared range-aware warm cache

Energy Trend 與 Energy History 共用相同 range key 的 warm payload。

### Preserve partial-source semantics

Energy History 仍可分 source 呈現 loading / degraded state；共享 cache 只處理 warm payload 起點。

### No-regression chart and counter behavior

range、chart、counter、loading / degraded 行為保持等價。

## Implementation Contract

- Behavior: 同一 range 已解析過時，Energy Trend 與 Energy History SHALL 先顯示 warm payload，再背景 refresh；Energy History 仍保留 source-level loading semantics。
- Interface / data shape: range-aware cache 需要可被兩頁共用；Energy History 的 source-level state 不可被扁平化。
- Failure modes: refresh 失敗時保留既有 warm payload 與 degraded state。
- Acceptance criteria: cross-page tests 需證明共享 warm cache；history page tests 需證明 partial-source semantics 不退化。
- Scope boundaries:
  - In scope: Energy Trend / Energy History shared cache。
  - Out of scope: metrics API、其他 support 頁。

## Risks / Trade-offs

- [Risk] 共用 cache 可能掩蓋單一 source 的失敗語意。 → Mitigation: 保留 Energy History 的 source-level loading / degraded state。
