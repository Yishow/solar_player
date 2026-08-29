## Context

refactor-solar-mqtt-to-go 已交付行為對等的 Go CLI 服務（solar_mqtt_go/，13 套件測試全綠）。使用者需求：現場以「雙擊即用」的方式執行——單檔、無主控台視窗、常駐系統列、右鍵選單操作。現有服務主體（internal/{config,scraper,mqttbus,service,storage,...}）不改行為，僅加一層 tray 外殼。

## Goals / Non-Goals

**Goals:**

- tray 模式：進程內啟動 FactoryServiceManager + embedded web dashboard，系統列圖示常駐
- 右鍵選單：開啟網頁、暫停／恢復（核選）、開啟資料夾、離開
- Windows 無主控台單檔（-H windowsgui + CGO_ENABLED=0）；另產 console 單檔供診斷；log 重導向 solar.log
- 單一實例保護；CLI 子命令介面維持不變

**Non-Goals:**

- 通知氣泡、自動更新、開機自啟、多語系、圖示動畫
- web 儀表板功能修改（僅搬移內嵌）
- 不整合其他服務管理方式與 tray（兩者互斥使用）

## Decisions

### S1. systray 函式庫選 github.com/getlantern/systray

Windows 為純 Go syscall 實作（維持 CGO_ENABLED=0 建置）。替代方案 fyne.io/systray（fork，差異不大）與 energye/systray（API 較新但生態小）。選最多人用的 getlantern/systray。

### S2. 暫停／恢復 = Manager StopAll / 重建 StartAll

不新增 service 套件的 pause API——以「停止現有 manager（cancel + StopAll）→ 恢復時 NewManager + StartAll」實作，語意等同 Python restart 的停止路徑，MQTT 連線與 heartbeat 一併停止。恢復後重新連線 broker。選單核選狀態由 tray 層持有。

### S3. 網頁 = go:embed 儀表板 + 僅 loopback HTTP server

資產複製 solar_mqtt/web → solar_mqtt_go/internal/webui/web（index.html、js/app.js、styles.css、styles/、vendor/mqtt.min.js），internal/webui 以 //go:embed 包進 binary，http.ListenAndServe("127.0.0.1:port")。port 取 config key `web_port`（預設 18868，無則寫入預設）。js/app.js 以 window.location.hostname 連 MQTT over ws——tray 模式下從本機瀏覽器開啟即 127.0.0.1，行為正確。
不採 file:// 直接開檔：瀏覽器對 file:// 的 ws/資源路徑限制多且體驗差。

### S4. 交付形態：Windows tray 與 console 單檔

Windows 建置加 -ldflags "-H windowsgui"（build_dist.sh 產出 tray 版），並另產 console 版。tray 模式啟動時以 os.OpenFile 附加模式開啟 exe 目錄旁 solar.log 並 SetOutput/SetErr（僅 tray 模式做；CLI 子命令不動）。開瀏覽器使用 Windows `rundll32 url.dll,FileProtocolHandler`。

build_dist.sh 只產出 CGO_ENABLED=0 的 Windows tray/console 產物，不建立 macOS app、darwin CLI 或 Linux CLI。

### S5. 單一實例保護

Windows：CreateMutexW 檢查 ERROR_ALREADY_EXISTS（golang.org/x/sys/windows）；若 API 同時回傳有效 handle，先 CloseHandle 再回報已有實例。第二實例印出訊息後 os.Exit(0)。

### S6. MQTT 訂閱可見區塊使用單一 topic 來源

embedded dashboard 的 MQTT 訂閱區塊以 `factoryDataTopics(prefix, factoryId)` 作為唯一來源；訂閱、取消訂閱與畫面列舉都呼叫同一函式，不另外維護靜態 topic 陣列。畫面固定呈現 KN 與 CL 兩廠，並在連線尚未完成訂閱時顯示「尚未訂閱」，送出 subscribe 呼叫後顯示「已送出訂閱」。prefix 變更時先移除舊 prefix 的訂閱，再用新 prefix 重建兩廠 topic 列與訂閱狀態。

## Implementation Contract

- 進入點：Windows tray 子命令；Windows 無參數 → tray。console 版本仍接受既有 CLI 子命令。
- 選單項目與行為：開啟網頁（開 http://127.0.0.1:{web_port}/）、暫停擷取（核選切換；暫停=StopAll、恢復=重建 manager StartAll）、開啟資料夾（exe 目錄）、離開（StopAll + web server shutdown + systray.Quit，exit 0）。
- embedded server：僅 127.0.0.1、port 來自 config `web_port`（預設 18868）、go:embed 資產、tray 離開時 graceful shutdown。
- MQTT 訂閱可見區塊：HTML 提供 KN 與 CL 兩廠的 topic 列表與狀態欄；列表、`subscribeFactoryTopics`、`unsubscribeFactoryTopics` 都以 `factoryDataTopics(prefix, factoryId)` 產生資料，不得複製另一份靜態清單。未連線或尚未呼叫 subscribe 時為 `尚未訂閱`，完成送出 subscribe 呼叫後為 `已送出訂閱`；prefix 更新必須移除舊列並以新 prefix 重新產生。區塊不得渲染 broker username、password 或任何帳密值。
- 建置輸出：build_dist.sh 對 windows/amd64 加 -ldflags "-H windowsgui" 並只產出 tray/console；不產生 macOS app、darwin CLI 或 Linux CLI。
- 失敗模式：Windows build 未包含 tray support 時印錯誤並以 non-zero exit 結束，不回退為一般 run。webui 啟動失敗時同樣以 non-zero early return，不建立指向不存在 dashboard 的 tray；web port 被佔用時印警告並嘗試 port+1（最多 10 個）。
- 驗收準則：go build/vet/test 全綠（tray 邏輯以可測的純函式 + 介面隔離測試，systray 呼叫集中在不可測薄層）；embedded dashboard 的 HTML/JS/CSS 與 Go embed asset contract tests 驗證 KN/CL、prefix 更新、訂閱狀態及帳密不外露；build_dist.sh 只產出 Windows `_tray` 與 `_console`；Windows binary 無主控台（field witness 時驗證）；選單與網頁可手動驗證。
- 範圍邊界：僅動 solar_mqtt_go/（新增 internal/tray、internal/webui、web/、assets/、build_dist.sh；修改 main.go、commands.go）；移除 macOS app、darwin CLI、Linux CLI 的 dist 支援；不動 solar_mqtt/、apps/*、其他 change 檔案。

## Risks / Trade-offs

- [getlantern/systray 需要主執行緒訊息迴圈（Windows）] → systray.Run 自己管理訊息迴圈；服務跑在 goroutine，不阻塞。
- [web 儀表板 over ws:// 在 http://127.0.0.1 下可運作，但使用者從其他機器開啟會連不到 MQTT ws] → server 僅 loopback，屬預期使用方式；README 註明。
- [windowsgui 模式下雙擊後無任何回饋（圖示在系統列）] → tray.ico 使用高對比太陽圖示；log 檔提供診斷。
- [-H windowsgui 與 CLI 子命令並存：使用者從 cmd 執行子命令看不到輸出] → 文件與安裝指引註明 CLI 請用無 windowsgui 的主控台版本（build_dist.sh 同時產出 console 版 exe），兩個 exe 檔名明確區分（後綴 _tray / _console）。
