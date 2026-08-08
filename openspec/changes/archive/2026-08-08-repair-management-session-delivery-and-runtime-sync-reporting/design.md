## Context

`2026-08-08-add-management-password-gate`、`2026-08-08-add-management-unlock-surface` 與 `2026-08-08-relocate-display-runtime-sync-status-to-management` 都已歸檔，程式也在。Spec 軸 review 找出的三個問題是「做了但行為錯」，不是「沒做」：

- 管理存取信任判定同時承認 loopback、設定的 trusted origin 與 same-host origin。前兩者在瀏覽器眼裡可能是跨站，但 session cookie 一律 `SameSite=Strict`，而管理 CORS delegate 沒有開 `credentials`。跨來源的管理端因此永遠拿不到、也送不出 session cookie。
- `displayRuntimeSyncReporter` 只有一個 module-level 快照。五個 playback 頁在同一個 client 內輪播，後載入的頁會蓋掉前一頁的結果。
- `PUT /api/management-auth/password` 走的是與 unlock 相同的 `verifyManagementPassword`，會推進同一組失敗計數與鎖定，但把 `locked` / `lockedUntil` 丟掉，一律回 401。

## Goals / Non-Goals

**Goals:**

- 讓設定為可信的跨來源管理端在密碼閘開啟後仍能通過閘門，而不是永久鎖死。
- 讓 heartbeat 回報的 runtime sync 狀態指向真正出問題的那一頁，而不是最後載入的那一頁。
- 讓改密碼路徑的鎖定語意與 unlock 一致。

**Non-Goals:**

- 不改 `DisplayClientHeartbeat` 的欄位形狀，也不改 server 端 liveness registry 與 Device Status 的呈現。
- 不調整可信來源的判定條件，不放寬 site scope，不改 `MANAGEMENT_ACCESS_TOKEN` 的地位。
- 不支援「跨站 + 純 HTTP」。
- 不處理 Standards 軸的 findings。

## Decisions

### Session cookie 的 SameSite 由發放當下的請求來源決定

`SameSite=Strict` 對同主機管理端是正確且較安全的預設，不該為了少數跨來源情境全面放寬。因此 attribute 在發放 cookie 的當下依請求決定，而不是寫死或做成設定：

| 發放時的請求來源 | SameSite | 理由 |
|---|---|---|
| 沒有 `Origin` header | `Strict` | 同文件內的請求，維持既有最嚴格行為 |
| `Origin` 與請求 `Host` 同主機 | `Strict` | 同站，`Strict` 可用且較安全 |
| `Origin` 跨主機且連線為 HTTPS | `None; Secure` | 唯一能讓瀏覽器在跨站請求送出 cookie 的組合 |
| `Origin` 跨主機且連線不安全 | `Strict` + 警告 log | `None` 必須搭配 `Secure`，此組合無解；不靜默 |

「連線是否安全」取 Fastify 的 `request.protocol`，並接受反向代理的 `x-forwarded-proto`。跨主機但實際同站（例如共用註冊網域的兩個子網域）在 HTTPS 下會拿到比必要更寬鬆的 `None`，這是刻意接受的取捨：判斷真正的 site 需要 public suffix list，成本遠高於收益，而 `None; Secure` 在該情境仍然正確運作。

清除 cookie 時沿用同一組 attribute。瀏覽器以 name/path/domain 比對來覆寫 cookie，attribute 不一致會留下清不掉的殘留。

### 管理 CORS delegate 必須允許憑證

`SameSite` 只解決「瀏覽器要不要送」。跨來源的 `credentials: "include"` 請求還需要回應帶 `Access-Control-Allow-Credentials`，否則瀏覽器直接擋掉整個回應。delegate 只在 `isTrustedManagementCorsRequest` 已經放行的來源上開啟憑證，允許來源集合本身不變，因此不擴大攻擊面。

### runtime sync 結果以 page key 分別保存，回報時以 degraded 優先收斂

wire 形狀只有一組 runtime sync 欄位，硬要改成陣列會擴散到 shared 型別、server registry、Device Status view model 與畫面，超出本 change 的邊界。因此在 client 端保存 `Map<pageKey, entry>`，讀取時才收斂成單一組值，優先序為：

1. 有任何一頁是 `degraded` → 回報最近一次寫入的 degraded 那一頁
2. 否則有任何一頁是 `loading` → 回報最近一次寫入的 loading 那一頁
3. 否則有任何一頁是 `synced` → 回報最近一次寫入的 synced 那一頁
4. 都沒有 → 回報 `unknown` 與三個 null

`degraded` 優先是因為管理端要的是「有沒有壞」，不是「最後發生什麼」。某一頁後來成功會覆寫它自己那一筆，degraded 自然消失，不需要額外清理。輪播離開又回來的頁會重新載入並重寫該筆，因此殘留的 degraded 不會無限期釘住。

### loading 不沿用舊的錯誤訊息，但保留上一次成功的時間

