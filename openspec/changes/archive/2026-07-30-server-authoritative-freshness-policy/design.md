## Context

此前置為 device-scoped playback 與 Server App Time。現有 displayPageFreshness 使用單一 message timeout window；此 change 將來源分類為四類全域政策，保持 Server 權威與 Site Scope。

## Goals / Non-Goals

**Goals:**

- 以 realtime、daily、cumulative、static 四類集中管理 freshness。
- 回傳 source timestamp、age與 live/delayed/stale/historical 狀態。
- 讓 Readiness、Rotation與 UI 使用同一結果。

**Non-Goals:**

- 不建立逐 Metric threshold、per-device policy或外部授時。
- 不在此 change 建立 IndexedDB/Service Worker。
- 不讓 Client 在線時重新判定與 Server 不同的 freshness。

## Decisions

### Classify metrics into four policy buckets

shared registry 將每個 runtime datum 映射一個 category。Seed defaults 為 realtime 30秒/90秒/30分鐘、daily 26小時/48小時/7天、cumulative 10分鐘/60分鐘/24小時，依序表示 delayed/stale/historical；static 永不因 age 降級。Operator 可調整三個遞增正數門檻。

### Evaluate freshness on the Server with source timestamps

Server 以可信 App Time與 source timestamp計算 age；response 包含 category、state、sourceTimestamp、ageMs與nextTransitionAt。Readiness與Effective Rotation消費同一 evaluator，不自行重算。

### Continue offline aging only while App Time is trusted

Client在線直接使用 Server結果。短暫離線以最後 snapshot與monotonic elapsed推進到下一狀態；time-untrusted凍結 age/state直到重新同步，且不改用 OS Clock。

### Render provenance instead of pretending live

delayed顯示「資料延遲」、stale顯示「非即時資料」、historical顯示「歷史快照」；三者皆顯示完整 source time。非 live 停止 pulse、trend direction與「目前」措辭。

## Implementation Contract

**Behavior**

- 同一 source timestamp與App Time在所有Client得到相同 state。
- Site-scoped Readiness不受另一Site的 stale datum影響。
- threshold更新立即改Server判定，Client於安全 refresh取得一致結果。
- static資料保留source time但不因age變 stale。

**Interface / data shape**

- FreshnessPolicy 每 category 含 delayedAfterMs、staleAfterMs、historicalAfterMs；三值必須嚴格遞增。
- Runtime freshness payload含 category/state/sourceTimestamp/ageMs/nextTransitionAt。
- Management routes為 GET/PUT /api/freshness-policy。

**Failure modes**

- invalid、非遞增或負門檻回400且保留舊policy。
- source timestamp缺失回unavailable，不偽造current time。
- time-untrusted保留最後可信state並標記ageFrozen=true。

**Acceptance criteria**

- shared table-driven boundary tests覆蓋每類與exact threshold。
- server route/readiness/rotation與web語意 tests通過。
- pnpm test/build/verify與五頁 fresh witness/evidence bundle通過；視覺語意由使用者驗收。

**Scope boundaries**

- In scope：policy schema/API/evaluator、Readiness/Story/Rotation integration、status UI。
- Out of scope：offline persistence、per-metric UI、Service Worker。

## Risks / Trade-offs

- [預設門檻不符現場資料週期] → 管理者可調四類政策，禁止逐Metric漂移。
- [歷史資料持續顯示被誤讀] → 強制source time與語意升級，historical停止即時暗示。
