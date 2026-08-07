## Why

`add-management-password-gate` 交付的是 server 端能力：密碼保存與驗證、管理 session 的發放與失效、管理存取判定的第二道條件、失敗鎖定，以及四個管理認證端點。但它刻意不含任何管理端介面，因此密碼閘預設關閉且**沒有任何方法可以開啟它** — 那個 change 落地後是一個休眠能力，系統行為完全不變。

本 change 把那個能力啟用起來：提供操作者開啟、關閉與變更密碼的設定頁，以及密碼閘開啟後進入管理頁時的解鎖畫面。兩者到位後，使用者才真正得到「進入設定頁之前要輸入密碼」這件事。

## What Changes

- 新增 `/settings/security`（安全設定）管理頁，提供開啟／關閉密碼閘、設定與變更密碼。
- 管理殼層在密碼閘開啟且無有效 session 時，以解鎖畫面取代管理頁內容，網址保持不變，解鎖成功後直接顯示原本要去的管理頁。
- 解鎖畫面呈現密碼錯誤與鎖定中兩種狀態，鎖定中不可送出。
- 前端管理端請求攜帶 cookie 憑證，並在收到管理存取拒絕回應時使管理殼層回到解鎖畫面，而非顯示空白或錯誤頁。
- 安全設定頁在送出前擋下兩種無效輸入：開啟密碼閘卻未輸入新密碼、變更密碼卻未輸入目前密碼。

## Non-Goals

- 不改動 server 端的密碼保存、session 發放、存取判定或失敗鎖定；那些由 `add-management-password-gate` 交付且必須先落地。
- 不新增或修改任何管理認證端點；本 change 只消費既有的四個端點。
- 不在前端計數失敗次數或自行判斷鎖定；鎖定狀態一律以 server 回傳的值呈現，前端計數可被直接呼叫 API 繞過。
- 不引入多使用者、帳號或角色模型。
- 不改動播放端：五個展示頁、`/offline` 與 display client 完全不經過解鎖畫面。
- 已評估但不採用「導向獨立解鎖路由再跳回」：需要記住來源路徑、且解鎖路由本身必須被排除在守衛之外，容易產生重導迴圈。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `management-password-gate`: 新增管理端解鎖畫面與安全設定頁的行為要求，使 server 端已具備的密碼閘能力可被操作者開啟、關閉與使用。

## Impact

- Affected specs: `management-password-gate`
- Affected code:
  - New:
    - apps/web/src/pages/SecuritySettings/index.tsx
    - apps/web/src/pages/SecuritySettings/viewModel.ts
    - apps/web/src/pages/SecuritySettings/viewModel.test.ts
    - apps/web/src/components/ManagementUnlockScreen.tsx
    - apps/web/src/components/ManagementUnlockScreen.test.tsx
    - apps/web/src/hooks/useManagementPasswordGate.ts
    - apps/web/src/hooks/useManagementPasswordGate.test.ts
  - Modified:
    - apps/web/src/layouts/ManagementShell.tsx
    - apps/web/src/app/routeMeta.ts
    - apps/web/src/app/router.tsx
    - apps/web/src/services/api.ts
- Affected APIs: 無新增或修改；只消費 `add-management-password-gate` 提供的 `GET /api/management-auth/state`、`POST /api/management-auth/unlock`、`POST /api/management-auth/lock`、`PUT /api/management-auth/password`。
- Dependencies: 必須在 `add-management-password-gate` 落地後才能實作與驗證。
