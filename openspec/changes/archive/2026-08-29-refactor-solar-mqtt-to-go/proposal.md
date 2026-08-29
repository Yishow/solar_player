## Summary

將獨立的 EZ-Solar 發電量擷取服務（Python：solar_mqtt/）以 Go 語言 1:1 重寫為新的獨立模組 solar_mqtt_go/，行為、MQTT topics、設定檔格式、SQLite schema 與既有限制均以目前 Python 程式碼為唯一基準；Python 版在此 change 內不修改、不刪除，Go 版只支援 Windows 發行與執行。

## Motivation

- 部署面：Python 版需要安裝 Python runtime 與 pip 依賴（requests、beautifulsoup4、paho-mqtt）；Go 版產出 Windows 單一執行檔，便於工廠現場機器部署。
- 維運面：單一 binary 免環境設定，降低現場升級與 rollback 成本。
- 現有 Python 服務已穩定運作，重寫必須以行為對等為第一優先；即使現況包含已知限制或待修缺陷，也不在語言重寫時暗中修正。

## Proposed Solution

- 新增 Go module solar_mqtt_go/，以內部套件切分對應 Python 版模組：
  - config：solar_config.json 載入 / 原子儲存 / 型別強制 / 舊版單廠格式自動遷移 / /set 動態套用，格式與預設值與 Python 版相同。
  - scraper：EZ-Solar 登入（HTML form 解析 deftxt1/deftxt2/defbtn1）+ api/s_json.ashx 擷取（00_00 summary、00_02 zones）、穩定 zone id 對應。
  - mqttbus：單一 broker 連線、多廠 `cmd/set`、`cmd/get-config` 與 state 路由、現有 reconnect/update_prefix API 與 retain 旗標控制；不新增 Python 現況沒有的 /set → reconnect 或 /set → prefix 重訂接線。
  - service：每廠一個 goroutine worker，含廠區累積總量 guard（total_mwh 完整性檢查）、夜間暫停、狀態發佈、/set 處理。
  - storage：SQLite（與 Python 版相同 schema 與 DB 檔互通）。
  - anomaly：白天零功率 window 偵測（start/fire/recover）。
  - heartbeat：週期心跳 goroutine。
  - discovery：Home Assistant MQTT discovery 相同 payload。
  - schedule：NOAA 簡化日出日落演算法直接移植。
  - mosquitto：subprocess 啟動本機 broker、port probe。
  - display：終端輸出（中文寬度對齊）。
- Windows 啟動：保留 tray GUI 與 console 執行模式，不提供服務管理器安裝器。
- CLI 子命令與 Python scrape_solar.py 的資料面行為對等：run（預設）/ once / test-login / test-mqtt / dump-api / history / alerts，含 --once 舊版相容；once 只抓取、寫 SQLite 與輸出結果，不連 MQTT、不發 topic。
- 依賴選型：eclipse/paho.mqtt.golang（MQTT）、modernc.org/sqlite（純 Go SQLite，免 cgo）、golang.org/x/net/html（HTML form 解析）、標準庫 net/http + cookiejar；發行目標只包含 Windows。
- Go 測試對應 Python 版三個測試的行為重點：config 路徑與原樣 coercion/migration、MQTT retain 與現有 control routing、scraper/zone 對應；web 靜態資產測試不適用於 Go 版。MQTT topic/payload 對照以 run 的第一個成功 worker round 為準，不使用不發 MQTT 的 once。

## Alternatives Considered

- 保留 Python 僅打包（pyinstaller）：體積與啟動速度仍劣於 Go，且不解決 runtime 依賴管理，不採。
- 使用 cgo SQLite（mattn/go-sqlite3）：需 cgo 工具鏈，Windows 交叉編譯麻煩，改用 modernc.org/sqlite 純 Go 實作。
- NSSM 或 Go 原生 Windows service：本產品不提供服務管理器安裝功能，列為非目標。

- apply 中途經使用者確認，控制平面採用平行 change（harden-solar-collector-control-contract）的硬化契約：cmd/{set,get-config} 信封 + requestId 冪等帳本 + state/config 與 state/control-result 分流 + SOLAR_MQTT_* env 憑證（資料平面維持 Python 對等）。保留 MQTT 遠端 `get-config` 與 allowlisted `set`；`restart=true` 固定回傳 `RESTART_UNSUPPORTED`，原子拒絕且不退出、不重啟。

## Impact

- Affected specs: 新增 ez-solar-go-scraper capability（Python 版行為此前無 spec，本次一併以 spec 固化 Go 版契約）。
- Affected code:
  - New: solar_mqtt_go/（go.mod、cmd 主程式、internal 各套件、對應 Go 測試；只產出 Windows tray/console）
  - Modified: 無（solar_mqtt/ Python 版完全不動）
  - Removed: `internal/winsvc`、`install-service` CLI、NSSM `.bat` 產生器與 Linux/macOS 發行物。
- 不影響主 app（apps/server、apps/web、packages/shared）與五個 playback 頁；solar_mqtt/web/ 靜態頁沿用不搬移。
- 不提供、不維護 Linux 或 macOS 發行物；也不提供 NSSM、install-service 或 Windows service 安裝腳本。
- 不修正 Python 現有 `/config` request/state 共用 topic、`mqtt_prefix` 變更後 live subscription 不重訂、`mqtt_host`/`mqtt_port` 變更後 live connection 不重連等控制契約問題；這些改善須由獨立 change 處理。Go 版保留硬化的 MQTT 遠端 `get-config` 與 allowlisted `set`，但 `restart=true` 固定不支援。
