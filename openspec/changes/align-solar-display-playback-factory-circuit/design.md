## Context

這個 change 對應 umbrella rollout 的 Playback Batch B。`/factory-circuit` 的主要風險不在 general KPI，而在 flow diagram、circuit threshold、status label 與 empty-state behavior，所以需要獨立處理。

## Goals / Non-Goals

**Goals:**

- 讓 `/factory-circuit` 對齊 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` 的 flow 與 circuit card structure。
- 集中處理 status label / color / load percentage mapping。
- 保留空 circuits、離線 fallback 與 playback route contract。

**Non-Goals:**

- 不處理其他四條 playback route。
- 不變更 circuits API schema。

## Decisions

### Treat factory circuit as a standalone flow-heavy playback batch

這頁的 risk profile 與 KPI/hero 頁不同，所以不能和其他 playback 頁混做。

### Centralize circuit threshold and empty-state mapping

`warningMin`、`attentionMin`、empty state 等行為要集中定義，避免散落在 render branches。

## Implementation Contract

**Behavior**

- `/factory-circuit` 應接近 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` 的 flow composition。
- circuit status 顯示與空資料狀態應一致且可預測。

**Interface / data shape**

- 現有 circuits API shape 不變。
- page-local adapter 需定義 circuit row 到 UI status、color、percentage 的映射。

**Failure modes**

- 若 API 回空陣列，頁面仍需保留完整 section structure。
- 若 threshold mapping 分散在 JSX 中，後續 drift 風險過高。

**Acceptance criteria**

- `pnpm --filter @solar-display/web build` 成功。
- 人工對照 `docs/reference/kuozui-green-fhd-html-prototype/html-pages/03-factory-circuit.html` 檢查 flow node、connector、circuit card composition。
- 斷線或空資料時頁面不破版。

**Scope boundaries**

- In scope：`/factory-circuit`、flow 元件、threshold mapping。
- Out of scope：其他 playback 頁。

## Risks / Trade-offs

- [如果這頁和其他 playback 頁一起做] → flow-specific mapping 容易被忽略。
- [如果空資料狀態沒被明確規格化] → 最容易在 demo 時破版。
