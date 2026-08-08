## Context

`/api/management-auth/` 這四個端點被 `isManagementMutationRequest` 刻意排除在全域 mutation gate 之外——否則密碼閘一啟用，連解鎖端點都會被自己擋住，形成死鎖。代價是每個端點必須自己把關。目前 `unlock` 檢查了可信來源、`password` 檢查了可信來源加上 session 或 token，`lock` 與 `state` 兩個什麼都沒檢查。

session cookie 的 `Secure` 目前綁在 `SameSite=None` 上，因為 `None` 沒有 `Secure` 會被瀏覽器拒收。但 `Secure` 本身的用途是「不要在明文連線上送出這顆 cookie」，這件事在 `SameSite=Strict` 的 HTTPS 部署上同樣需要。

`management_sessions` 只有兩條刪除路徑：`revokeManagementSession`（明確登出）與 `verifyManagementSession` 查到過期列時的順手刪除。瀏覽器直接關掉、cookie 過期不再被送出的 session 兩條都走不到。

## Goals / Non-Goals

**Goals:**

- 讓 `/api/management-auth/` 這四個端點的信任把關一致，不留沒有把關的缺口。
- 讓 session cookie 在能保護它的連線上就受保護。
- 讓 session 表不會單向成長。
- 讓管理 token 的比對只有一份實作，且不因比較方式洩漏資訊。

**Non-Goals:**

- 不改可信來源的判定條件、密碼閘的判定順序、site scope 邊界。
- 不改 `isManagementMutationRequest` 的排除規則。
- 不移除既有回應欄位。
- 不處理重複／死碼 findings 與上傳副檔名清單。

## Decisions

### lock 與 state 的門檻是「可信來源」，不是「有效 session」

兩個端點都必須在還沒有 session 的情況下可用：`state` 是解鎖畫面判斷要不要顯示自己的依據，`lock` 對已經無效的 session 呼叫也應該成功（冪等地清掉 cookie）。因此門檻取 `isTrustedManagementOriginRequest`——只看來源信任，不疊密碼閘。這與 `unlock` 用的是同一個判定。

`state` 因此仍然滿足 spec 的「不需要 management session 也讀得到」，只是把「任何來源」收斂成「可信的管理來源」。前端只有 `ManagementShell` 讀這個端點，而它一定跑在可信來源上，所以解鎖流程不受影響。

### `Secure` 的條件是連線安全，不是 SameSite 的值

`SameSite=None` 必須有 `Secure` 是瀏覽器的硬性要求，但那只是 `Secure` 的其中一個觸發條件。真正的判準是「這條連線是 HTTPS 嗎」——是的話就標 `Secure`，讓 cookie 不會在明文連線上被送出。純 HTTP 的區域網路部署維持沒有 `Secure`，否則 cookie 會直接失效。

判斷沿用既有的 `isSecureRequest`，它同時看 `request.protocol` 與 `x-forwarded-proto`。

### 過期 session 在發放新 session 時清除

不引入排程器或背景工作。發放是一個天然的低頻寫入點，順手做一次 `DELETE ... WHERE expires_at <= now` 就能讓表的大小跟著活躍 session 走。這個刪除只影響已經無法通過驗證的列，不改變任何有效 session 的行為。

### 管理 token 只有一份比對實作，且為固定時間比較

`management-auth.ts` 的 `hasAccessToken` 刪除，改呼叫從 plugin 匯出的同一個函式。token 是高熵隨機值，字串比較的 timing 洩漏在實務上難以利用，但固定時間比較的成本近乎為零，而且 repo 在密碼路徑已經用了 `timingSafeEqual`，沒有理由在 token 路徑退回 `===`。長度不同時直接回 false，不進入比較。

### 錯誤回應補欄位而不是換形狀

`docs/ops/conventions.md` 同時記載「常見錯誤形狀是 `{ success: false, error, timestamp }`」與「改 API 時跟隨該 route 既有形狀，不要硬套新 envelope」。這兩件事在這裡不衝突：加上 `success: false` 與 `timestamp` 讓形狀向常見形狀靠攏，同時保留 `authenticated`、`locked`、`lockedUntil` 這些前端已經在讀的欄位。純新增，前端不需要改。

