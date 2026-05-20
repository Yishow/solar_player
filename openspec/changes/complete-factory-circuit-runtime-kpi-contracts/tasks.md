## 1. Runtime contract audit

- [ ] 1.1 實作 `Replace Factory Circuit load heuristics with explicit slot binding` 的盤點，列出各 load row 與五個 KPI 的現有來源，並標示哪些是 prototype heuristic。
- [ ] 1.2 定義新的 slot + KPI aggregate server payload 與 degraded semantics，落實 `make aggregate provenance explicit`。

## 2. Server and page wiring

- [ ] 2.1 擴充 server-side `displayStory` 或相鄰 runtime service，落實 `move kpi truth to the server`。
- [ ] 2.2 移除前端 fabricated `livePowerKw` fallback，改以 explicit empty/degraded state 呈現，落實 `keep skeletons, not fake live numbers`。

## 3. Diagnostics and verification

- [ ] 3.1 將 slot conflict/unbound/missing metric 行為對齊 readiness 與 view model。
- [ ] 3.2 補 server/web tests，覆蓋 aggregate 缺值、slot conflict、slot missing 與 stale runtime 情境。
