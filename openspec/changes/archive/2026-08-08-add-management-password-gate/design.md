## Context

`apps/server/src/plugins/managementAuth.ts` 的 `classifyManagementRequest` 依序判斷 header access token、loopback 來源、設定的信任來源與同主機來源，任一成立即回傳 `trusted: true`。因為部署機上的瀏覽器必然是同主機來源，現場任何能操作那台機器的人都能進入全部管理頁並執行變更，不需要任何憑證。

`MANAGEMENT_ACCESS_TOKEN` 是既有的管理員機密，可經由 header 或 socket auth 直接取得信任。它適合腳本與維運用途，但不適合作為現場操作者每次進入管理頁的憑證。

既有的資料表以 SQL migration 管理，最新一支是 `033_freshness_policy.sql`。既有的裝置憑證服務 `deviceCredentialService` 以 `createHash("sha256")` 雜湊 32 bytes 的隨機 token — 這對高熵隨機值是合適的，但對使用者自選密碼過弱，本設計不沿用。

管理頁與播放頁使用不同的 shell：`ManagementShell` 負責管理路由，`LayoutShell` 負責播放路由。因此密碼閘的前端部分可以只掛在管理殼層，不影響播放；本 change 只交付 server 端，前端由 `add-management-unlock-surface` 承接。

## Goals / Non-Goals

**Goals:**

- 密碼閘開啟時，未通過密碼者無法取得任何管理 API 的資料，而不只是看不到畫面。
- 密碼閘可經由 API 開啟與關閉，關閉時系統行為與現況完全相同。
- 忘記密碼時，持有 `MANAGEMENT_ACCESS_TOKEN` 者可自行復原，不需要改資料庫。
- 本 change 落地後系統行為不變：密碼閘預設關閉且無介面可開啟，屬休眠能力。
- 播放端與 display client 的行為完全不受影響。
- 暴力猜測密碼在 server 端被限制。

**Non-Goals:**

- 不引入多使用者、帳號或角色模型。
- 不引入任何新的第三方套件。
- 不改變既有的來源信任判定，也不改動 `MANAGEMENT_ACCESS_TOKEN` 既有行為。
- 不加入外部通道的密碼復原流程。
- 不交付任何管理端畫面。
- 不觸碰 display client 配對機制與 site scope 解析。

## Decisions

### 密碼閘作為既有來源信任之上的第二道條件

管理存取判定改為兩段：先維持既有的來源信任判定，通過後在密碼閘開啟時再要求有效的管理 session。兩者皆須成立才放行。

這樣既有的跨來源防護一行都不用改，密碼閘關閉時的行為與現況逐位元相同，回歸風險最小。反過來若用密碼 session 取代來源判定，會讓遠端不可信來源只要知道密碼就能進入，等於放寬既有邊界。

`MANAGEMENT_ACCESS_TOKEN` 維持既有的直通行為：帶有正確 token 的請求視為已通過密碼閘，這正是復原路徑得以成立的基礎。

替代方案：以密碼 session 取代來源信任判定。否決原因是放寬了既有的跨來源邊界。

### 以 scrypt 加隨機 salt 保存密碼

密碼以 `node:crypto` 的 `scrypt` 搭配每組密碼獨立的隨機 salt 導出雜湊，比對使用 `timingSafeEqual`。salt 與雜湊參數與雜湊值一同保存，使日後調整成本參數時舊密碼仍可驗證。

不沿用 `deviceCredentialService` 的 sha256：那裡的輸入是 32 bytes 隨機 token，暴力搜尋不可行；使用者自選密碼熵低，必須用刻意慢的 KDF。

替代方案：沿用 sha256。否決原因是對低熵輸入不具抗暴力能力。

### 管理 session 以 HttpOnly cookie 攜帶不透明 token

通過密碼後產生 32 bytes 隨機 token，其雜湊存於 server，原值以 HttpOnly、SameSite 嚴格的 cookie 回給瀏覽器，並帶有明確到期時間。每次管理請求以 cookie 中的 token 反查未過期的 session。

沿用與 `deviceCredentialService` 相同的形狀（server 存雜湊、client 持有原值、cookie 為 HttpOnly），與 repo 既有作法一致。token 為高熵隨機值，此處以 sha256 雜湊即足夠。

替代方案：以簽章的無狀態 token 承載。否決原因是無法在關閉密碼閘或變更密碼時即時失效既有 session。

### 變更密碼或關閉密碼閘時失效全部既有 session

變更密碼、關閉密碼閘、以管理 token 復原這三種操作，都必須刪除全部既有管理 session。否則舊 session 會在密碼已變更後仍然有效。

### 失敗嘗試在 server 端計數並暫時鎖定

密碼驗證失敗的次數與最後一次失敗時間記錄於 server。連續失敗達到門檻後，在冷卻時間內一律拒絕解鎖請求，即使密碼正確。成功解鎖後計數歸零。

計數必須在 server 端，前端計數可被直接呼叫 API 繞過。

## Implementation Contract

**Behavior**

- 密碼閘關閉時（預設），管理頁與管理 API 的行為與本次變更前完全相同。
- 密碼閘開啟且無有效管理 session 時，管理 API 回傳既有的管理存取拒絕外殼，且不回傳任何管理資料。
- 連續輸入錯誤密碼達門檻後，於冷卻時間內即使輸入正確密碼也一律被拒絕，並告知處於鎖定狀態。
- 變更密碼、關閉密碼閘或以管理 token 復原後，先前所有已解鎖的瀏覽器都需要重新解鎖。
- 帶有正確 `MANAGEMENT_ACCESS_TOKEN` header 的請求，在密碼閘開啟時仍可通過，並可重設密碼或關閉密碼閘。
- 五個播放展示頁、`/offline`，以及 display client 使用的 runtime API 與 socket 連線，行為完全不變。

