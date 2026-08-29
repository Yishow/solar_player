## Context

solar_mqtt/ 是一座以 Python 撰寫的獨立 EZ-Solar 擷取服務（非主 app 的一部分）：每 N 秒登入各廠 EZ-Solar 網頁、抓發電 API、發佈 MQTT、寫 SQLite、支援 HA discovery、夜間暫停、異常偵測與心跳。部署目標是工廠 Windows 機器與 mosquitto 本機 broker。使用者要求以 Go 重寫到 solar_mqtt_go/，Python 版保留不動、Go 版只支援 Windows 發行與執行。
apply 期間控制平面由平行 change（harden-solar-collector-control-contract）刻意硬化：控制契約偏離 Python 現況（信封化、冪等帳本、state 分流、env 憑證），資料平面維持 Python 對等。

Python 版模組與行為基準（重寫的唯一依據，非 spec 化部分以程式碼為準）：
- scrape_solar.py：CLI 進入點（run/once/test-login/test-mqtt/dump-api/history/alerts，--once 舊版相容）；Go 版不提供 install-service。
- solar/config.py：solar_config.json 載入/原子儲存/型別強制/舊版單廠遷移與 /set 套用；CONFIG 單例。
- solar/scraper.py：HTML form 登入 + 00_00/00_02 API、穩定 zone id。
- solar/mqtt_bus.py：單一 paho 連線、多廠 callback 路由、prefix 重訂。
- solar/service.py：每廠 thread worker、total_mwh 完整性 guard、/set 協調。
- solar/storage.py：SQLite 三表 schema。
- solar/anomaly.py、heartbeat.py、schedule.py、discovery.py、mosquitto.py、display.py。
- 測試：test_config_path.py、test_mqtt_retain.py、test_web_assets.py（後者屬 web 靜態資產，不適用 Go 版）。

## Goals / Non-Goals

**Goals:**

- 行為 1:1 對等：MQTT topics/payloads、config coercion 與路徑、SQLite schema 與相對路徑、CLI 介面與 exit semantics、演算法（zone id、NOAA、anomaly window），以及目前 Python 的控制流程限制全部一致；未明列的細節仍以 Python 程式碼為唯一依據。
- Windows tray 與 console 單一 binary，無 Python runtime 依賴。
- Go 慣用法：goroutine + context 取代 thread/Event，介面（Publisher）隔離 MQTT 以便測試。
- 既有 solar_config.json 與 solar.db 可逐檔複製後直接沿用，不做格式或 schema 轉換；切換時兩版不得同時寫同一檔案或同一 MQTT prefix。

**Non-Goals:**

- 不修改、不刪除 solar_mqtt/ Python 版任何檔案。
- 不做功能擴張、不做效能優化重構、不改 MQTT topic 命名或 payload 欄位。
- 不搬移 solar_mqtt/web/ 靜態頁（與語言無關，原樣沿用）。
- 不提供 NSSM、install-service、Windows service 安裝器或 Linux/macOS 發行物。
- 不觸及主 app（apps/server、apps/web、packages/shared）與五個 playback 頁。
- 不修正 Python 現有控制契約：`/config` request/state 共用同一 topic、`mqtt_prefix` 熱更新不呼叫 bus `update_prefix`、`mqtt_host`/`mqtt_port` 熱更新不呼叫 bus `reconnect`。Go 版須保留相同行為，改善另立 change。
- 不讓 `once` 發 MQTT；Python `cmd_once` 只抓取、記錄與輸出，Go 不擴張其副作用。

## Decisions

### D1. MQTT client 選 eclipse/paho.mqtt.golang

與 Python paho-mqtt 同家族、API 成熟（AutoReconnect、Subscribe 多 topic、ResumeSubs）。替代方案 mqtt-client-go 較新但生態小。QoS 1、CleanSession true 對齊 Python 行為；on_connect 後只依 bus 當下持有的 prefix 重訂全廠 topic，對齊 Python `_on_connect`。`ConnectWithOptions` 必須在呼叫 paho `Connect()` 前 attach live client 與當下連線選項，因 paho 可在 `Connect()` 返回前觸發 `OnConnect`；initial connect 與 explicit/auto reconnect 均由 callback 依當下 prefix 重訂 command topics，且每次 callback 僅產生一組訂閱。

