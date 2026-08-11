## Why

Circuit Settings 的 create/update 目前直接接受 rated capacity 與 normal/attention/warning 門檻，沒有驗證負數、上下限倒置或區間彼此交錯。資料仍能成功存入並被畫面使用，因此不是明顯 crash，而是更危險的「系統正常顯示，但正常/注意/警告判斷失去意義」。需要在持久化前以完整 candidate state 驗證。

## What Changes

- 建立單一 circuit threshold validator，create 與 partial update 共用。
- 額定容量與各門檻必須是有限非負數，且有效 candidate 必須符合 `normalMin <= normalMax <= attentionMin <= attentionMax <= warningMin <= warningMax <= ratedCapacity`。
- partial update 先和 existing row 合併，再驗證完整候選值；不能只檢查 request 內幾個欄位而漏掉跨欄位衝突。
- invalid mutation 回 400 與 operator-readable field/range reason，DB row 與 display sync state完全不變。
- UI 在送出前做相同規則的即時提示，但 server validation 保持 authoritative。

## Non-Goals

- 不改 circuit slot binding、MQTT topic mapping 或 Factory Circuit 畫面布局。
- 不自動修改既有 production 中可能已不合法的 row；先以 diagnostics 找出，再由 operator 修正。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `circuit-settings-operations-surface`: circuit create/update 必須拒絕負值、倒置或交錯 threshold candidate，並提供一致的管理頁 feedback。

## Impact

- Affected specs: `circuit-settings-operations-surface`
- Affected code: circuits route/service validation、Circuit Settings view model/form 與 tests；可選 readiness diagnostic 標示既有 invalid rows。
- Affected data: 無 schema migration；既有 invalid rows 不自動覆寫。
