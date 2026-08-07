## Context

`apps/server/src/plugins/deviceContext.ts` 的 `requireDisplayClientContext` 前置處理，在讀不到 `solar_device_credential` cookie 或無法解析出 Display Client Context 時，丟出 `DisplayClientContextServiceError` 並以 401 回應。該錯誤帶有一個明確的分類碼，取值為 `credential_expired`、`credential_revoked`、`device_disabled`、`device_unpaired`、`group_disabled`、`group_missing`、`profile_missing`、`site_scope_mismatch` 八者之一。

這個前置處理掛在四條 display 路由上：`display-story`、`display-readiness`、`playback`、`sustainability-story`。其餘路由不經過它。

管理端的展示機可見性目前只有 heartbeat 一條來源：`SocketService` 的 handshake 對 `playback-safe` 連線要求相同的 Device Context，失敗即不進入 liveness registry。`GET /api/device/status` 在 `data.displayClients` 帶出 `app.socketService.getDisplayClientLivenessSnapshot()` 的結果。

因此「因身分驗證失敗而看不見」這一整類情形，heartbeat 在定義上無法涵蓋。而 server 在 HTTP 層已經逐次知道這件事，只是沒有出口。

## Goals / Non-Goals

**Goals:**

- 讓「有展示機正在被身分驗證擋下」成為管理端可見的狀態。
- 沿用既有的 `GET /api/device/status` 出口與既有的管理端存取邊界。
- 聚合的記憶體占用有明確上界，不隨存取次數成長。
- 不記錄任何可指向個人或特定機器的網路識別資料。

**Non-Goals:**

- 不改變 `deviceContextPlugin` 既有的 401 行為、錯誤碼或回應格式。
- 不保留逐筆存取記錄，不新增資料表，不做任何持久化。
- 不改變 `displayClients` 既有的資料結構與語意。
- 不改變 Device 配對機制與憑證生命週期。
- 不在展示頁上顯示任何未配對提示。
- 不讓未配對 client 進入 display client liveness registry。

## Decisions

### 以錯誤碼為鍵的定量聚合，不保留逐筆記錄

聚合器對八個 Display Client Context 錯誤碼各維持一個計數，另外維持全域的首次發生時間、最近一次發生時間，以及最近一次被拒絕的路由。鍵集合固定為八個，因此記憶體占用有明確上界，不隨存取次數成長。

不保留逐筆記錄有兩個理由：逐筆記錄會隨被擋下的 client 重試而無界成長，而重試正是這個情境的常態；且逐筆記錄若要有辨識價值就得帶上網路識別資料，那是本設計刻意避開的。

替代方案：保留最近 N 筆的環形緩衝。否決原因是即使有界，其價值仍取決於是否記錄來源識別；不記錄來源時，N 筆記錄提供的資訊與計數加時間戳幾乎相同。

### 記錄點放在 Device Context 前置處理的失敗分支

聚合在 `requireDisplayClientContext` 捕捉到 `DisplayClientContextServiceError` 時記錄一次，與既有的 401 回應同一個分支。這樣所有掛上該前置處理的 display 路由自動被涵蓋，日後新增 display 路由不需要額外接線。

記錄行為不得改變既有的回應：記錄失敗或聚合器不可用時，401 回應照常送出。

替代方案：在每條 display 路由各自記錄。否決原因是四處重複，且新增路由容易漏接。

### 從既有的 device status 出口帶出，不新增路由

未配對存取摘要放進 `GET /api/device/status` 的 `data`，與 `displayClients` 並列。該路由已受既有的管理端存取邊界保護，未受信任的請求本來就拿不到，不需要為新資料另建一套存取控制。

替代方案：新增獨立的診斷路由。否決原因是要重新套用一次存取邊界，且管理者需要同時看到「已配對清單」與「未配對嘗試」才能正確判讀，分成兩個出口反而不利。

### 零值明確呈現而非隱藏區塊

摘要中所有計數為零時，管理頁顯示「無未配對存取」，而不是隱藏該區塊。隱藏會讓「沒有問題」與「還沒載入」在畫面上無法區分，而這正是本 change 要消除的誤讀類型。

## Implementation Contract

**Behavior**