> Superseded Python-parity note: the former `/config` request/response and retained `{prefix}/{factory}/config` behavior, including the old no-separation/no-echo wording, is historical only and is superseded by D9. The current contract uses only `{prefix}/{factory}/cmd/get-config`, `{prefix}/{factory}/cmd/set`, `{prefix}/{factory}/state/config`, and `{prefix}/{factory}/state/control-result`; `restart=true` returns `RESTART_UNSUPPORTED` atomically without exit or relaunch.

### D2. SQLite 選 modernc.org/sqlite（純 Go、免 cgo）

Windows 交叉編譯不需要 cgo 工具鏈，CGO_ENABLED=0 即可產出靜態 binary。替代方案 mattn/go-sqlite3 需 cgo，部署鏈複雜，不採。database/sql + 單一 *sql.DB（MaxOpenConns=1）即天然序列化寫入，對應 Python threading.Lock。

### D3. HTML form 解析選 golang.org/x/net/html

對應 BeautifulSoup：找第一個 form、收集 input name/value、替換 deftxt1/deftxt2/defbtn1。標準庫沒有 HTML parser，此為官方延伸庫。

### D4. 並發模型：goroutine + context.Context 取代 thread + threading.Event

- FactoryServiceManager：每廠一個 goroutine，stop 以共同 context.CancelFunc 實作（對應 stop_event.set()）。
- Heartbeat：獨立 goroutine；stop 可即時喚醒，update_settings 以 mutex/atomic 保護但不喚醒目前 interval wait，新 prefix/interval 從下一輪 heartbeat 生效，對齊 Python。
- 即時喚醒等待（Python stop_event.wait(seconds)）以 select { <-ctx.Done(), <-time.After(wait) } 實作。
- MqttBus callback 依 Python `_on_message` 路由到已註冊的 factory handler；不因 `/set` 額外呼叫 `update_prefix` 或 `reconnect`。MqttBus 自身的 explicit `reconnect` API 仍以 goroutine 實作，僅在呼叫者明確呼叫時生效，對應 Python 公開方法與目前零 caller 的現況。

### D5. 全域 CONFIG 單例改為顯式傳遞 + sync.RWMutex

Python 以 module-level CONFIG 單例跨模組共享；Go 版以 internal/config.Config 結構 + RWMutex 保護，由 worker/bus 持有同一實例指標。避免 data race（Python GIL 掩蓋的問題在 Go 必須明確處理）。共享 Config 的 atomic save 另以 save mutex 序列化整個 snapshot/write/replace transaction，確保多 factory command 不會競爭固定 `.tmp` 或以 stale snapshot 覆寫較新的設定；每個 remote set 再以共享 transaction lock 包住 before→apply→save→rollback，避免某廠 failure rollback 覆蓋另一廠已接受的變更。

跨 SQLite ledger 與 JSON 檔案無法使用單一 transaction，因此 remote set 採 staged-save tradeoff：先在 save mutex 保護下寫入 `.tmp`，ledger accepted record durability 成功後才 rename；ledger write failure 只 discard `.tmp` 並 rollback memory，絕不需要以第二次 Save 修復 live file。若 rename 失敗（live 尚未提交），memory rollback 並以同一 request id best-effort replace ledger 為 `PERSISTENCE_FAILED`，同時發布穩定 rejected result；replace failure 會保留原 ledger record 作為不可避免的跨儲存邊界 residual，並由錯誤結果暴露，不假稱兩者具絕對 atomicity。若 rename 已成功但 pending cleanup 失敗，則視為已提交：保留 memory/live/accepted ledger/result 一致，記錄 cleanup warning 並取消 manager；重啟時 accepted pending 與相同 live snapshot 僅做 cleanup，cleanup 失敗仍阻止啟動。

