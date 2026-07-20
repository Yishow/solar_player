## 1. Eligibility model

- [x] 1.1 實作 `Evaluate display readiness checks from MQTT and circuit configuration` 與 `Maintain a first-class rotation plan for display pages` 的 unified page-eligibility model，落實 `readiness findings must affect rotation`。
- [x] 1.2 實作 `Record skip reason reporting for skipped display pages` 的 reason hierarchy，落實 `report the dominant skip reason`。

## 2. Runtime wiring

- [x] 2.1 調整 server rotation 與 display-ops summary，使 blocking readiness 會進入實際播放判斷。
- [x] 2.2 調整前端 offline/fault routing 與 effective rotation 顯示，並實作 `Keep fallback policy in shared display page configuration metadata` 的 policy-driven gate，落實 `mock/demo fallback must be policy-driven`。

## 3. Verification

- [x] 3.1 補 server/web tests，覆蓋 missing MQTT mapping、slot conflict、stale metrics、missing asset 與 unpublished page。
- [x] 3.2 驗證 mock/demo policy 與 production blocking policy 能被正確區分。
