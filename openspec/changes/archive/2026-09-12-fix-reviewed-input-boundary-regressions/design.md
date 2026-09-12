## Context

本 change 承接固定基準 review 與使用者「請修」授權。原始 HTTP 已證明反斜線 path 可以改到 numeric prefix 資源；Go overlay 已證明非 canonical serial key 會靜默重新配號。既有兩處重複 helper 一併在相同責任內收斂。

## Goals / Non-Goals

Goals：修復兩個已重現缺陷、保留合法輸入行為、加入能先失敗再通過的回歸測試、完成 review 與工程驗證。
Non-Goals：不調整管理授權、MQTT topic、資料庫 schema、播放樣式、freshness、collector 多程序支援或自動修復既有壞 sidecar；不建立 Git commit、不部署。

## Decisions

### Route 與 params 驗證

兩個 management validator 使用 Fastify 已匹配的 routeOptions.url 判斷受保護路由，numeric resource 或 playlist entry 從 request.params 取得。避免重複解析與正規化 request.url，也不採只攔截反斜線的特例。covered numeric routes 沿用 canonical positive safe integer parser；reorder/static routes 與動態 ID 分開匹配。

### Canonical sidecar key

serial key 必須等於 serial: 加上非空且已 trim 的 serial，保留大小寫。position key 必須等於 position: 加正整數的十進位標準表示，拒絕前導零、正號、空白與 overflow。載入即拒絕非 canonical key，不替 operator 修寫檔案，不嘗試把碰撞合併。

### 共用 helper

Server 只共用 RecordLike、isRecord、isFiniteNumber、400／404 response helpers，domain 規則仍留原 validator。Go 在 zoneidentity package 提供共用 Prepare(config, storage) 初始化，沿用 Open、sidecar authority 優先、history bootstrap 與原 error wrapping；service 與 once 直接使用共用入口，移除純轉接 wrapper。

## Implementation Contract

- In scope：Circuit PUT／DELETE、Image PUT／DELETE、Brand profile PUT／DELETE／activate／logo 與 Display Ops asset references 的 strict numeric ID；既有 runtime validator 的路由／entry param 判斷；兩組重複 helper。
- Numeric malformed request：在讀取目標資源或 mutation 前回 400，常見錯誤 envelope 不變；DB、檔案、playlist 與 socket events 不變。有效但不存在資源維持 404，合法 update/reorder 保留原行為。
- Sidecar malformed key：Open 與 service／once 共用 Prepare 回 observable error，sidecar bytes 不變，不回傳可供 canonical publication 的 store。合法 serial:A 與 position:1 保留 numeric aliases。
- 共用 Prepare 維持 valid sidecar 不依賴 conflicting history、SQLite disabled 可運作、bootstrap historical floor 不變。
- Verification：raw HTTP 測試必須使用 Node http.request 送 literal backslash，確認原程式至少一例為 200 且 mutation，修正後各 covered route 400 且副作用不變；Go malformed key test 在修正前失敗，修正後通過。執行 focused server suites、Go 全套測試、go vet、最終 pnpm verify 與 Spectra validate。
- Coordinator 核對實際 diff、測試與 artifact 對齊後才標記完成；另核對 harden-runtime-input-boundaries 原 19 項契約與 final gate，再歸檔兩個已完成 change。
- Out of scope：上段 Non-Goals 及未涉入的 domain refactor。

## Risks / Trade-offs

- app.inject 會正規化 path 而掩蓋缺陷：使用真正 loopback HTTP 與隔離 temp DB。
- 不合法 sidecar 可能讓 collector 無法啟動：明確 error 且保留原檔，維持既有 fail-closed 契約。
- 共用初始化調整呼叫位置：以 authority、SQLite disabled、history floor 回歸覆蓋兩個正式入口。
- 歸檔工具可能修改 index 或注入 trace：歸檔前快照工作樹與 index，檢查並移除本次工具產生且不屬修正的內容，保留使用者既有狀態。