為覆蓋 accepted ledger durable 但程序在 config rename 前中斷的 crash window，pending snapshot 使用同目錄、0600、request-scoped 的檔名與 request/factory metadata。FactoryServiceManager 啟動 control subscription 前先查詢所有 pending：ledger disabled/closed/unavailable/query error 一律保留檔案並回傳 recovery error，不註冊 control；只有成功查詢且確定 missing/rejected 才清除。accepted snapshot 若已等於 live config 只清除 pending，否則依 pending 建立順序完成 atomic rename，再清除 pending；任何 commit/cleanup error 都 fail closed，`StartAll` 回傳 error。多 pending 在同一 save lock 下依序處理，未完成項目不會被後續 worker 接收，避免舊 snapshot 覆蓋新 accepted mutation。

Unknown global broker/control/TLS credential keys 使用窄的 exact-name scrub list；site scraper 的 `login_pass`/`login_user` 屬 factory schema，不因 unknown-global scrub 被刪除。

### D6. 時間處理：本地時間 + ISO 秒級格式

Python datetime.now().isoformat(timespec="seconds") 對應 time.Now().Format("2006-01-02T15:04:05")。NOAA 演算法以純數學直接移植（tz offset 預設 8.0），不引入天文库。

### D7. 模組切分、CLI 與執行期路徑

solar_mqtt_go/ 配置：
- go.mod（module solar_mqtt_go）
- main.go：flag/subcommand 分派（手寫 switch，不引入 cobra——子命令數量少，標準庫夠用）
- internal/config、internal/scraper、internal/mqttbus、internal/service、internal/storage、internal/anomaly、internal/heartbeat、internal/discovery、internal/schedule、internal/mosquitto、internal/display

internal/ 對應 solar/ 一一映射，port 時逐檔對照行為而非重新設計。

Python `CONFIG_PATH` 固定指向 `solar_mqtt/solar_config.json`，不受 process CWD 影響。Windows 部署版以 `os.Executable()` 所在目錄的 `solar_config.json` 作為等價 runtime root；測試須從不同 CWD 啟動已建置 binary，證明仍讀取 binary 旁的 config。`sqlite_path`、debug login HTML 與其他 Python 原本直接交給檔案 API 的相對路徑不改語意，仍相對 process CWD；Windows 啟動器須把工作目錄設為 Go binary 目錄，使預設 `solar.db` 與 logs 落在該目錄。

`once` 與 legacy `--once` 僅執行 Python `cmd_once` 的副作用集合：逐廠抓取、SQLite record、終端 print_result；不建立 MqttBus、不發 MQTT、不啟動 heartbeat、discovery 或 mosquitto。

### D8. 測試策略：單元測試對準行為契約

- config：載入/遷移/強制/儲存 round-trip（對應 test_config_path.py），含不同 CWD 與 Python boolean coercion 的精確 truth table：字串只有 `1/true/yes/on` 為 true，其餘字串均為 false且不警告；非字串使用 Python `bool(value)` 等價語意；數字轉換失敗才沿用既有值並警告。
- mqttbus / retain：以 Publisher/Bus fake 驗證 retain 旗標、`cmd/set`/`cmd/get-config` 與 `state/config`/`state/control-result` 路由、explicit `update_prefix`/`reconnect` API，以及 service `cmd/set` 不自動呼叫這兩個 API 的現況（對應 test_mqtt_retain.py 與 Python call graph）；舊 `/set`/`/config` 路由僅屬歷史 reference，已由 D9 取代。
- scraper：zone id 穩定性、today_hours 計算、form 欄位組裝（httptest fake server）。
- anomaly：window 狀態機（start/fire/recover/reset）與 `_is_zero` truth table。
- schedule：已知日期日出日落 sanity check。
- storage：in-memory 或 temp file 驗證 schema 與 INSERT OR REPLACE。
- service：total_mwh guard（缺 zone/非有限值）。
- 自動測試不對 legacy `/config` same-topic echo 跑真 broker；該 request/response contract 已由 D9 command/state split supersede。topic/payload parity 以 fake Publisher 做全量斷言，交付時另以本機 broker 對 run 的第一個成功 data round 做有界人工 capture，且只驗證 current cmd/state contract。

