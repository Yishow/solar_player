# 交付驗證紀錄（task 7.2）

日期：2026-08-29
驗證者：Kilo（zai-coding-plan/glm-5.3-flash）
工作目錄：solar_mqtt_go/

## 自動驗證（全數通過）

- gofmt -l . → 無輸出（無格式差異）
- go vet ./... → 乾淨
- go test ./... -timeout 180s → 13/13 套件全綠（main + 12 internal）
- go test -race ./... → 全綠
- CGO_ENABLED=0 交叉建置（歷史證據）：曾產出 Windows、Linux、darwin artifacts；這些非 Windows 產物不再屬於目前 release contract，後續驗證必須只保留 Windows tray/console。

## 兩版行為對照（fake EZ-Solar server，固定值）

fixture：/tmp/kilo/parity/fake_solar.py（port 18901，無 charset header）
設定：同一份內容（mqtt 127.0.0.1、sqlite 相對路徑、factory KN → fake server）
Python 版：副本 /tmp/kilo/parity/py（venv：requests、bs4、paho-mqtt）
Go 版：/tmp/kilo/parity/go（Windows binary + 同格式 solar_config.json；此紀錄的舊 fixture 路徑僅供追溯）

### once 對照

- 兩版 exit code 皆 0
- 終端輸出數值一致：3.2 kW / 1.10 MWh / 5.50 MWh；Zone1 2.0 kW、10.0 kWh、1.00 MWh、0.25h
- SQLite 值相等：
  - summary：('2026-08-29T03:53:30','KN',3.2,1.1,5.5) 兩版相同
  - zone：(…,1,'SN1',…,2.0,10.0,1.0,50.0,40.0,0.25) 兩版相同
- MQTT capture 為零：once 全程未建立 MQTT 連線（Python 版設計上亦未連線）

### history 交叉讀取

- Go binary history 讀 Python 寫入的 solar.db → 讀到同一列 ✓
- Python history 讀 Go 寫入的 solar.db → 讀到同一列 ✓

### run 第一個成功 worker data round 的 MQTT topic/payload 對照

broker：mosquitto 18840（每版乾淨啟動）；擷取：mosquitto_sub -v -t 'solar/#'
- topic 集合相等：14 / 14（summary、total_power_kw、today_mwh、month_mwh、
  total_mwh、zone/1 整包、zone/1 六個 metric、status、heartbeat、cmd 訂閱不佔 publish）
- payload 語意相等（過濾 timestamp；數值 50 == 50.0 視為相等）：12 個資料 topic 全數一致
- status/heartbeat 欄位結構一致（message/status/timestamp；boot/factory/ts）
- 已知 fixture 假象：zone name 於 Python 端顯示 latin-1 mojibake——fake server
  未宣告 charset 時 bs4 以 latin-1 解碼；底層 UTF-8 位元組相同，Go 解碼正確。
  真實設備頁面宣告 charset 後兩版解碼一致。

## 待人工 field witness（本機不得代替）

- Windows（無 Python runtime）：以 Windows tray/console binary 驗證啟動、停止與 log 路徑；不驗證 NSSM、install-service、AppDirectory、stdout/stderr 或服務自啟。
- 驗收後於本檔補上 Windows witness 路徑與結果。

## 中途拓撲變更紀錄

- apply 期間 mqttbus/service 被外部 session 重構為 cmd/{get-config|set} 單一
  ControlHandler 拓撲，經使用者確認採用；spec「MQTT command handling」與
  design Implementation Contract 已同步更新。
- 後續外部 session 疊加 control ledger 硬化（requestId 冪等、state/config、
  state/control-result、storage.CommandRecord、config.ApplyRemoteSet），對應
  parked change「harden-solar-collector-control-contract」。該方向與本 change
  spec 的差異（config state 改發 state/config 摘要而非原格式 retained config、
  result 發 state/control-result）待 spectra-ingest 一併收斂。

## Standards／Spec review 結果與修復（2026-08-29）

背景 review（獨立 subagent）發現並已修復：
- [Critical] anomaly callback 未接線（newFactoryService 傳 nil）→ 已改為
  s.anomaly = anomaly.New(..., s.onAlert)，白天零功率 WARN／恢復 INFO 恢復發佈。
