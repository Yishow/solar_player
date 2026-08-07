## Context

`apps/server/src/realtime/SocketService.ts` 在 handshake middleware 中對 `playback-safe` session 呼叫 `authenticateSocket`。該函式對 `management-trusted` 直接回傳 null 放行，對 `playback-safe` 則要求 handshake cookie 中的 Device Credential 並解析出 Display Client Context；解析失敗即以 `next(new Error("Display client authentication failed"))` 終止整條連線。

同一個 service 以 `this.io.emit(...)` 對所有連線廣播八個事件：`server:time`、`liveMetrics:update`、`mqtt:status`、`circuitMetrics:update`、`circuit:settingsUpdated`、`playback:settingsUpdated`、`images:updated`、`display:sync`；另以 `emitManagementOnly` 將 `deviceStatus:update`、`system:error`、`system:recovered` 限制在 `management-trusted` room。

`server:time` 由 `createServerTimeSignal` 依 server 本機時鐘產生，內容為 `instanceId`、`sequence`、`epochMs`、`timeZone` 與廣播間隔，與裝置身分及 Site Scope 無關。`LiveMetricsSnapshot.metrics` 則是未分廠區的全部電表 key，包含 cl 與 kn 兩廠的即時讀值。

因為連線在 handshake 就被終止，未配對 client 收不到 `server:time`，web 端 `appTime` 的 `accepted` 永遠為 null，`getSnapshot()` 永遠回傳 `state: "waiting"`。

## Goals / Non-Goals

**Goals:**

- 未配對 client 能取得伺服器時間，使 App Time 脫離 `waiting`。
- socket 層的關卡精準度與 HTTP 層一致：只擋與裝置身分或 Site Scope 綁定的資料。
- 放行範圍以白名單表達，預設不送，使日後新增事件不會意外外洩。
- 已配對 client 與管理端 socket 行為完全不變。

**Non-Goals:**

- 不放寬任何與裝置身分或 Site Scope 綁定的事件。
- 不改動 HTTP 層的四個配對關卡。
- 不改動 Device 配對機制與憑證生命週期。
- 不把時間傳輸改到 MQTT。
- 不處理未配對時展示資料仍為 fallback 的呈現方式。

## Decisions

### 新增 unidentified 這一層 socket session 分級

既有分級只有 `playback-safe` 與 `management-trusted`，兩者都預設已通過各自的信任判定。本次新增 `unidentified`：`playback-safe` 但解析不到有效 Device Credential 的連線歸於此類，連線得以建立但不具備 Display Client Context。

以分級表達而非以布林旗標表達，是因為既有的 `classifySocketSession` 與管理事件 room 都以分級為軸；沿用同一個軸可讓白名單與 room 指派在同一處推理。

替代方案：維持兩級並額外掛一個 `authenticated` 布林。否決原因是同一個概念會有兩個真相來源，容易在新增事件時判斷錯誤。

### 以已識別連線的 room 表達廣播對象，而非排除未識別連線

已識別連線（`playback-safe` 具備有效 Device Credential，以及 `management-trusted`）在連線建立時加入一個共用 room。所有與裝置身分或 Site Scope 綁定的事件改為對該 room 廣播，`unidentified` 連線因為不在 room 中而收不到。

用「加入才收得到」而非「排除特定連線」，是因為前者在新增事件時的預設是不送。後者的預設是送，任何一個漏改的 emit 都會外洩。

同時移除既有的 `playback-safe` room 加入。該 room 目前沒有任何 emit 對象，留著它會讓「room 歸屬 = 收得到什麼」這條推理多出一個無意義的分支。已識別的 `playback-safe` 連線改由共用的 identified room 表達，管理專屬事件仍由 `management-trusted` room 表達。

room 投遞是唯一路徑，因此 `SocketServerLike.to` 為必填。原本 `emitManagementOnly` 在 `to` 不存在時退回全連線廣播，那條 fallback 會讓管理專屬事件送給所有連線，與「加入才收得到」的預設互相矛盾；`to` 必填後兩個 room 投遞方法都不需要防護分支。

### 廣播一律經由兩個具名輔助方法，並以原始碼層級測試守住

新增兩個私有方法：一個對全部連線廣播、一個只對已識別連線的 room 廣播。`SocketService` 內不再直接出現 `this.io.emit(`。新增一支測試讀取 `SocketService` 原始碼，斷言 `this.io.emit(` 只出現在全部連線廣播那一個方法內。

這條守衛是必要的：白名單的正確性取決於「所有 emit 都走對方法」，而這件事無法靠型別保證。repo 內既有 `displaySurfaceVisualGuardrails.test.ts` 以相同手法守住展示頁的匯入，作法一致。

### 白名單目前只含 server:time

`unidentified` 連線目前只收得到 `server:time`。`mqtt:status` 雖然看似無害，但它揭露 server 與 broker 的連線狀態與失敗原因，屬於維運資訊而非展示所需，本次不放行。

即時指標明確排除：`LiveMetricsSnapshot.metrics` 未分廠區，送給未配對 client 等同外洩兩個廠的即時電力資料；`circuitMetrics:update` 同理。