spec 表格要求 `loading` 的錯誤訊息為 null。上一次成功的時間戳是既成事實，與當下狀態無關，因此在 `loading` 與 `degraded` 兩種狀態下都保留，這也正是表格中 `degraded` 那列要求的「上一次成功的時間或 null」。

### 改密碼與 unlock 共用鎖定，就要共用鎖定的回報形狀

`verifyManagementPassword` 已經回傳 `locked` 與 `lockedUntil`，改密碼路徑丟掉它們是純粹的資訊遺失。改為在鎖定時回 `429` 與 `lockedUntil`，與 unlock 相同；密碼單純錯誤仍回 `401`。持 `MANAGEMENT_ACCESS_TOKEN` 的復原路徑不驗 current password，因此完全不受鎖定影響，這一點維持不變。

## Implementation Contract

**Behavior**

- 密碼閘開啟後，設定於 `MANAGEMENT_TRUSTED_ORIGINS` 且以 HTTPS 服務的跨來源管理端，解鎖一次後續請求即可通過閘門。同主機管理端行為完全不變。
- 跨主機但連線不安全時，server 仍發 cookie，並以警告等級記錄該 origin 與「`SameSite=None` 需要 HTTPS」的事實。
- 一個 client 內任何一個 playback 頁 runtime 載入失敗，heartbeat 就回報 `degraded` 與該頁的 page key，即使之後輪播到其他頁並成功。
- 該頁後來自行重試成功後，heartbeat 不再回報那一頁的 `degraded`。
- 冷卻期間呼叫改密碼，得到 `429` 與 `lockedUntil`，而不是 `401`。

**Interface / data shape**

- `apps/server/src/plugins/managementAuth.ts` 匯出 `resolveManagementSessionCookieSameSite(request)`，回傳 `"Strict" | "None"`，並匯出 `buildManagementSessionCookie` 供發放與清除共用；`RequestLike` 增加選用的 `protocol`。
- 管理 CORS options delegate 的回傳值增加 `credentials: true`，其餘欄位不變。
- `apps/web/src/services/displayRuntimeSyncReporter.ts` 的 `writeDisplayRuntimeSyncSnapshot` 要求 update 帶 `runtimeSyncPageKey`；`readDisplayRuntimeSyncSnapshot` 回傳形狀不變，仍是 `runtimeSyncState`、`runtimeSyncPageKey`、`runtimeSyncResolvedAt`、`runtimeSyncError` 四個欄位。
- `PUT /api/management-auth/password` 在鎖定時回 `429` 與 `{ authenticated: false, locked: true, lockedUntil }`，與 unlock 的鎖定回應同形狀。

**Failure modes**

- 跨主機 + 不安全連線：不阻擋解鎖，不回錯誤，只留警告 log。刻意不讓它變成硬失敗，因為同站但跨主機的部署在 `Strict` 下仍可運作。
- `writeDisplayRuntimeSyncSnapshot` 收到沒有 page key 的 update：忽略該次寫入，不改變任何一筆。呼叫端已全部帶 page key，此路徑是防守用。
- 既有的管理存取拒絕外殼與 `401` 密碼錯誤形狀都不變。

**Acceptance criteria**

- `apps/server/src/plugins/managementAuth.test.ts` 覆蓋 `resolveManagementSessionCookieSameSite` 的四種來源組合。
- `apps/server/src/routes/management-auth.test.ts` 覆蓋：同主機解鎖得到 `SameSite=Strict`、HTTPS 跨主機解鎖得到 `SameSite=None; Secure`、改密碼在鎖定期間回 `429` 與 `lockedUntil`。
- `apps/web/src/services/displayRuntimeSyncReporter.test.ts` 覆蓋：一頁 degraded 另一頁後續 synced 仍回報 degraded 與該頁 page key、該頁自己成功後 degraded 消失、`loading` 的錯誤訊息為 null 且保留上一次成功時間。
- `pnpm verify` 全綠。

**Scope boundaries**

- 在範圍內：上述五個檔案與其測試。
- 不在範圍內：`packages/shared` 的 heartbeat 型別、server 端 liveness registry、Device Status 頁面、`useRuntimeRefreshLifecycle` 的重試邏輯、任何 playback 頁的視覺。

## Risks / Trade-offs

- 跨主機且同站的 HTTPS 部署會拿到比必要更寬鬆的 `SameSite=None`。以不引入 public suffix list 為代價換取的簡化，安全性影響限於 CSRF 面向，而管理 mutation 另有來源信任判定把關。
- `degraded` 優先序意味著一頁壞掉會蓋過其他四頁的正常狀態。這是刻意的：管理端此處要的是異常訊號，不是最新事件。
- CORS 開啟憑證後，被允許的來源清單就直接等於可攜帶 session 的來源清單。允許集合本身沒變，但設定 `MANAGEMENT_TRUSTED_ORIGINS` 的後果比先前更重，需在部署時謹慎。