- [Critical] internal/mosquitto data race（aliveLocked 讀 ProcessState 與
  reaper Wait() 寫入競爭）→ reaper 為唯一 ProcessState 觸碰者，結果寫入
  Runner.exited/exitCode（mu 保護）；go test -race 恢復全綠。
- [Warning] 舊版單廠遷移鍵殘留全域（Python raw.pop 對應缺漏）→ 補 delete(raw, k)。
- [Warning] run 迴圈缺每輪 print_result → runOnce 成功後呼叫 display.PrintResult。
- [Warning] scraper serial/name 型別混淆（數值 serial → 空）→ 新增 strField
  對應 Python str(x or "").strip()（falsy → 空字串）。
- [Suggestion 已採] heartbeat.Stop 補 done channel join（2 秒上限）；
  anomaly emit target 補 TrimSpace。
- 清理：移除 internal/service/debug_login_fail_KN.html 測試殘留物。

已知 spec-lag（control.go 為準，待 spectra-ingest 收斂）：
- 指令信封化（requestId/issuedAt/ttlSeconds/site/changes），無 requestId 的
  舊式 /set 靜默丟棄。
- config topic 移除：get-config 改發 state/config（retained 摘要）+
  state/control-result（非 retained）。
- 遠端設定白名單反向：credentials/base_url/mqtt_prefix/mqtt_host/mqtt_port
  被拒（Python 版可設）；保留遠端 get-config/allowlisted set，`restart=true`
  固定回傳 `RESTART_UNSUPPORTED`，原子拒絕、不退出且不觸發重啟。
- SQLite 增第四表 processed_command（additive、跨版相容）。
- broker 認證硬化：SOLAR_MQTT_USERNAME/PASSWORD（env）必填、非 loopback 強制
  TLS——與 Python 無認證行為不同，對照驗證時需在 env 提供憑證或以 loopback
  無 TLS 執行（仍需帳密）。

修復後複驗：gofmt 無差異、go vet 乾淨、go test ./... 與 go test -race ./...
16/16 套件全綠。

## Fresh witness（2026-08-29；本 session）

### Local automated gates

- `GOCACHE=/private/tmp/solar-go-cache go test ./... -count=1`：全套 16 個 package 綠。
- `GOCACHE=/private/tmp/solar-go-cache go test -race ./... -count=1`：全套 16 個 package 綠。
- `GOCACHE=/private/tmp/solar-go-cache go vet ./...`：乾淨。
- `git diff --check`：乾淨。
- `gofmt -l .`：唯一輸出 `internal/webui/webui_test.go`；該檔為並行 agent WIP，未在本 witness ownership 內，未擅自修改。因此 task 7.2 的 gofmt 子項未宣告完成。

### Windows release artifact witness

- 未執行會改寫 repo `dist/` 的 build script；依相同 build flags 在隔離目錄執行：
  - `CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags '-s -w -H windowsgui' -o /private/tmp/solar-mqtt-refactor-witness-dist/solar_mqtt_go_windows_amd64_tray.exe .`
  - `CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags '-s -w' -o /private/tmp/solar-mqtt-refactor-witness-dist/solar_mqtt_go_windows_amd64_console.exe .`
- `file` 結果：tray 為 `PE32+ executable (GUI) x86-64, for MS Windows`；console 為 `PE32+ executable (console) x86-64, for MS Windows`。
- output listing 僅 2 檔，檔名僅 Windows tray/console；`strings ... | rg -i 'nssm|install-service|darwin|linux|macos'` 無輸出。
- `ls -l`：兩檔各 13,599,232 bytes；`shasum -a 256`：console `57bd54e32a87f0e2909e6c36cf6d1998ca3b72dc69bf92ea2281e94ac9a8bf75`、tray `17d3974ec19f9f3104a5835693673f8ec3a6288941844c3b5834733507c15f62`。
- 已執行 `spectra task done --change refactor-solar-mqtt-to-go 20`；task 9.2 已標記完成。Mac 不可代替 Windows 啟停與 log witness。

### Python dependency and parity boundary