### D9. 控制契約硬化：信封 + 冪等帳本 + state 分流

cmd/{get-config,set} 統一 ControlHandler；指令需信封（requestId ≤128、issuedAt、ttlSeconds 1..300、site 校驗、changes/restart），±30 秒時鐘容差。結果先寫 processed_command 帳本（24 小時 purge、不含原始 payload）再發佈——重複 requestId 回 DUPLICATE_REQUEST 不重做副作用。manager lifecycle 啟動受 context 控制的 periodic purge ticker，定期刪除超過 24 小時紀錄，停止時等待 ticker goroutine 結束。get-config 回應分流：state/config（retained 摘要 + revision）與 state/control-result（非 retained）。遠端設定白名單僅 10 個 runtime 鍵（interval、night_pause、night_padding_min、anomaly_daytime_zero_minutes、heartbeat_interval、mqtt_retain_* 五鍵）；credentials/base_url/mqtt_host/mqtt_port/mqtt_prefix 一律拒絕。`restart=true` 回傳穩定 `RESTART_UNSUPPORTED`，與其他 changes 一起原子拒絕，不退出、不重啟、也不依賴 supervisor；ledger 僅依一般 command result 規則處理。替代方案（維持 Python 無信封 /set）已被 harden-solar-collector-control-contract 否決。

### D10. Broker 憑證走環境變數、fail closed

SOLAR_MQTT_USERNAME/PASSWORD 必填、SOLAR_MQTT_TLS_CA_FILE/SERVER_NAME 選配；非 loopback 強制 verified TLS、InsecureSkipVerify 拒絕。憑證不進 solar_config.json、MQTT state 或 log。替代方案（config 內帳密）因憑證外洩面被否決。

## Implementation Contract

- 進入點：solar_mqtt_go/main.go，Windows build 產出 tray/console binary；子命令 run/once/test-login/test-mqtt/dump-api/history/alerts 與 --once，未帶參數預設 run，輸出與 exit code 逐 command 對齊 Python。once/--once 不連 MQTT、不發 topic；不得存在 install-service 或 NSSM CLI。
- 設定介面：已建置 binary 讀寫 executable 目錄旁的 solar_config.json（與 Python 版同一格式、預設值與 coercion；不受 CWD 影響）。載入時未知 global 與 factory keys 保留；儲存為同目錄的 tmp + replace 原子替換。`sqlite_path` 若為相對路徑則保留 Python 的 process-CWD 語意，不改成相對 config。
- MQTT 契約：資料 topic 樹 {prefix}/{factory}/(summary|total_power_kw|today_mwh|month_mwh|total_mwh|zone/{id}(/metric)?|status|heartbeat|alert)；控制訂閱 {prefix}/{factory}/cmd/(set|get-config) QoS 1（單一 ControlHandler；D9 信封驗證 + processed_command 冪等帳本）；回應分流 state/config（retained 摘要）與 state/control-result（非 retained）；`restart=true` 固定回傳 `RESTART_UNSUPPORTED`，並原子拒絕其他 changes，不退出、不重啟；broker 憑證來自 SOLAR_MQTT_* 環境變數並 fail closed（D10）；payload JSON 欄位名稱與 Python 版完全一致（含 total_mwh 缺漏時整鍵省略、zone payload 的 factory/timestamp 欄位）；retain 依 mqtt_retain_* 設定。
- MQTT control 現況（superseded legacy note）：舊版收到 `/config` 後在相同 retained `/config` topic 回發設定、`/set` 直接套用完整 config 的行為僅供歷史 parity 追溯，不是目前契約，已由 D9 command/state split 取代。Current contract only subscribes to `{prefix}/{factory}/cmd/get-config` and `{prefix}/{factory}/cmd/set`, publishes sanitized retained `{prefix}/{factory}/state/config` and non-retained `{prefix}/{factory}/state/control-result`, and returns `RESTART_UNSUPPORTED` atomically for `restart=true` without process exit or relaunch.
- 失敗模式：抓取失敗印出原因、發 error status、清 session 下輪重登；SQLite 開啟失敗降級為無備援繼續跑；MQTT 連線失敗 run 啟動即終止（exit 1）。
- 驗收準則：gofmt 無差異、go vet ./...、go test ./... 與 go test -race ./... 全綠；Windows/amd64 的 tray 與 console build 成功，且輸出目錄沒有 Linux/macOS 或 NSSM 安裝物。CLI once 以同一 config/HTTP fixture 比較終端與 SQLite，並證明 broker capture 為零；MQTT 對照改用 run 的第一個成功 worker data round，比對 topic 集合與移除 timestamp 後的 payload。history 對複製自 Python 的同一 solar.db 可交叉讀寫。Windows 啟動、停止與 log 路徑須留 field witness，但不再驗收 NSSM service。
- 範圍邊界：僅新增與調整 solar_mqtt_go/ 的 Windows-only collector 及本 change artifacts；不動 solar_mqtt/、web/、主 app、部署腳本或 broker production ACL。

