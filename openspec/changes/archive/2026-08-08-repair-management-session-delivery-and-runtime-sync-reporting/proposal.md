## Why

Spec 軸 review 對 `2026-08-08` 那批已歸檔 change 找出三個實作與 spec 不符之處，都不是漏做，而是做了但行為錯誤：

1. **管理 session cookie 到不了跨來源的管理端。** `management-auth.ts` 一律以 `SameSite=Strict` 發放 session cookie，且管理 CORS delegate 沒有帶 `credentials`。`MANAGEMENT_TRUSTED_ORIGINS` 的存在就是為了讓管理介面可以放在另一個 origin，但那種 caller 的瀏覽器要嘛不送 cookie、要嘛被 CORS 擋掉憑證回應，於是 `trusted` 成立而 `passwordGateSatisfied` 永遠不成立——密碼閘一開，該來源就永久鎖死，只剩 `MANAGEMENT_ACCESS_TOKEN` 一條路。

2. **輪播會蓋掉出問題那一頁的同步狀態。** `displayRuntimeSyncReporter` 是單一全域快照，五個 playback 頁共用。overview 失敗後輪到 images 成功，快照被覆寫成 `synced`，heartbeat 的 `runtimeSyncPageKey` 只反映最後載入者。「失敗改由 heartbeat 回報管理端」這條契約因此在輪播情境下失效——管理端看到的是最後一頁，不是壞掉那一頁。同一個函式在 `loading` 時保留上一次的 `runtimeSyncError`，與 spec 表格 `loading → 錯誤訊息為 null` 不符。

3. **改密碼路徑吞掉鎖定語意。** `PUT /api/management-auth/password` 以 `verifyManagementPassword` 驗 current password，會共用並推進 unlock 的失敗鎖定，但無論鎖定與否都只回 `401`，不回 `429` 與 `lockedUntil`。使用者在冷卻期間輸入正確密碼會被當成密碼錯誤，且無從得知要等多久。

## What Changes

- 管理 session cookie 的 `SameSite` 由發放當下的請求來源決定：同主機或無 Origin 維持 `Strict`；跨主機且連線為 HTTPS 時改用 `None; Secure`；跨主機但連線不安全時維持 `Strict` 並記錄警告，讓 operator 看得到閘門打不開的原因。
- 管理 CORS delegate 在允許的來源上帶 `credentials`，讓跨來源的管理請求能真的攜帶並接收 session cookie。
- `displayRuntimeSyncReporter` 改為以 page key 分別保存每一頁的結果，heartbeat 讀取時以「有任何一頁 degraded 就回報最近的那一頁」的優先序收斂成單一回報值，wire 形狀不變。
- `loading` 不再沿用上一次的錯誤訊息。
- `PUT /api/management-auth/password` 在 current password 驗證落入鎖定時回 `429` 與 `lockedUntil`，與 `POST /api/management-auth/unlock` 一致。

## Non-Goals

- 不改 heartbeat 的欄位形狀，也不改 `packages/shared` 的 `DisplayClientHeartbeat`；管理端仍只讀單一組 runtime sync 欄位。
- 不放寬管理存取信任判定：可信來源的判定條件、site scope 邊界、`MANAGEMENT_ACCESS_TOKEN` 的角色都不動。
- 不處理「跨站 + 純 HTTP」這個組合。瀏覽器要求 `SameSite=None` 必須搭配 `Secure`，server 端無法補救；本 change 只讓失敗有訊號，不假裝能成功。
- 不動 Standards 軸的 findings（`brand.ts` 清單重複、`/api/management-auth/lock` 未受閘、timing-safe 比較重複等），那些另案處理。

## Capabilities

### Modified Capabilities

- `management-password-gate`: session cookie 的 `SameSite` 依請求來源決定；改密碼路徑必須回報鎖定狀態
- `display-page-runtime-refresh-contracts`: runtime sync 結果依 page key 分別保存，回報時以 degraded 優先收斂；`loading` 不保留舊錯誤訊息

## Impact

- `apps/server/src/routes/management-auth.ts`
- `apps/server/src/plugins/managementAuth.ts`
- `apps/server/src/app.ts`
- `apps/web/src/services/displayRuntimeSyncReporter.ts`
- `apps/server/src/routes/management-auth.test.ts`
- `apps/server/src/plugins/managementAuth.test.ts`
- `apps/web/src/services/displayRuntimeSyncReporter.test.ts`
