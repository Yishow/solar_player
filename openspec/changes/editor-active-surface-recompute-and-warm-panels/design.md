## Context

editor route entry 已經做到 staged loading，但 active surface recompute 仍偏大：非 active workspace 仍可能解析完整 region graph；preview / inspector / canvas overlay 容易一起更新；publish / health / asset panel 的 warm data reuse 邊界還不夠明確。這需要獨立的 performance contract。

## Goals / Non-Goals

**Goals:**

- 讓非 active workspace、page、selection 不做不必要 recompute。
- 讓 publish、health、asset panel 在 warm data 存在時先重用，再背景 refresh。
- 保留 selection、preview、publish、health、asset panel 行為不退化。

**Non-Goals:**

- 不處理 dirty tracking。
- 不新增 editor capability。

## Decisions

### Decision 1: Active surface graph only

只有 active workspace、page、selection、changed region 參與 recompute。

### Decision 2: Warm support panels first

asset、publishing、health panel 先重用 warm data，再背景 refresh。

### Decision 3: No-regression selection and panel behavior

selection、preview、publish、health、asset panel 行為保持等價。

## Implementation Contract

- Behavior: 非 active surface SHALL 不做不必要 recompute； support panel SHALL 先重用 warm data，再背景 refresh； panel refresh failure 不得清空 draft 或 selection。
- Interface / data shape: active surface input 與 support panel warm state 需要明確分離。
- Failure modes: panel refresh 失敗時保留既有 draft、selection、undo history、與 usable warm panel state。
- Acceptance criteria: editor tests 需證明非 active surface 不重算完整 graph； panel tests 需證明 warm data reuse 與 failure isolation 行為正確。
- Scope boundaries:
  - In scope: active-surface recompute、support panel warm-data reuse。
  - Out of scope: dirty tracking、schema 變更、page-local playback 優化。

## Risks / Trade-offs

- [Risk] recompute graph 切太細會讓 selection 或 preview 不同步。 → Mitigation: 以 canvas / inspector / panel tests 固定 observable behavior。
