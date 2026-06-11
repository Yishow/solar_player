## Context

Overview 與 Solar 都有大量靜態 layout、hero media、ornament、connector geometry，但 runtime 更新主要只改 value、trend、story copy、或 weather data。若不先把靜態 subtree 邊界拉出來，任何後續數據 refresh 都會持續擴大 rerender 範圍。

## Goals / Non-Goals

**Goals:**

- 把 Overview、Solar 的 static layout / media subtree 固定下來。
- 讓 value-only refresh 只影響 runtime values、story copy、與必要的 widget content。
- 保留既有 fallback banner、hero、connector、KPI 行為。

**Non-Goals:**

- 不改 editor schema 或 FHD 目標。
- 不碰其他 playback 頁。

## Decisions

### Decision 1: Stable static subtree boundaries

hero media、layout geometry、ornament、connector 與 card shell 只有在 config 或 asset source 改變時才更新。

### Decision 2: Value-bearing runtime subtree only

live metrics、story payload、weather snapshot 只能驅動 value-bearing subtree，不能反向拉動整頁靜態 layout 重算。

### Decision 3: No-regression fallback and KPI behavior

fallback banner、hero、connector、KPI visible output 與錯誤語意必須維持等價。

## Implementation Contract

- Behavior: Overview 與 Solar 在 live metrics、story、weather 更新時 SHALL 只更新 value-bearing subtree；static layout、hero media、connector geometry SHALL 保持等價輸出。
- Interface / data shape: component 組裝需要明確區分 static subtree 與 value subtree；fallback banner 仍讀取既有 config/runtime error path。
- Failure modes: runtime refresh 失敗時，既有 fallback banner 與 last-known visible state 必須保留。
- Acceptance criteria: render tests 需證明 config 不變時 static subtree 等價； runtime failure tests 需證明 fallback 行為不退化。
- Scope boundaries:
  - In scope: Overview、Solar 的 static/value subtree 邊界。
  - Out of scope: page cache、editor schema、其他 playback 頁。

## Risks / Trade-offs

- [Risk] subtree 邊界切錯會漏掉必要更新。 → Mitigation: 用 render tests 分別覆蓋 config change 與 value-only refresh。
