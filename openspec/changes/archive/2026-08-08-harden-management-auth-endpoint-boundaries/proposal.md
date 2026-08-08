## Why

Standards 軸 review 在管理認證這一組端點上找出五個安全相關的缺口。它們都不是設計上的取捨，而是既有規則沒有一致套用：

1. **`POST /api/management-auth/lock` 沒有任何信任檢查。** 全域 mutation gate 以 `isManagementMutationRequest` 排除整個 `/api/management-auth/`，讓 unlock 與改密碼自行把關；`/lock` 卻沒有補上。任何能連到 server 的來源都能撤銷管理員當下的 session。
2. **`GET /api/management-auth/state` 對任意來源回答。** spec 要求這個狀態「不需要 management session 也讀得到」，好讓管理端決定要不要顯示解鎖畫面；但那不等於任何來源都能問。目前它會對外洩漏密碼閘是否啟用與鎖定到什麼時候。
3. **session cookie 在安全連線上仍然沒有 `Secure`。** `SameSite=None` 的路徑已經帶了 `Secure`，但同主機的 `Strict` 路徑即使跑在 HTTPS 上也沒有，cookie 因此可能被降級到明文連線送出。
4. **過期的 `management_sessions` 只在被查到時才刪除。** 沒有再被查詢的過期列會永久留在資料庫裡累積。
5. **管理 token 有兩份比對實作。** `management-auth.ts` 的 `hasAccessToken` 自己讀 `config` 並用 `===` 比對，與 plugin 內的 `matchesHeaderAccessToken` 平行存在；兩份都是非 timing-safe 的字串比較，且哪一份才是真相來源並不明確。

另外，這一組端點的錯誤回應是 `{ error }`，而 `docs/ops/conventions.md` 記載的常見錯誤形狀是 `{ success: false, error, timestamp }`，同一組端點的拒絕外殼也已經是後者。

## What Changes

- `POST /api/management-auth/lock` 要求可信的管理來源，與 `POST /api/management-auth/unlock` 同一條標準。
- `GET /api/management-auth/state` 要求可信的管理來源；仍然不要求 management session，因此解鎖畫面照常運作。
- 管理 session cookie 在連線安全時一律帶 `Secure`，不再只有 `SameSite=None` 的路徑才帶。
- 發放新 session 時順手刪除已過期的 session 列。
- 管理 token 的 header 比對收斂成一份實作，並改用固定時間比較。
- 這一組端點的錯誤回應補上 `success: false` 與 `timestamp`，既有欄位一個都不移除。

## Non-Goals

- 不改可信來源的判定條件本身，也不改密碼閘的判定順序。
- 不動 `isManagementMutationRequest` 對 `/api/management-auth/` 的排除；那個排除是必要的，否則密碼閘一開就沒有端點可以解鎖。
- 不移除或重新命名任何既有的回應欄位，前端不需要跟著改。
- 不處理 Standards 軸的重複與死碼 findings，也不處理上傳副檔名清單那一則；那些另案。

## Capabilities

### Modified Capabilities

- `management-password-gate`: lock 與 state 端點要求可信管理來源；session cookie 在安全連線上帶 `Secure`；過期 session 列會被清除；錯誤回應形狀補齊
- `management-api-access-boundaries`: 管理 token 的 header 比對收斂成單一實作並改用固定時間比較

## Impact

- `apps/server/src/routes/management-auth.ts`
- `apps/server/src/plugins/managementAuth.ts`
- `apps/server/src/services/managementSessionService.ts`
- `apps/server/src/routes/management-auth.test.ts`
- `apps/server/src/plugins/managementAuth.test.ts`
- `apps/server/src/services/managementSessionService.test.ts`