日後要放行更多事件，是在白名單加一項並補一條 spec scenario 的決定，不是實作細節。

### 未識別連線的 heartbeat 一律忽略

`unidentified` 連線送出的 `client:heartbeat` 直接丟棄，不建立也不更新 Device liveness registry。這維持 `identity-aware-display-client-liveness` 既有要求「無效或撤銷的憑證不得建立 Device registry entry」— 該要求原本由「連線被拒」間接滿足，現在必須顯式滿足。

## Implementation Contract

**Behavior**

- 未配對的瀏覽器開啟展示頁時，socket 連線建立成功，於連線當下收到一次 `server:time`，其後每 30 秒收到一次；header 在數秒內顯示實際伺服器時間與已同步狀態。
- 未配對連線收不到 `liveMetrics:update`、`mqtt:status`、`circuitMetrics:update`、`circuit:settingsUpdated`、`playback:settingsUpdated`、`images:updated`、`display:sync`，也收不到任何管理專屬事件。
- 未配對連線送出的 `client:heartbeat` 不會使該 client 出現在 `GET /api/device/status` 的 `displayClients` 中，也不改變既有任何 client 的 liveness 狀態。
- 已配對 client 收到的事件集合與本次變更前完全相同。
- `management-trusted` session 的分級判定與管理專屬事件的送達對象完全不變。
- 未配對連線在取得有效 Device Credential 後重新連線時，被分類為 `playback-safe` 並取得完整事件集合。

**Interface / data shape**

- `ManagementSocketSessionClass` 之外新增一個表示連線識別狀態的分級 `unidentified`，與既有兩個分級並存於 shared 型別中。
- handshake middleware 對 `playback-safe` 且憑證解析失敗的情形，不再以錯誤終止連線，而是放行並將該連線標記為 `unidentified`。
- `SocketService` 新增兩個私有廣播方法：一個對全部連線、一個只對已識別連線的共用 room。`emitManagementOnly` 的送達對象不變，但移除其 `to` 不存在時的全連線 fallback。
- 已識別連線在 connection handler 中加入共用 room；`unidentified` 連線不加入任何 room。既有的 `playback-safe` room 加入一併移除。
- `SocketServerLike.to` 由選填改為必填。

**Failure modes**

- Device Credential 存在但已撤銷、已停用或對應 Device 不存在時，連線同樣被標記為 `unidentified`，不得取得已識別連線的事件；此情形與完全沒有憑證的處理一致。
- `unidentified` 連線送出任何需要 Display Client Context 的事件時，一律忽略且不拋出未捕捉的例外，連線維持存續。
- 憑證解析過程發生非預期錯誤時，連線標記為 `unidentified` 而非放行為已識別，即失敗方向必須是收得更少而非更多。

**Acceptance criteria**

- `SocketService` 測試涵蓋：無憑證的 `playback-safe` 連線建立成功且收到 `server:time`；同一連線收不到 `liveMetrics:update` 與 `display:sync`；有效憑證連線收到完整事件集合；撤銷的憑證被視為 `unidentified`。
- `SocketService` 測試涵蓋：`unidentified` 連線送出 `client:heartbeat` 後，liveness registry 不新增該 client。
- 新增 `socketBroadcastGuardrails.test.ts` 讀取 `SocketService` 原始碼，斷言 `this.io.emit(` 只出現在對全部連線廣播的那一個方法內。
- 以 Playwright 對未配對瀏覽器開啟 `/overview`，斷言 header 在 10 秒內不再顯示等待同步的字樣且顯示實際時間。
- `pnpm verify` 通過。

**Scope boundaries**

- 在範圍內：socket session 分級、handshake middleware 的放行與標記、廣播對象的 room 化、白名單、未識別連線的 heartbeat 忽略、原始碼層級守衛測試。
- 不在範圍內：HTTP 層的配對關卡、Device 配對機制與憑證生命週期、管理端 socket 分級與管理專屬事件、MQTT 傳輸、展示頁在未配對時的 fallback 呈現。

## Risks / Trade-offs

- [放行連線後，未配對 client 可長期佔用 socket 連線] → 這些 client 原本就能持續發起 HTTP 請求與重連嘗試，資源面差異不大；且未識別連線不進 liveness registry，不會污染管理端資料。
- [廣播對象改為 room，任何漏改的 emit 都會外洩給未識別連線] → 以原始碼層級守衛測試斷言 `this.io.emit(` 只存在於單一方法中，使漏改在測試階段就失敗。
- [新增分級會擴散到既有依 session 分級判斷的程式碼] → 新分級只在 socket 連線層使用，不進入 HTTP 的管理存取判定；驗收項目包含管理端分級與事件送達完全不變的斷言。
- [撤銷憑證的連線被降級而非中斷，可能與既有的撤銷即斷線預期不一致] → `identity-aware-display-client-liveness` 要求的是撤銷後不得建立 registry entry 且需斷開既有 Socket；本設計對「連線當下即無效」的情形降級為 `unidentified`，對「連線後才被撤銷」維持既有的斷線行為，兩者在 spec delta 中分別表述。