## Implementation Contract

**Behavior**

- 不可信來源呼叫 `POST /api/management-auth/lock` 得到管理存取拒絕回應，且呼叫者的 session 不受影響。
- 不可信來源呼叫 `GET /api/management-auth/state` 得到管理存取拒絕回應，回應中不包含 `enabled` 或 `lockedUntil`。
- 可信來源在沒有 session 的情況下仍然讀得到 `state`，也仍然 lock 得了。
- 在 HTTPS 連線上解鎖，session cookie 帶 `Secure`；純 HTTP 連線上不帶。
- 發放新 session 後，已過期的 session 列不再存在於資料庫。
- `MANAGEMENT_ACCESS_TOKEN` 的辨識行為不變：值相同才算通過，未設定時一律不通過。
- `/api/management-auth/` 的 400、401、429 回應同時帶 `success: false` 與 ISO 格式的 `timestamp`，既有欄位保留。

**Interface / data shape**

- `apps/server/src/plugins/managementAuth.ts` 匯出 `matchesManagementAccessTokenHeader(headers, managementAccessToken)`，內部與 `classifyManagementRequest` 共用同一個實作。
- `apps/server/src/services/managementSessionService.ts` 的 `issueManagementSession` 行為擴充為「先刪除過期列，再插入新列」，回傳值不變。
- `buildManagementSessionCookie` 在連線安全時加上 `Secure`，其餘 attribute 規則不變。
- 錯誤回應形狀由 `{ error }` 擴充為 `{ success: false, error, timestamp }`，鎖定回應由 `{ authenticated, locked, lockedUntil }` 擴充為再加上 `success: false`、`error`、`timestamp`。

**Failure modes**

- lock 與 state 被拒時回既有的管理存取拒絕外殼，與其他管理端點一致，不新增錯誤碼。
- 過期 session 的刪除失敗不應阻擋發放；它是清理，不是發放的前置條件。
- token 未設定（`null`）時比對一律回 false，與現行行為相同。

**Acceptance criteria**

- `apps/server/src/routes/management-auth.test.ts` 覆蓋：不可信來源 lock 被拒且 session 仍有效、不可信來源讀 state 被拒且回應不含 `enabled`、可信來源無 session 仍讀得到 state、HTTPS 解鎖的 cookie 帶 `Secure`、錯誤回應帶 `success: false` 與 `timestamp`。
- `apps/server/src/services/managementSessionService.test.ts` 覆蓋「發放新 session 後過期列被清除」。
- `apps/server/src/plugins/managementAuth.test.ts` 覆蓋 `matchesManagementAccessTokenHeader` 的相符、不符、未設定三種情形。
- `pnpm verify` 全綠。

**Scope boundaries**

- 在範圍內：`management-auth.ts`、`managementAuth.ts`、`managementSessionService.ts` 與這三者的測試。
- 不在範圍內：前端任何檔案、`isManagementMutationRequest` 的排除規則、可信來源判定、`managementPasswordService.ts` 的鎖定策略、Standards 軸的重複與死碼 findings、上傳副檔名清單。

## Risks / Trade-offs

- 收緊 `state` 之後，任何跑在非可信來源的管理端會看到拒絕而不是「閘門已啟用」。這正是預期行為，但若有人把管理介面放在未列入 `MANAGEMENT_TRUSTED_ORIGINS` 的 origin，症狀會從「顯示解鎖畫面」變成「被拒絕」。設定不全的部署因此會更早暴露問題，而不是更晚。
- 在 HTTPS 上加 `Secure` 後，若某個部署以 HTTPS 提供管理介面卻以 HTTP 提供 API，cookie 會停止運作。這種混合部署本來就不該存在，讓它失敗比讓 cookie 在明文上流動好。
- 發放時清除過期列會讓解鎖多一次寫入。頻率極低，影響可忽略。