**Interface / data shape**

- `GET /api/management-auth/state` → `{ enabled: boolean, authenticated: boolean, lockedUntil: string | null }`。此路由在無 session 時仍可呼叫，且**不得**回傳雜湊、salt、session token 或失敗次數。
- `POST /api/management-auth/unlock` 接受 `{ password: string }`；成功時設定 HttpOnly 管理 session cookie 並回傳 `{ authenticated: true }`；密碼錯誤回傳認證失敗；處於鎖定期間回傳鎖定狀態與 `lockedUntil`。
- `POST /api/management-auth/lock` 清除目前 session 與其 cookie，回傳 `{ authenticated: false }`。
- `PUT /api/management-auth/password` 接受 `{ enabled: boolean, newPassword?: string, currentPassword?: string }`。呼叫者必須是已解鎖的 session 或持有 `MANAGEMENT_ACCESS_TOKEN`；由已解鎖 session 變更密碼時必須提供正確的 `currentPassword`。將 `enabled` 設為 `true` 時必須同時提供 `newPassword`。
- 新資料表：一張單列的管理密碼設定表，欄位涵蓋啟用旗標、雜湊、salt、KDF 參數、連續失敗次數、鎖定截止時間與更新時間；一張管理 session 表，欄位涵蓋 token 雜湊、建立時間與到期時間。
- 管理存取判定的回傳結果新增一個欄位，表示本次請求是否已滿足密碼閘條件，使既有的來源判定結果與密碼閘結果可分別記錄與測試。

**Failure modes**

- 密碼閘開啟但管理 session 缺失、無法解析或已過期時，一律視為未通過，回傳既有的管理存取拒絕外殼，不區分三者以免透露 session 狀態。
- `PUT /api/management-auth/password` 在 `enabled` 為 `true` 卻未提供 `newPassword` 時拒絕並且不改變任何既有設定。
- 密碼驗證失敗與帳號鎖定的回應不得透露密碼是否接近正確，也不得回傳雜湊或 salt。
- 資料庫中不存在密碼設定列時，視為密碼閘關閉，管理端維持既有行為。

**Acceptance criteria**

- `managementPasswordService` 的單元測試涵蓋：相同密碼在不同 salt 下產生不同雜湊、正確密碼驗證通過、錯誤密碼驗證失敗、連續失敗達門檻後進入鎖定、鎖定期間即使正確密碼也被拒絕、成功後計數歸零。
- `managementSessionService` 的單元測試涵蓋：發放的 session 可被驗證、過期 session 驗證失敗、失效全部 session 後既有 token 立即無效。
- `management-auth` 路由測試涵蓋四個端點的成功與失敗路徑，並斷言回應中不含雜湊、salt 或 session token。
- `managementAuth` plugin 測試涵蓋：密碼閘關閉時判定結果與變更前一致；開啟且無 session 時被拒；開啟且有有效 session 時放行；開啟且帶正確 `MANAGEMENT_ACCESS_TOKEN` 時放行。
- 一條測試斷言 display client 使用的 runtime API 與 socket 連線在密碼閘開啟時仍然可用。
- `pnpm verify` 通過。

**Scope boundaries**

- 在範圍內：管理密碼的保存與驗證、管理 session 的發放與失效、管理存取判定的第二道條件、四個新端點、失敗鎖定、以管理 token 復原。
- 不在範圍內：任何管理端畫面（解鎖畫面、安全設定頁、前端請求憑證接線）、多使用者與角色模型、新第三方套件、既有來源信任判定的修改、`MANAGEMENT_ACCESS_TOKEN` 既有行為的修改、外部通道的密碼復原、display client 配對與 site scope、播放端任何行為。

## Risks / Trade-offs

- [密碼設定後遺失，導致管理端無法進入] → `MANAGEMENT_ACCESS_TOKEN` 可直接重設密碼或關閉密碼閘，該 token 已是既有的部署設定項；此復原路徑列為驗收項目之一。
- [管理存取判定是所有管理 API 的共用路徑，改動範圍廣] → 密碼閘設計為疊加條件而非取代，且預設關閉；plugin 測試明確斷言關閉時的判定結果與變更前一致。
- [誤把播放端一併擋住會讓展示機停擺] → 密碼閘只掛在管理殼層與管理存取判定上；驗收項目包含一條斷言 display client 的 runtime API 與 socket 在密碼閘開啟時仍可用。
- [scrypt 成本參數過高會讓解鎖明顯變慢，過低則削弱防護] → KDF 參數與雜湊一同保存，日後可調整而不使既有密碼失效；同時以失敗鎖定作為第二層防護，不單靠 KDF 成本。
- [同主機來源仍被視為可信，密碼閘關閉時洞依然存在] → 這是本次刻意保留的既有行為，密碼閘提供的是操作者可自行開啟的補強；是否開啟由使用者決定。

## Migration Plan

- 新增一支 SQL migration 建立管理密碼設定表與管理 session 表。密碼閘預設為關閉，既有部署升級後行為不變，不需要任何操作。
- 回退：停用密碼閘即可恢復既有行為，不需要回滾 migration；若需完整回滾，兩張新表與既有資料無外鍵相依，可安全移除。
