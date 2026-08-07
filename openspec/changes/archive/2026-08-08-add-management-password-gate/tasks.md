## 1. 資料結構與密碼保存

- [x] 1.1 新增 `apps/server/src/db/migrations/034_management_password_gate.sql`，建立單列的管理密碼設定表（啟用旗標、雜湊、salt、KDF 參數、連續失敗次數、鎖定截止時間、更新時間）與管理 session 表（token 雜湊、建立時間、到期時間），且密碼閘預設為關閉。以 `pnpm db:migrate` 在乾淨資料庫上執行成功、並確認既有資料表不受影響作為驗證。
- [x] 1.2 依「Store the management password with a slow key derivation function」與設計決策「以 scrypt 加隨機 salt 保存密碼」，實作 `managementPasswordService` 的設定與驗證：以 `node:crypto` 的 `scrypt` 搭配每組密碼獨立隨機 salt 導出雜湊、以 `timingSafeEqual` 比對、KDF 參數與雜湊一同保存。先在 `apps/server/src/services/managementPasswordService.test.ts` 寫出「同密碼不同 salt 產生不同雜湊且皆可驗證」與「錯誤密碼驗證失敗」的失敗測試，再實作至通過。
- [x] 1.3 依「Limit repeated password attempts」與設計決策「失敗嘗試在 server 端計數並暫時鎖定」，讓 `managementPasswordService` 記錄連續失敗次數、達門檻後進入冷卻並在冷卻期間拒絕所有解鎖（含正確密碼）、成功後計數歸零。在同一測試檔補上三個對應的失敗測試後實作至通過。

## 2. 管理 session

- [x] 2.1 依「Issue and revoke opaque management sessions」與設計決策「管理 session 以 HttpOnly cookie 攜帶不透明 token」，實作 `managementSessionService`：產生高熵隨機 token、只存其雜湊與到期時間、可依 token 驗證出未過期的 session。先在 `apps/server/src/services/managementSessionService.test.ts` 寫出「發放後可驗證」與「過期後驗證失敗」的失敗測試，再實作至通過。
- [x] 2.2 依設計決策「變更密碼或關閉密碼閘時失效全部既有 session」，讓 `managementSessionService` 提供一次失效全部 session 的操作，並在測試中斷言失效後既有 token 立即無法通過驗證。

## 3. 存取邊界整合

- [x] 3.1 依「Gate management access on a valid management session when enabled」與設計決策「密碼閘作為既有來源信任之上的第二道條件」，讓 `apps/server/src/plugins/managementAuth.ts` 的管理存取判定在既有來源信任成立後，於密碼閘開啟時再要求有效 session 或有效 `MANAGEMENT_ACCESS_TOKEN`，並在判定結果新增一個欄位表示是否滿足密碼閘。在 `apps/server/src/plugins/managementAuth.test.ts` 以 spec 中的決策對照表為案例寫出六組失敗測試後實作至通過。
- [x] 3.2 依「Protect management mutation APIs with a shared access boundary」，斷言密碼閘開啟且無 session 時，管理 mutation 端點回傳既有的管理存取拒絕外殼且不套用變更；密碼閘關閉時判定結果與變更前一致。以既有的管理 mutation 路由測試補上這兩條斷言驗證。
- [x] 3.3 依「Restrict management-only read routes to trusted operator callers」，斷言密碼閘開啟且無 session 時，管理唯讀路由回傳拒絕回應且不含管理 payload。以既有的管理唯讀路由測試補上該斷言驗證。
- [x] 3.4 依「Leave playback surfaces outside the management password gate」與「Preserve playback-safe runtime reads under hardened management boundaries」，斷言密碼閘開啟時，已配對 display client 的 runtime API 與 socket 連線、以及 playback-safe 的 bootstrap 讀取，行為與密碼閘關閉時完全相同。新增一個涵蓋這三者的 server 測試作為驗證。

## 4. 管理認證端點

- [x] 4.1 依「Expose management password gate operations over an API」，實作 `GET /api/management-auth/state` 回傳 `{ enabled, authenticated, lockedUntil }`，在無 session 時仍可呼叫，且回應不含雜湊、salt、session token 或失敗次數。在 `apps/server/src/routes/management-auth.test.ts` 寫出含「回應不含任何機密欄位」斷言的失敗測試後實作至通過。
- [x] 4.2 實作 `POST /api/management-auth/unlock` 與 `POST /api/management-auth/lock`：解鎖成功時設定 HttpOnly、SameSite 嚴格且有到期時間的管理 session cookie；密碼錯誤回傳認證失敗；冷卻期間回傳鎖定狀態與 `lockedUntil`；lock 時失效當前 session 並清除 cookie。以路由測試涵蓋這四條路徑驗證。
- [x] 4.3 實作 `PUT /api/management-auth/password` 的開啟、關閉與變更密碼：由已解鎖 session 變更密碼須提供正確 `currentPassword`；`enabled` 為 `true` 時須同時提供 `newPassword`，否則拒絕且不改變既有設定；持有 `MANAGEMENT_ACCESS_TOKEN` 者可不提供 `currentPassword` 直接重設或關閉；三種成功情形皆失效全部既有 session。以路由測試涵蓋這五條路徑驗證。
- [x] 4.4 於 `apps/server/src/app.ts` 註冊 management-auth 路由並接上密碼與 session 服務，確認四個端點在實際 app 實例上可被呼叫。以一條啟動後打 `GET /api/management-auth/state` 得到 200 的整合測試驗證。

## 5. 驗證與交付

- [x] 5.1 執行 `pnpm verify` 並確認全數通過；若有失敗，修正後重跑至通過並保留實際輸出作為佐證。
- [x] 5.2 以實際啟動的 app 對四個端點走一次完整路徑作為交付佐證：以 `PUT /api/management-auth/password` 開啟密碼閘並設定密碼、確認管理 API 隨即被拒、以 `POST /api/management-auth/unlock` 取得 session 後恢復存取、連續錯誤密碼觸發鎖定、變更密碼確認既有 session 失效、以 `MANAGEMENT_ACCESS_TOKEN` 關閉密碼閘；全程確認五個播放展示頁與 display client runtime 不受影響。保留實際回應作為佐證。
- [x] 5.3 確認本 change 落地後系統預設行為不變：密碼閘預設關閉，且 repo 內沒有任何管理端介面可以開啟它。以 `grep -rn "management-auth" apps/web/src` 無結果作為驗證。
