## Context

FactoryCircuit 同時依賴 circuits config 與 story runtime。現在的 refresh 仍可能讓 circuits read、dependency key、story payload 更新互相放大，而且錯誤時 last-known usable state 的保留語意還不夠明確。這頁是單獨的 hot path，適合獨立拆出。

## Goals / Non-Goals

**Goals:**

- 明確切開 circuits source 與 story runtime source 的 refresh boundary。
- 在 refresh failure 或 display sync refresh 期間保留 last-known usable state。
- 保留 KPI、fallback、display sync 行為不退化。

**Non-Goals:**

- 不改 circuit settings surface 或 server API。
- 不處理其他 playback 頁。

## Decisions

### Decision 1: Separate circuits source from story refresh

circuits read 與 story refresh 需要明確分開，避免 dependency key 微小變化就讓整條 runtime path 重算。

### Decision 2: Preserve last-known usable runtime state

只要頁面已有 usable circuits-derived runtime 或 story payload，後續 refresh 失敗時就保留該 state，而不是清空成 loading 或假成功。

### Decision 3: No-regression display sync boundary

display sync 仍需觸發正確 refresh，但不得破壞既有 KPI、fallback、或 page-visible semantics。

## Implementation Contract

- Behavior: FactoryCircuit 在 circuits 或 story refresh 時 SHALL 保留 last-known usable state；只有 authoritative result 成功後才覆蓋現有 visible state。
- Interface / data shape: circuits source、story payload、loadState 的組合要有清楚邊界；display sync refresh 只更新必要 source。
- Failure modes: refresh 失敗時保留既有 KPI 與 fallback banner；不得把失敗視為成功同步。
- Acceptance criteria: focused page tests 需證明 refresh failure 不清空 circuits-derived runtime；display sync tests 需證明 refresh 仍會發生但 visible state 不退化。
- Scope boundaries:
  - In scope: FactoryCircuit runtime boundary、last-known state、display sync refresh。
  - Out of scope: circuit settings、other playback pages。

## Risks / Trade-offs

- [Risk] boundary 切分不當可能讓 story 與 circuits 暫時不同步。 → Mitigation: 以 tests 固定 refresh 成功與失敗兩條可觀察行為。
