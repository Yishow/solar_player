## 1. 管理 session cookie 送得到可信的跨來源管理端

- [x] 1.1 依 requirement「Issue and revoke opaque management sessions」與設計決策「Session cookie 的 SameSite 由發放當下的請求來源決定」，在 `apps/server/src/plugins/managementAuth.ts` 加入並匯出 `resolveManagementSessionCookieSameSite`：無 `Origin`、或 `Origin` 主機等於請求主機時回 `Strict`；`Origin` 主機不同且連線安全（`request.protocol` 為 `https`，或 `x-forwarded-proto` 為 `https`）時回 `None`；`Origin` 主機不同但連線不安全時回 `Strict`。先在 `apps/server/src/plugins/managementAuth.test.ts` 寫出涵蓋這四種來源組合的失敗測試，再實作至通過。
- [x] 1.2 依設計決策「清除 cookie 時沿用同一組 attribute」，在同一檔案加入並匯出 `buildManagementSessionCookie`，讓發放與清除共用同一組 attribute，`SameSite=None` 時一併加上 `Secure`。以 `managementAuth.test.ts` 斷言「同一請求下，設定用與清除用的 cookie 字串帶有相同的 `SameSite` 與 `Secure`」驗證。
- [x] 1.3 讓 `POST /api/management-auth/unlock` 與 `POST /api/management-auth/lock` 改用 `buildManagementSessionCookie`，並在 `Origin` 主機不同且連線不安全時以 `request.log.warn` 記錄該 origin 與「`SameSite=None` 需要 HTTPS」的事實。以 `apps/server/src/routes/management-auth.test.ts` 斷言同主機解鎖得到 `SameSite=Strict`、HTTPS 跨主機解鎖得到 `SameSite=None` 與 `Secure` 驗證。
- [x] 1.4 依設計決策「管理 CORS delegate 必須允許憑證」，讓 `createManagementCorsOptionsDelegate` 的回傳值帶 `credentials: true`，允許來源集合不變。以 `managementAuth.test.ts` 斷言「可信來源得到 `credentials: true` 且 `origin: true`，不可信來源仍得到 `origin: false`」驗證。

## 2. 改密碼路徑回報鎖定

- [x] 2.1 依 requirement「Expose management password gate operations over an API」與設計決策「改密碼與 unlock 共用鎖定，就要共用鎖定的回報形狀」，讓 `PUT /api/management-auth/password` 保留 `verifyManagementPassword` 的結果：鎖定時回 `429` 與 `{ authenticated: false, locked: true, lockedUntil }`，單純密碼錯誤仍回 `401`，持 `MANAGEMENT_ACCESS_TOKEN` 的復原路徑不受鎖定影響。先在 `apps/server/src/routes/management-auth.test.ts` 寫出「冷卻期間改密碼回 429 並帶 lockedUntil」與「token 復原不受冷卻阻擋」的失敗測試，再實作至通過。

## 3. runtime sync 依 page key 保存並以 degraded 優先收斂

- [x] 3.1 [P] 依 requirement「Surface common stale and error semantics after runtime refresh failure」與設計決策「runtime sync 結果以 page key 分別保存，回報時以 degraded 優先收斂」，把 `apps/web/src/services/displayRuntimeSyncReporter.ts` 的單一全域快照改為以 page key 為鍵的紀錄，並記錄寫入次序；`writeDisplayRuntimeSyncSnapshot` 收到沒有 page key 的 update 時不改變任何一筆。先在 `apps/web/src/services/displayRuntimeSyncReporter.test.ts` 寫出「一頁 degraded、另一頁後續 synced，讀取仍回報 degraded 與失敗那頁的 page key 與錯誤訊息」的失敗測試，再實作至通過。
- [x] 3.2 [P] 讓 `readDisplayRuntimeSyncSnapshot` 依 degraded → loading → synced → unknown 的優先序收斂成單一組四欄位值，回傳形狀不變。以 `displayRuntimeSyncReporter.test.ts` 斷言「degraded 的頁自己成功後不再回報 degraded」與「沒有任何一頁回報過時得到 unknown 與三個 null」驗證。
- [x] 3.3 [P] 依設計決策「loading 不沿用舊的錯誤訊息，但保留上一次成功的時間」，讓 `loading` 的錯誤訊息為 null，並讓 `loading` 與 `degraded` 都保留該頁上一次成功的時間戳。以 `displayRuntimeSyncReporter.test.ts` 斷言「degraded 後同頁再次載入，回報 loading、錯誤訊息為 null、時間戳仍為上一次成功的時間」驗證。

## 4. 驗證

- [x] 4.1 執行 `pnpm --filter @solar-display/server test src/plugins/managementAuth.test.ts src/routes/management-auth.test.ts` 與 `pnpm --filter @solar-display/web test`，確認受影響測試全綠且輸出為實際觀察到的結果。
- [x] 4.2 執行 `pnpm verify`，確認 `build`、`server`、`web`、`deploy`、`server-runner` 五個 stage 全數通過。