- 唯讀檢查 `solar_mqtt/solar_config.json` 僅輸出 key/type 摘要：2 factories、每廠欄位集合為 `base_url/factory_id/login_pass/login_user`；未輸出任何設定值。
- `solar_mqtt/solar.db` 不存在；未讀取或修改 Go DB，也未以 fake server 冒充 same-config parity。
- repo 沒有 requirements.txt；於 `/private/tmp/solar-mqtt-refactor-witness-venv` 建立隔離 Python 3.14.7 venv，安裝 `requests`、`beautifulsoup4`、`paho-mqtt` 成功。
- venv import smoke：`requests`、`bs4`、`paho.mqtt` 均 import 成功。
- 未執行 Python/Go same-config `once`：實際 config 含 EZ-Solar factory endpoint，可能觸發未授權 production login；需使用者提供明確授權、safe copied config/DB 與可控 endpoint 後，才可進行 parity witness。故 task 7.2 維持未完成。
- 未連線真 broker；Windows 啟動、停止、log path 仍需 Windows field witness，Mac 結果不替代。

### Authorized same-source parity attempt（2026-08-29；隔離 temp copies）

- 依授權將 `solar_mqtt/solar_config.json` 複製到 `/private/tmp/solar-mqtt-refactor-parity/py/solar_mqtt/solar_config.json` 與 `go/solar_config.json`；只在副本覆寫 sqlite path、loopback MQTT host/port/prefix，兩廠 endpoint/credential 保持同源，未輸出其值。
- Python：`/private/tmp/solar-mqtt-refactor-witness-venv/bin/python solar_mqtt/scrape_solar.py once`，exit 0；兩廠均 login HTTP timeout，沒有成功 fetch/data round。
- Go：以同一 source build 的 native test binary 執行 `./solar_mqtt_go_native once`，exit 0；兩廠均 login HTTP timeout，沒有成功 fetch/data round。Windows PE binary 僅作 artifact witness，Mac 無法執行。
- 兩次 `once` 皆未建立 MQTT connection；隔離 loopback TCP probe（127.0.0.1:18889）捕獲 `connections 0`。未發 control/config/set 或任何遠端 mutation。
- temp DB schema/count audit：Python DB tables `alert,summary,zone`，各 0 rows；Go DB tables `alert,processed_command,summary,zone`，各 0 rows。由於 source `solar_mqtt/solar.db` 不存在，沒有可供 same-source data parity 的既有 rows。
- history cross-read attempted against each other's empty temp DB：Python/Go 均 exit 0、均輸出無資料；這不構成有資料列的 cross-version parity 證據。
- 因兩廠 login 均失敗，未啟動 bounded run capture，也沒有第一個成功 worker round；summary/factory metrics/zone topic payload comparison 暫不宣告通過。
- Windows tray/console 啟停與 log path 仍需實際 Windows field witness；Mac build/PE 結果不替代。task 7.2 維持未完成，未執行 `spectra task done ... 15`。

### Coordinator connectivity diagnosis（2026-08-29；authorized read-only）

- 對兩廠 `base_url` 做不輸出 URL/credential 的唯讀 GET connectivity probe；兩者 DNS lookup 均在毫秒內完成，但 TCP connect 在 8 秒逾時，HTTP status 維持 `000`，尚未進入 TLS、HTTP response 或登入驗證階段。
- 強制 IPv4 與 IPv6 各重試一次，KN/CL 四條路徑都在 6 秒 TCP connect timeout；因此目前 blocker 是此執行環境到兩廠 endpoint 的網路路徑，不是 Python/Go scraper parity 差異。
- Repo 內由 parity 嘗試意外建立的 ignored `solar_mqtt/solar.db` 為 0 bytes、沒有資料列，已在確認 birth/mtime 屬於本次執行後清除；既有 ignored `solar_mqtt_go/solar.db` 未修改。
- `gofmt -l solar_mqtt_go` 目前無輸出；先前並行 WebUI test formatting blocker 已解除。Windows 使用者 acceptance 已覆蓋 tray 啟動、選單、單一實例與 `solar.log`，但 task 7.2 仍缺 console field witness以及成功資料 round 的 Python/Go terminal、SQLite、MQTT payload parity。
