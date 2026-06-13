## Context

Sustainability 的 runtime 是按 selectedPeriod 分支的。若沒有 per-period warm cache，每次切回舊 period 都會重新 cold hydrate，進而放大 highlight rail、stat cards、與 household-equivalent 的更新成本。這是一個單頁明確 hotspot，適合獨立拆出。

## Goals / Non-Goals

**Goals:**

- 讓 selectedPeriod 可重用 per-period warm cache。
- 讓 highlight、stat、household-equivalent 只跟 selectedPeriod 或故事資料變化時刷新。
- 保留 period selection、fallback、visible stat output 等價。

**Non-Goals:**

- 不改頁面版型或其他 playback 頁。
- 不處理 shared preview 或 management surface。

## Decisions

### Decision 1: Per-period warm cache

selectedPeriod 對應的故事資料一旦解析過，就先作為 warm payload 重用，之後再背景 refresh。

### Decision 2: Selected-period refresh boundary

period 切換只應更新與該 period 綁定的 highlight、stat、household-equivalent content，不應重建不必要的 static subtree。

### Decision 3: No-regression visible period semantics

period button、fallback banner、hero / stat visible output 必須保持等價。

## Implementation Contract

- Behavior: 切回已解析 period 時 SHALL 先顯示 warm payload，再背景 refresh；selectedPeriod 維持不變，visible stat content 不得回退成冷啟 loading 閃爍。
- Interface / data shape: useSustainabilityStoryRuntime 需要支援 per-period warm cache；Sustainability page 需要把 selectedPeriod 與 period-bound content 邊界切開。
- Failure modes: refresh 失敗時保留既有 selectedPeriod、highlight、stat、與 fallback banner 行為。
- Acceptance criteria: period-switch tests 需證明 switch back 無 cold flash；fallback tests 需證明 visible stat output 不退化。
- Scope boundaries:
  - In scope: per-period cache、selected-period refresh boundary、fallback semantics。
  - Out of scope: layout、other playback pages、editor schema。

## Risks / Trade-offs

- [Risk] per-period cache 可能讓短時間顯示舊 period data。 → Mitigation: 保留背景 refresh 與既有 fallback / freshness semantics。
