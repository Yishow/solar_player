## 1. 管理認證端點不留未把關的缺口

- [x] 1.1 依 requirement「Expose management password gate operations over an API」與設計決策「lock 與 state 的門檻是「可信來源」，不是「有效 session」」，讓 `POST /api/management-auth/lock` 先要求 `isTrustedManagementOriginRequest`，不可信來源得到既有的管理存取拒絕外殼且呼叫者的 session 不受影響。先在 `apps/server/src/routes/management-auth.test.ts` 寫出「不可信來源 lock 被拒且既有 session 仍能通過管理讀取」的失敗測試，再實作至通過。
- [x] 1.2 讓 `GET /api/management-auth/state` 同樣先要求 `isTrustedManagementOriginRequest`，仍不要求 management session。以 `management-auth.test.ts` 斷言「不可信來源讀 state 得到拒絕外殼且回應不含 `enabled` 與 `lockedUntil`」與「可信來源在沒有 session 時仍讀得到 `enabled`」驗證。
- [x] 1.3 依設計決策「錯誤回應補欄位而不是換形狀」，讓這四個端點的 400／401／429 回應同時帶 `success: false` 與 ISO 格式 `timestamp`，`authenticated`、`locked`、`lockedUntil`、`error` 等既有欄位一律保留。以 `management-auth.test.ts` 斷言 400 與 429 兩種回應都同時含 `success`、`timestamp` 與原有欄位驗證。

## 2. session cookie 與 session 儲存

- [x] 2.1 依 requirement「Issue and revoke opaque management sessions」與設計決策「`Secure` 的條件是連線安全，不是 SameSite 的值」，讓 `buildManagementSessionCookie` 在連線安全時一律加上 `Secure`，純 HTTP 連線維持不加。先在 `apps/server/src/plugins/managementAuth.test.ts` 寫出「同主機 + HTTPS 的 cookie 同時帶 `SameSite=Strict` 與 `Secure`」的失敗測試，再實作至通過。
- [x] 2.2 依設計決策「過期 session 在發放新 session 時清除」，讓 `issueManagementSession` 在插入新列前刪除所有 `expires_at` 已過的列，回傳值不變。先在 `apps/server/src/services/managementSessionService.test.ts` 寫出「發放新 session 後過期列不再存在、仍有效的 session 仍可驗證通過」的失敗測試，再實作至通過。

## 3. 管理 token 只有一份比對實作

- [x] 3.1 依 requirement「Protect management mutation APIs with a shared access boundary」與設計決策「管理 token 只有一份比對實作，且為固定時間比較」，在 `apps/server/src/plugins/managementAuth.ts` 匯出 `matchesManagementAccessTokenHeader`，內部與 `classifyManagementRequest` 共用同一個實作，並改用 `timingSafeEqual`；長度不同直接回 false，未設定 token 時一律回 false。先在 `managementAuth.test.ts` 寫出涵蓋相符、長度相同但內容不同、長度不同、未設定 token 四種情形的失敗測試，再實作至通過。
- [x] 3.2 讓 `apps/server/src/routes/management-auth.ts` 的 `hasAccessToken` 不再自行讀 `config` 並以 `===` 比對，改為只負責帶入 `config.managementAccessToken` 並委派給 `matchesManagementAccessTokenHeader`，使 token 比對只剩一份實作；`MANAGEMENT_ACCESS_TOKEN` 的辨識行為不變。以既有的「the management access token recovery path is not blocked by a cooldown」測試仍通過驗證。

## 4. 驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/server test src/plugins/managementAuth.test.ts src/routes/management-auth.test.ts src/services/managementSessionService.test.ts`，確認受影響測試全綠且輸出為實際觀察到的結果。
- [x] 4.2 執行 `pnpm verify`，確認 `build`、`bundle-budget`、`server`、`web`、`deploy`、`server-runner` 六個 stage 全數通過。
