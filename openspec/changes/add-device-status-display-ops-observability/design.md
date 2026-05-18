## Context

`DeviceStatus` 目前主要呈現主機資源與少量維護操作結果，對 display operations 幾乎沒有可見性。當現場問題其實是未發布草稿、某頁被 skip、asset health 異常或 readiness 缺口時，操作者仍需切換多個頁面交叉比對。

## Goals / Non-Goals

**Goals:**

- 在 DeviceStatus 補上 display operations summary。
- 顯示 display readiness、skip reason 與 asset health 類型警示。
- 提供與 display operations 相關的 diagnostics 入口。

**Non-Goals:**

- 不在此 change 內重做裝置系統層監控實作。
- 不在此 change 內直接處理 editor 內容編輯。
- 不在此 change 內建立全新的遠端操作平面。

## Decisions

### Extend Device Status with display operations summary instead of a separate dashboard

現有 DeviceStatus 已是維運入口之一，因此優先在此擴充 display operations summary，而不是另開一頁新的 dashboard。這降低切頁成本，也讓裝置與展示問題能放在同一視圖。

### Reuse readiness, publish, and asset findings from other services

DeviceStatus 不自行重新計算 publish、readiness 與 asset health，而是重用對應服務的聚合結果。這避免觀測資料與管理頁顯示不一致。

### Keep diagnostics bounded to safe read and refresh actions

DeviceStatus 的 diagnostics 只包含安全讀取、重新同步與摘要導出，不擴成危險裝置控制面。

## Implementation Contract

- Behavior:
  - DeviceStatus 可顯示 live version、最近發布、draft backlog、skip 狀態與 readiness/asset 類警示摘要。
  - 維運人員可從 DeviceStatus 觸發安全的 display diagnostics，如重新同步 readiness 或導出 display operations 摘要。
- Interface / data shape:
  - device-display-ops summary 至少支援 `liveVersion`, `lastPublishAt`, `draftCount`, `skipSummary`, `readinessSummary`, `assetHealthSummary`, `diagnosticActions`。
- Failure modes:
  - 若 display operations summary 服務暫時不可用，DeviceStatus 仍保留裝置資源資訊，但明示 display diagnostics 不可用。
  - diagnostics action 失敗時回傳可閱讀錯誤，不影響其他 status 區塊。
- Acceptance criteria:
  - server tests 覆蓋 DeviceStatus 所用 summary 聚合與 diagnostics action 回應。
  - web tests 或手動驗證覆蓋 DeviceStatus 新狀態卡與摘要呈現。
- Scope boundaries:
  - in scope: display-ops summary、display-readiness alerts、bounded diagnostics。
  - out of scope: 危險裝置操作、自動修復流程。

## Risks / Trade-offs

- [Risk] DeviceStatus 變太重 → Mitigation: 以摘要優先，細節透過展開或導出呈現。
- [Risk] 多服務聚合造成延遲 → Mitigation: 摘要優先、必要時快取，並允許局部失敗回報。
- [Risk] diagnostics 容易被擴成控制面 → Mitigation: 嚴格限定為 read and refresh 類安全動作。
