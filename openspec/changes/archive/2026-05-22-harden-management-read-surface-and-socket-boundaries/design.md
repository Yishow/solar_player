## Context

目前 server 只在 `managementAuth` 中保護 HTTP mutation，讀取型管理資料仍大多直接從既有管理路由暴露。前端同時存在兩種 caller：一種是正式播放 runtime，需要品牌、MQTT 連線狀態、播放同步事件與 live metrics；另一種是 management/operator surface，需要完整設定、診斷、display ops、device logs 與安全診斷動作。這兩者目前共用多個 API 與 socket 事件來源，導致一旦把管理讀取面收緊，就會連帶打斷播放頁既有 bootstrap 流程。

## Goals / Non-Goals

**Goals:**

- 將 HTTP read surface 明確分成 playback-safe 與 management-only 兩類。
- 讓 management-only 讀取路由與安全診斷動作遵循與 mutation 同等的 trusted-origin / access-token boundary。
- 讓 Socket.IO 連線可以區分 playback session 與 management session，避免管理診斷事件對所有連線廣播。
- 保持 playback runtime 所需的品牌、MQTT 狀態、live metrics 與播放同步事件可正常工作。

**Non-Goals:**

- 不導入完整帳號系統、RBAC 或使用者資料庫。
- 不調整 display page readiness、rotation、asset health 的演算法本身。
- 不重做 `Device Status`、`Brand Assets` 或其他管理頁視覺 layout。
- 不在此 change 內處理 optimistic concurrency；那屬於另一個 follow-up change。

## Decisions

### Decision: Split public runtime reads from management reads

沿用現有路由會讓 playback shell 持續依賴 `/api/settings/mqtt`、`/api/brand/profiles` 之類的管理端資料來源，之後任何讀取 boundary 都會互相牽連。這個 change SHALL 新增 playback-safe runtime read surface，例如 active brand、MQTT connection status、以及其他正式播放仍需讀取的最小資料；既有 management read routes 則保留完整 payload，但改受 trusted boundary 保護。

替代方案是保留單一路由並在未授權時回傳裁切 payload。這會讓同一路由同時承擔兩種 contract，前端也更難判斷是權限不足還是資料缺失，因此不採用。

### Decision: Reuse the existing trusted-origin and access-token model for read gating

既有 mutation boundary 已經以 trusted origin 與 `x-solar-management-token` 為判斷基礎。這個 change SHALL 延伸同一套判斷到 management-only read routes 與安全診斷動作，避免新增第二套 session/auth 邏輯。這能讓部署方維持單一設定來源，也能讓前端管理頁沿用既有 fetch 模式。

替代方案是為 read routes 建立完全獨立的 token 或 cookie session。這會增加部署與前端同步成本，且超出本次 scope。

### Decision: Gate sensitive Socket.IO channels by session class instead of shutting off socket bootstrap entirely

播放 runtime 仍需要 `liveMetrics:update`、`mqtt:status`、`playback:settingsUpdated` 與 `display:sync`。因此 socket 不應整體封鎖，而應在握手階段判定 session class，並只把 management-only 事件下發給受信任連線。management-only 事件至少包含 `system:error`、`system:recovered`、`deviceStatus:update`，以及任何後續只服務管理診斷的頻道。

替代方案是將所有 socket 事件都改成 management-only，再讓 playback 改成輪詢。這會破壞目前 runtime refresh contract，也不是最小變更。

### Decision: Device diagnostics routes return explicit denied envelopes instead of silent empty payloads

`Device Status`、log metadata、display diagnostics summary 在未授權時 SHOULD NOT 假裝資料不存在，否則 operator 很難判斷是設備無資料還是權限錯誤。此 change SHALL 定義一致的 denied envelope 或 403 error path，讓前端可以顯示 operator-facing access guidance。

替代方案是對未授權 caller 回傳空集合或 `null`。這會把 access failure 混成正常 empty state，因此不採用。

## Implementation Contract

- Behavior:
  - 正式播放 runtime 仍可讀取 active brand、MQTT 連線狀態、live metrics 與播放同步事件，不因 management hardening 而失效。
  - management-only HTTP read routes 在未受信任 origin、未帶有效 access token、且非 loopback caller 時，必須回傳明確 denied 結果。
  - management-only socket 事件不得在未授權 playback session 自動送出。
  - `Device Status` 在未授權時須顯示 access-denied 或 operator guidance，而不是把 denied 當成空白資料。
- Interface / data shape:
  - 新增 playback-safe runtime brand / mqtt status read contract，供 `AppHeader`、`useBrandAssets`、`useMqttStatus` 等播放端 hooks 使用。
  - `managementAuth` 共用判斷函式需能同時服務 mutation reads 與 socket handshake classification。
  - socket session metadata 需能標示至少 `playback` 與 `management` 兩種 class。
- Failure modes:
  - 未授權 management read 請求回傳既有安全錯誤 envelope 或明確 403 denied envelope。
  - 未授權 socket session 仍可建立 playback-safe 連線，但不得收到 management-only event。
  - public runtime read route 若上游資料不存在，仍維持既有 fallback/null semantics，不把 absence 誤判成 access denied。
- Acceptance criteria:
  - server route tests覆蓋 trusted / untrusted read paths 與 socket event visibility。
  - web tests覆蓋 playback hooks 改走 public-safe route 後仍可 hydration，且 `Device Status` 能識別 denied 狀態。
  - `spectra analyze`、`pnpm --filter @solar-display/server test`、`pnpm --filter @solar-display/web test` 通過。
- Scope boundaries:
  - In scope: management read gating、runtime/public route 分流、socket session gating、device diagnostics denied semantics。
  - Out of scope: full login flow、per-user identity、save conflict resolution、page-level visual redesign。

## Risks / Trade-offs

- [Risk] route split 後前端可能同時依賴新舊 brand / mqtt 來源，造成 contract 混用。 → Mitigation: 在 design 中明確指定 playback hooks 只改走 public-safe route，management pages 保留完整 route。
- [Risk] socket gating 若分錯事件等級，可能讓 playback refresh 失效。 → Mitigation: 先列出 playback-required events 白名單，再只對 management-only channels 做限制。
- [Risk] 現有測試大多聚焦 mutation boundary，read boundary 新增後 analyzer 與 test 會暴露未覆蓋角落。 → Mitigation: 對 device/log/display-ops/readiness/socket handshake 補 dedicated tests，而不是只靠整體 smoke。
