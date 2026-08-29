## 1. 資產準備

- [x] 1.1 建立 `solar_mqtt_go/internal/webui/web/`（index.html、js/*.js、styles*.css、vendor/mqtt.min.js）與 solar_mqtt_go/assets/tray.ico（32×32 太陽圖示，PNG-in-ICO）。行為：embedded `index.html` 引用的相對資產在副本內完整、ICO 檔頭合法可被 systray 載入。驗證：檔案清單比對來源、以 Go image 解碼 ICO 內嵌 PNG 成功（assets 測試 TestTrayIconDecodable）。

## 2. Embedded webui

- [x] 2.1 [P] 以 TDD 實作 internal/webui 滿足 Embedded local dashboard server，採 design「網頁 = go:embed 儀表板 + 僅 loopback HTTP server」：//go:embed web 資產、http server 僅綁 127.0.0.1、port 取 config web_port（預設 18868）、port 被佔用時 +1 重試最多 10 個、OpenBrowser 三平台命令分派（rundll32/open/xdg-open，以介面注入測試）。測試：TestServeIndex200、TestBindsLoopbackOnly、TestPortFallback、TestOpenBrowserCommand（先紅後綠）。
- [x] 2.2 以 TDD 建立 Embedded dashboard subscription visibility 的 Go embedded asset contract tests：驗證 embedded `index.html` 提供訂閱區塊與 KN/CL 容器、`app.js` 同時以 `factoryDataTopics(prefix, factoryId)` 供 render/subscribe/unsubscribe 使用、包含 `not-subscribed`／`subscription-sent` 狀態契約，且訂閱區塊不含帳密欄位或值。驗證：`TestEmbeddedDashboardSubscriptionContract`、`TestEmbeddedDashboardCredentialsNotRendered` 先紅後綠。
- [x] 2.3 實作 S6. MQTT 訂閱可見區塊使用單一 topic 來源：HTML/CSS 顯示 KN 與 CL 的實際 topic 列表；JS 由 `factoryDataTopics(prefix, factoryId)` 同時驅動畫面列舉、subscribe 與 unsubscribe，連線前／尚未送出時顯示 `not-subscribed`，送出後顯示 `subscription-sent`，prefix 變更時移除舊列並更新新 prefix，close/offline/error 連線異常時清除訂閱狀態，畫面不得呈現 broker username/password。驗證：Go asset contract tests 全綠、`node --check solar_mqtt_go/internal/webui/web/js/app.js`，並以 HTML/JS/CSS content review 確認 KN/CL 與狀態標記存在。

## 3. Tray 生命週期

- [x] 3.1 實作 internal/tray 滿足 Tray menu actions 與 Tray mode entry and single instance 的單一實例部分，採 design「systray 函式庫選 github.com/getlantern/systray」（呼叫集中薄層）與「暫停／恢復 = Manager StopAll / 重建 StartAll」：選單動作以介面（Opener、FolderOpener、ServiceController、Quitter）隔離，狀態機涵蓋暫停（核選）→ StopAll、恢復 → 重建 manager StartAll、離開 → service stop + web shutdown + systray.Quit 順序；systray API 呼叫集中在不可測薄層；單一實例保護（Windows 命名 mutex / 其他平台 flock）。測試：TestPauseResumeTogglesService、TestQuitStopsInOrder、TestSingleInstanceLock（fake 介面，先紅後綠）。
- [x] 3.2 實作 tray 模式 log 重導向滿足 Windowless single-file build with log redirection，採 design「無主控台：windowsgui 子系統 + log 檔」：僅 tray 模式將 stdout/stderr append 至 exe 目錄旁 solar.log，CLI 子命令不重導向。測試：TestLogFileRedirectOnlyInTray（暫存目錄寫入斷言）。

## 4. 接線與建置

- [x] 4.1 main.go 新增 tray 子命令並調整預設分派滿足 Tray mode entry and single instance：Windows 無參數 → tray（以 GOOS 判斷）、其他平台無參數維持 run、tray 於可判定支援的環境可用；build 未包含 tray support 或 Linux 同時缺少 DISPLAY/WAYLAND_DISPLAY 時 non-zero 且不 fallback。runTray 接線 config + 單一實例 + log 重導向 + FactoryServiceManager + webui + systray；webui 啟動失敗時 early return non-zero。驗證：runCLI table tests 更新（tray 子命令存在、Windows 判斷以注入 GOOS 函式測試），go test ./... 全綠。
- [x] 4.2 [Cross-platform build outputs and windowless tray delivery／交付形態：Windows 單檔與 macOS app bundle] 更新 build_dist.sh 滿足跨平台交付契約：保留 CGO_ENABLED=0 的 windows/amd64 `_tray`（-ldflags "-H windowsgui"）與 `_console`、linux/amd64、裸 darwin/arm64 CLI；在 macOS host 另以 CGO_ENABLED=1 產出 `EZ-Solar.app`，包含 `Contents/Info.plist`、可執行的 `Contents/MacOS/EZ-Solar`、`Contents/Resources/tray.ico`，且 Info.plist 設定 `LSUIElement` 與 `NSHighResolutionCapable`。app Finder 無參數進 tray，裸 macOS CLI 無參數仍 run。驗證：腳本執行後以 `file`／可執行檔檢查既有 CLI 與 Windows PE32 GUI 子系統，並檢查 macOS app bundle 三個成員。
> **Superseded acceptance note:** Task 4.2 is preserved as completed history, but its macOS/Linux outputs are superseded by the Windows-only decision and MUST NOT be treated as current acceptance. Completed task 4.4 defines the current build contract: only Windows `_tray` and `_console` outputs are accepted.
- [x] 4.3 交付驗證：gofmt/vet/go test -race 全綠；使用者確認 Windows 人工 acceptance 覆蓋雙擊無主控台且進系統列、開啟網頁、暫停/恢復、開啟資料夾、離開、單一實例及 exe 旁 `solar.log`；既有本機 rendered witness 覆蓋 embedded dashboard 的 KN/CL MQTT 訂閱列、prefix 更新與訂閱狀態。驗證輸出留存於 change 紀錄。
- [x] 4.4 Windows build outputs and windowless tray delivery；交付形態：Windows tray 與 console 單檔；移除非 Windows 交付契約：build_dist.sh 只建立 Windows `_tray` 與 `_console`，不建立 macOS app、darwin CLI 或 Linux CLI；刪除不再使用的 macOS bundle metadata、非 Windows build assertions 與文件引用。驗證：執行 build_dist.sh 後以 `find dist -maxdepth 2` 確認只有兩個 Windows 產物，並以 `rg 'macOS|darwin|Linux|EZ-Solar.app'` 檢查本 change 的未完成契約不再要求非 Windows 輸出。

> 目前 witness：Windows tray 使用者驗證 OK；非 Windows dist 與 menu bar witness 已取消，不列入本 change 的驗收。