## Risks / Trade-offs

- [登入流程 HTML 結構假設差異（x/net/html 與 BeautifulSoup 行為細節）] → scraper 測試用真實登入頁結構的 fixture HTML；上線前以 test-login 對真機驗證。
- [modernc.org/sqlite 效能低於 cgo 版] → 本服務每輪僅數十筆寫入，遠低於效能門檻；可接受。
- [NOAA 移植數值誤差] → 與 Python 版同一公式逐行對照，測試固定日期比對兩版輸出（±0 容許，因同一演算法）。
- [並發語意差異造成 race] → 全域狀態收斂到 Config RWMutex 與 bus mutex；shared Config save 以 save mutex 序列化 snapshot/write/replace；go test -race 必跑。
- [兩版平行共存期 config/db 檔互相覆寫] → Go 版預設路徑在 solar_mqtt_go/ 下獨立；同時跑兩版指向同一檔案屬操作錯誤，於 README 註明。
- [`/config` request/state 同 topic 可能自我回授] → 這是 Python 現況且使用者已決定忠實移植；design/spec/task 明列，不以語言重寫暗修。驗收不得對真 broker 發 `/config` request；另由控制契約 hardening change 處理。
- [hot-update 後 data prefix 與 command subscription/broker connection 不一致] → 保留 Python 現況並以單元測試鎖定；operator 變更 mqtt_prefix/mqtt_host/mqtt_port 後須重啟服務。
- [binary 目錄與 CWD 混淆造成讀錯 config 或新建 DB] → config 固定 executable 目錄，relative sqlite_path 保留 CWD 語意，Windows 啟動器固定 binary 工作目錄；不同 CWD 測試與 Windows witness 都必跑。

## Migration Plan

1. 停止既有 EzSolarScraper Python 啟動流程，備份原 solar_config.json、solar.db 與既有啟動設定；不得讓兩版同時使用同一 MQTT prefix 或資料檔。
2. 將 Go binary、原 solar_config.json 與需要延續的 solar.db 複製到同一部署目錄；不轉換 JSON 或 SQLite schema。
3. 先執行 history 與 once 做 schema/單輪相容性驗證，再以有界 run capture 驗證第一輪 MQTT data topics；不要發 `/config` request。
4. 以既有 Windows 啟動方式執行 Go tray/console binary，工作目錄設為 binary 目錄；在 Windows 上留下啟動、停止與 log 路徑 witness，不假設 NSSM 或其他服務管理器。
5. Rollback 時停止 Go process，使用步驟 1 備份還原 Python 啟動方式；若 Go 曾寫入 DB，Python 可直接讀取相同 schema，但 rollback 前仍先保存副本。

## Open Questions

- MQTT 遠端 `get-config` 與 allowlisted `set` 已保留；`restart=true` 已定義為穩定 `RESTART_UNSUPPORTED` 原子拒絕，不再有未決產品選擇。