- 未配對的瀏覽器存取任一 display runtime 路由後，`GET /api/device/status` 回應中的未配對存取摘要，其對應錯誤碼的計數增加，最近發生時間更新為該次時間，最近被拒路由更新為該次路由。
- 同一次未配對存取不改變 `data.displayClients` 的任何內容與 summary 計數。
- 管理者在 `Device Status` 頁可讀到未配對存取的累計次數、最近一次發生時間與最近一次被拒路由。
- 所有計數為零時，`Device Status` 明確顯示無未配對存取，而非隱藏該區塊。
- 未受信任的請求呼叫 `GET /api/device/status` 時，仍被既有管理端存取邊界拒絕，回應中不含未配對存取摘要。
- 已配對 client 的存取不使任何計數增加。
- server 重新啟動後，所有計數歸零，時間戳與最近被拒路由回到未發生狀態。

**Interface / data shape**

- 新增未配對存取摘要型別，於 shared 匯出，欄位為：依 Display Client Context 錯誤碼分類的計數對應表、`firstSeenAt`（`string | null`）、`lastSeenAt`（`string | null`）、`lastDeniedRoute`（`string | null`）、`totalCount`（`number`）。
- 摘要中**不得**包含用戶端 IP、User-Agent、cookie 值或任何網路識別資料。
- `GET /api/device/status` 的 `data` 新增一個承載該摘要的欄位，與既有 `displayClients` 並列；既有欄位不變更、不重新命名。
- 聚合器匯出兩個操作：記錄一次失敗（接受錯誤碼與路由），以及讀取目前摘要。讀取回傳的是快照，呼叫端的修改不影響聚合器內部狀態。
- 未發生任何未配對存取時，摘要的 `totalCount` 為 `0`、三個時間與路由欄位為 `null`、八個錯誤碼計數皆為 `0`。

**Failure modes**

- 聚合器記錄失敗時，`requireDisplayClientContext` 仍照常回傳既有的 401 回應，不得因記錄而改變回應內容或拋出未捕捉例外。
- 錯誤碼不在八個已知值之內時，該次記錄計入總數與時間戳，但不建立新的計數鍵，使鍵集合維持有界。
- 被拒路由字串僅記錄請求的路徑部分，不含 query string，避免把 query 帶入的資料寫進管理端輸出。

**Acceptance criteria**

- `unpairedDisplayAccessRegistry` 的單元測試涵蓋：初始摘要為全零與三個 `null`；記錄一次後對應錯誤碼計數與總數各加一且時間戳更新；記錄未知錯誤碼時總數增加但鍵集合不增長；讀取回傳的快照被修改後不影響後續讀取。
- `deviceContext` 的 plugin 測試涵蓋：Device Context 解析失敗時記錄一次且 401 回應內容與變更前相同；聚合器拋出例外時 401 回應仍照常送出。
- `device` 路由測試涵蓋：未配對存取後摘要計數增加且 `displayClients` 不變；未受信任請求被拒且回應不含摘要。
- 一條測試斷言摘要序列化後不含 IP、User-Agent 或 cookie 相關欄位。
- `DeviceStatus` viewModel 測試涵蓋零值與非零值兩種摘要的呈現，包含零值時顯示無未配對存取。
- `pnpm verify` 通過。

**Scope boundaries**

- 在範圍內：未配對存取聚合器、`requireDisplayClientContext` 失敗分支的記錄接線、`GET /api/device/status` 回應擴充、shared 摘要型別、`Device Status` 呈現。
- 不在範圍內：`deviceContextPlugin` 既有的 401 行為與錯誤碼、逐筆記錄與持久化、資料表、Device 配對機制與憑證生命週期、`displayClients` 既有結構、展示頁的任何呈現、socket 身分驗證。

## Risks / Trade-offs

- [被擋下的 client 會持續重試，使計數快速增長並失去可讀性] → 摘要以累計次數加最近發生時間呈現，操作者關心的是「最近是否仍在發生」而非精確次數；計數為數值欄位，不影響記憶體上界。
- [不記錄來源識別，操作者無法直接判斷是哪一台機器] → 這是刻意的取捨。摘要的用途是讓「有機器被擋下」變成可見，接著操作者到 `Device Fleet` 對照未配對的 Device 清單處理；記錄網路識別資料的風險大於其診斷價值。
- [記錄動作落在每個失敗請求的路徑上] → 記錄為固定鍵的計數遞增與三個欄位賦值，無 I/O、無配置，成本與既有的 401 回應組裝相當。
- [重啟後計數歸零，可能讓操作者誤以為問題已解決] → 摘要包含首次發生時間，且被擋下的 client 會持續重試而立即重新累計；本 change 的目的是呈現當下狀態，不是稽核歷史。
