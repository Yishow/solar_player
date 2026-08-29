## Why

目前 Solar collector 的 `/config` request/response 共用 topic，且 response 會把完整 factory config（包含登入資訊）發布成 retained MQTT message；兩廠改為共用中央 broker 後，這會把不該廣播的 secret 留在 broker state，也讓 command 與 state channel 語意混淆。安全 contract 應獨立於語言重構處理，避免「Go 行為等價 port」把既有風險原封不動永久化；但使用者已確認此 Windows 工具與 `192.168.31.62` broker 只由單一操作者在可信任內網使用，因此不再把專用 broker identity、ACL、TLS 或 WinRM cutover 當成產品必要條件。

## What Changes

- **BREAKING**：將 collector control command 與 config state 分離，標準 topic 改為 `solar/{SITE}/cmd/get-config`、`solar/{SITE}/cmd/set`、`solar/{SITE}/state/config` 與非 retained `solar/{SITE}/state/control-result`；不再使用同一 `/config` topic 同時充當 request 與 response。
- `state/config` payload 必須是 sanitized operational state，禁止包含 login password、broker password、token、cookie 或其他 credential；retained payload 尤其不得含 secret。
- `cmd/set` 僅接受白名單可遠端修改欄位；credential 類欄位預設不得透過廣播 MQTT command 修改，除非未來另有受驗證、受授權的 secret-management capability。
- command payload 必須拒絕未知/型別錯誤欄位並透過帶 request id 的 bounded `state/control-result` 回報可診斷結果，不得把未知欄位寫入持久設定。
- 保留 MQTT 遠端 `get-config` 與 allowlisted `set`；`restart=true` 是穩定不支援的 action，回傳 `RESTART_UNSUPPORTED`，並與其他 changes 一起原子拒絕，不退出程序、不觸發重啟。
- 單一操作者可信任內網部署允許沿用現有匿名／明文 Mosquitto，不要求專用 management/collector identity、ACL、TLS、WinRM 管理或 credential rotation；這是使用者接受的部署取捨，不削弱 collector 端的 sanitized state、allowlist、atomic validation、TTL/idempotency、legacy-topic rejection 與 `RESTART_UNSUPPORTED`。
- `status`、`heartbeat`、`alert` 與 Solar data topics 保持既有資料語意；本 change 只切開 control/config contract，不任意重命名整棵 topic tree。
- 提供 migration/compatibility 策略，使 operator 可以辨識 legacy `/config`、`/set` 是否仍被使用；cutover 必須主動清除 broker 中既有 legacy retained `/config` payload，legacy response 不得以任何相容理由繼續 retained secret。
- 本 change 定義 collector MQTT security contract，不負責 Python→Go port。使用者另行完成的 Go collector 在套用此 change 時必須遵守相同 externally observable contract；Player app 只需更新與 control diagnostics 有關的 consumer，不接管 collector implementation。

## Capabilities

### New Capabilities

- `solar-collector-control-topic-security`: 定義 collector command/state topic separation、sanitized retained config、remote mutation allowlist、validation 與 migration security contract。

### Modified Capabilities

- `pc-server-deployment`: 中央 Mosquitto 部署/操作文件改為描述單一操作者可信任 LAN 的最小 broker contract；帳密、ACL 與 TLS 只保留為選配 hardening，不再是啟動、驗收或 rollback 的必要條件。

## Impact

- Affected collector contract: `solar_mqtt/solar/mqtt_bus.py`, `solar_mqtt/solar/service.py` 僅作為 legacy behavior/reference；實際 implementation target 是使用者另行落地後的 active Go collector，本 change 不負責 Go port，也不以修改 Python collector 取代它。
- Affected broker/operator integrations: 任何仍 publish `solar/{SITE}/config` 或 `solar/{SITE}/set` 的管理工具需遷移至新 command topics。
- Affected Solar Player: 僅若管理 diagnostics/control UI 消費 collector config/set topic，需改用新 contract；Solar generation data ingest 不受影響。
- Security impact: retained broker state 不得再保存 collector/site credentials；Windows-only Go collector 不依賴 NSSM 或其他隱含 supervisor。可信任 LAN 上任何可連到 broker 的 client 仍可能發布 allowlisted command，此風險由單一操作者接受。
- Dependency: 可獨立規劃；實際 rollout 應與使用者的 Go collector migration 協調，但不把 Go port 納入本 change tasks。
