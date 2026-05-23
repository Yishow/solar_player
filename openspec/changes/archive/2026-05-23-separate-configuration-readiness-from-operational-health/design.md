## Context

`display-readiness` 與 `device-display-ops` 原本扮演不同角色：前者回答「設定是否具備 production playback 前提」，後者回答「目前 live playback / asset / publish state 是否健康」。但現況 `readDeviceDisplayOpsSummary()` 直接把 readiness findings 與 displayOps blocking issues 混成單一 alert 集合，並用同一個 `readinessSummary.blockingCount` 與 `degraded` 對外輸出。結果是 configuration 問題與 operational fault 被雙重計數、語意互相覆蓋，`Device Status` 也無法清楚表達現在到底是設定尚未完成，還是 live runtime 正在退化。

這個 change 的範圍只修 summary contract 與 Device Status 呈現，不重寫 readiness rule 或 playback skip policy。

## Goals / Non-Goals

**Goals:**

- 讓 configuration readiness 與 operational health 在 `device-display-ops` summary 中有清楚分域。
- 保持 triage 與 operator helper 可從分域 alerts 中挑出主因，而不是犧牲既有指引能力。
- 讓 `Device Status` 的 labels、feedback 與 helper 文案不再用單一 blocking/degraded 值混合兩種問題。

**Non-Goals:**

- 不變更 `/api/display-readiness` 的 finding 規則或 requirement coverage。
- 不改 `displayRotationService` 的 skip policy、`displayOpsService` 的 blocking issue 判斷，或 `Offline Error` 的版面邏輯。
- 不做新的 diagnostics action，也不擴張 host-level safe ops 範圍。

## Decisions

### Keep display-readiness focused on configuration prerequisites

`/api/display-readiness` 與 `readDisplayReadinessReport()` SHALL 繼續只代表 configuration prerequisites，例如 MQTT mappings 與 slot bindings。operational skip、asset health、stale runtime 等 live faults 仍留在 `displayOps` family。這樣 readiness report 仍可作為前置設定清單，而不是被 live 故障污染。

替代方案是把 operational faults 也寫回 readiness report。這會讓 readiness 失去「前提是否已滿足」的邊界，並讓現有 management surfaces 更難理解，因此排除。

### Tag device display alerts with their domain before aggregation

`DeviceDisplayAlert` SHALL 帶出 alert domain，至少區分 `configuration-readiness` 與 `operational-health`。server aggregation 先保留單一 alerts 陣列供 triage 重用，但 summary counts 與 UI 呈現必須按 domain 分開計算，避免同一個 readiness finding 既出現在 readiness count，又被 runtime issues 再算一次。

替代方案是完全移除合併後的 alerts 陣列。這會讓 triage 與既有 consumer 需要一起重寫，超出本 change 範圍，因此排除。

### Surface separated configuration readiness and operational health summaries in Device Status

`DeviceDisplayOpsSummary` SHALL 對外提供分開的 configuration readiness summary 與 operational health summary，並讓 `Device Status` 以各自 label/helper 顯示。`degraded` 若保留，語意也必須只代表 operational health，而不是把 readiness blocking 一起算進去。

替代方案是維持單一 `readinessSummary` 與 `degraded`，只調整 UI 文案。這無法修正 API contract 本身的雙重計數與語意混淆，因此排除。

## Implementation Contract

- Behavior: `Device Status` 能明確分辨「設定尚未完成」與「live operational health 退化」兩類狀態；同一個 readiness finding 不再與 runtime/skip issues 混成同一個 blocking count。
- Interface / data shape:
  - `DeviceDisplayAlert` 新增 `domain: "configuration-readiness" | "operational-health"`。
  - `DeviceDisplayOpsSummary` 以分開的 summary blocks 輸出 configuration readiness 與 operational health；若保留 `degraded`，其語意只屬於 operational health。
  - `Device Status` diagnostics feedback 與 helper 文案會分別引用 readiness count、operational blocking/skip/asset 狀態，而不是只讀單一 blocking 指標。
- Failure modes: 若任何一側 summary 暫時缺資料，另一側仍可獨立呈現；此 change 不把兩邊綁成「全部成功才顯示」。
- Acceptance criteria:
  - server tests 覆蓋 readiness findings 不再被 operational summary 雙算，且 alerts 帶出正確 domain。
  - web tests 覆蓋 `Device Status` helper/labels 會分開呈現 readiness 與 operational health。
  - `pnpm --filter @solar-display/server test` 與 `pnpm --filter @solar-display/web test` 通過。
- Scope boundaries: 只修 `device-display-ops` summary contract、shared types、Device Status UI/feedback；不改 readiness evaluator 規則與 playback skip semantics。

## Risks / Trade-offs

- [Risk] 增加 alert domain 與分域 summary 後，shared type 與現有 consumer 需要同步更新。 → Mitigation：保留合併 alerts 陣列供 triage 重用，只新增必要欄位與 summary blocks。
- [Risk] 若 `degraded` 語意改為 operational-only，既有 UI 可能短期看起來「比較不嚴重」。 → Mitigation：同時在 Device Status 補出獨立 readiness label，避免 readiness blocking 被隱藏。
- [Risk] 只調整 Device Status，其他 surfaces 仍可能延續舊語意。 → Mitigation：本 change 明確限定在 `device-display-ops` / `Device Status`；若 Playback/Offline surfaces 需要同樣分域，再另開 change。
