## Why

管理端目前的存取邊界只判斷「來源是否可信」：`managementAuth` 對 loopback、設定的信任來源，以及**同主機來源**一律判定為 trusted。實務上這代表任何人只要在部署 server 的那台機器上開瀏覽器，就能進入全部管理頁並修改播放設定、展示頁內容、MQTT 與迴路設定 — 不需要任何憑證。

現場機器放在可被他人接觸的位置，需要一道由操作者自行掌控、可開可關的密碼保護。這道保護必須由 server 端強制，未通過就拿不到管理 API 的資料，而不是只把畫面遮起來。

## What Changes

- 新增管理端密碼閘：可由管理頁開啟或關閉；開啟時，進入任何管理頁之前必須輸入密碼。
- 密碼以 Node 內建 `scrypt` 加隨機 salt 雜湊後存於 server，永不存明文、永不回傳給 client。既有 `deviceCredentialService` 的 sha256 作法只適用於高熵隨機 token，不沿用於使用者自選密碼。
- 通過密碼後由 server 發放一個 opaque 的管理 session，以 HttpOnly cookie 攜帶並有明確有效期；登出或逾期後必須重新輸入。
- **BREAKING**（行為層）：密碼閘開啟時，既有的管理存取邊界改為「來源可信**且**具備有效管理 session」才放行；只有來源可信不再足夠。密碼閘關閉時，行為與現況完全相同。
- 管理端 API 於密碼閘開啟且無有效 session 時，回傳既有的管理存取拒絕外殼，不另建新的錯誤格式。
- 本 change 只交付 server 端能力。密碼閘預設關閉，且沒有任何管理端介面可以開啟它，因此落地後系統行為完全不變，屬於休眠能力。啟用它的管理端解鎖畫面與安全設定頁由 `add-management-unlock-surface` 交付。
- 失敗嘗試以 server 端計數並在達到門檻後暫時鎖定，避免以暴力嘗試猜出密碼。
- 復原路徑：持有 `MANAGEMENT_ACCESS_TOKEN` 者可直接重設密碼或關閉密碼閘，不需要知道目前密碼。
- 播放端不受影響：五個展示頁、`/offline` 與所有 display client 使用的 runtime API 完全不經過此閘。

## Non-Goals

- 不引入多使用者、帳號或角色模型；本次只有單一組管理密碼。
- 不引入任何新的第三方套件；雜湊與比對使用 Node 內建 `node:crypto` 的 `scrypt` 與 `timingSafeEqual`。
- 不改變既有的來源信任判定（loopback、設定信任來源、同主機來源）；密碼閘是疊加的第二道條件，不取代第一道。
- 不改動 `MANAGEMENT_ACCESS_TOKEN` 既有的 header 與 socket auth 行為。
- 不為密碼加入電子郵件、簡訊或任何外部通道的復原流程。
- 不觸碰 display client 的配對機制與 site scope 解析。
- 不交付任何管理端畫面：解鎖畫面、安全設定頁與前端請求憑證接線皆屬於 `add-management-unlock-surface`。
- 已評估但不採用「只在前端擋畫面」的作法：管理 API 仍可被直接呼叫，該作法提供的是安全感而非安全性。

## Capabilities

### New Capabilities

- `management-password-gate`: 管理端的可開關密碼保護 — 密碼的保存與驗證、管理 session 的發放與失效、開啟時對管理 API 與管理頁的強制、暴力嘗試防護，以及以管理 token 進行的復原。

### Modified Capabilities

- `management-api-access-boundaries`: 管理存取邊界在密碼閘開啟時，額外要求有效的管理 session，僅來源可信不再足夠。
- `management-read-access-boundaries`: 管理端唯讀路由在密碼閘開啟時同樣要求有效的管理 session，且 playback-safe 的 runtime 讀取維持不受影響。

## Impact

- Affected specs: `management-password-gate`、`management-api-access-boundaries`、`management-read-access-boundaries`
- Affected code:
  - New:
    - apps/server/src/db/migrations/034_management_password_gate.sql
    - apps/server/src/services/managementPasswordService.ts
    - apps/server/src/services/managementPasswordService.test.ts
    - apps/server/src/services/managementSessionService.ts
    - apps/server/src/services/managementSessionService.test.ts
    - apps/server/src/routes/management-auth.ts
    - apps/server/src/routes/management-auth.test.ts
  - Modified:
    - apps/server/src/plugins/managementAuth.ts
    - apps/server/src/app.ts
- Affected APIs: 新增 `GET /api/management-auth/state`、`POST /api/management-auth/unlock`、`POST /api/management-auth/lock`、`PUT /api/management-auth/password`；既有管理 API 在密碼閘開啟時多一道 session 條件。
- Affected data: 新增單列的管理密碼設定與管理 session 兩張資料表。
