## Problem

目前正式 collector 已由 `solar_mqtt_go` 取代 Python 版；Python runtime 不在本 change 的修正範圍。Go `Config.Load()` 在設定檔不存在時會保留記憶體預設值，而 factory 欄位載入時也會把缺少欄位與 compatibility defaults 合併。若資料擷取入口直接使用這個結果，缺檔或不完整設定可能被誤當成可工作的 factory 設定。

## Proposed Solution

- 在任何 Solar HTTP 擷取或正式 MQTT data-plane 啟動前，直接驗證磁碟上的 `solar_config.json`，要求至少一個明確 factory，且 `factory_id`、`base_url`、`login_user`、`login_pass` 都由設定檔提供。
- 驗證 explicit persisted fields，不以 `Config` 合併後的 defaults 判斷 readiness，避免缺欄位被預設值補掉。
- `run`、`once`、`test-login`、`dump-api` 與 legacy `--once` 在設定未就緒時 fail closed 並回傳 non-zero。
- Windows tray / `tray` 命令仍可開本機 WebUI；設定未就緒時該 tray session 阻止 MQTT/data-plane，提示儲存完整設定後重新啟動。
- `test-mqtt`、`history`、`alerts` 保持可用，因為它們不需要 Solar factory 登入資料。

## Success Criteria

- 缺少、JSON 損壞、空 factories、factory 必填欄位缺漏、重複 factory_id 或不完整 base URL 時，Solar 擷取入口不會開始 HTTP/MQTT data-plane。
- 完整的現有多廠與 legacy 單廠設定維持可用。
- 驗證錯誤不得輸出 login password。
- tray 在 invalid config 下仍能進入本機設定介面，但不建立正式 MQTT data-plane；使用者得到「儲存後重新啟動」提示。

## Capabilities

### New Capabilities

- `solar-collector-runtime-readiness`：規範 Go collector 在啟動資料擷取前的 persisted config readiness 與 fail-closed 行為。

### Modified Capabilities

- （無）

## Impact

- Affected code：`solar_mqtt_go/main.go`、新增 runtime gate、`solar_mqtt_go/internal/config` readiness validator 與 tests。
- 不修改 Python collector；Python 已不是正式 runtime。
- 不移除既有 compatibility defaults；它們仍可供非 data-plane 相容用途使用，但不能代替磁碟上的必填 factory 設定。
