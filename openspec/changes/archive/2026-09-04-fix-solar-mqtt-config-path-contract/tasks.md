## 1. 路徑契約回歸測試

- [x] 1.1 [P] 為「Configuration file compatibility」新增 command/tray red tests：CWD decoy 與 canonical config 同時存在時，`newConfig` 只載入 `configPathFor`/`DefaultConfigPath` 指向的值且 decoy 不變；以 `rtk go test ./...` 在 `solar_mqtt_go` 先確認測試因現況 CWD precedence 失敗。
- [x] 1.2 [P] 依「以 conflicting CWD fixture 驗證完整讀寫路徑」新增 WebUI red tests：default path 不受 CWD candidate 影響，explicit `Options.ConfigPath` 即使初始不存在仍保持 authoritative，local-config GET/PUT 不讀寫 decoy；以 `rtk go test ./internal/webui` 先確認測試因現況 resolver fallback 失敗。

## 2. Canonical config path 修正

- [x] 2.1 依「所有預設入口直接採用 executable-relative DefaultConfigPath」讓 command 與 tray 的 default `configPathFor` 無條件委派 `config.DefaultConfigPath()`，移除 CWD file probing，使 1.1 tests PASS 並以既有 `TestConfigPathIndependentOfCWD` 交叉驗證。
- [x] 2.2 依「明確提供的 ConfigPath 保持 authoritative」簡化 WebUI path resolution：空值採 `config.DefaultConfigPath()`、非空值原樣沿用，所有 read/write/scrape handlers 不再搜尋 CWD candidates；以 1.2 tests 與 `rtk go test ./internal/webui` 驗證。

## 3. 相容邊界與完整驗證

- [x] 3.1 依「relative sqlite_path 繼續由 process CWD 解讀」重跑 `TestRelativePathUsesProcessCWD` 並 review diff，確認未修改 storage rebase、config schema/coercion/migration、Python source、MQTT/security 或 deployment behavior；以 `rtk go test ./internal/storage -run TestRelativePathUsesProcessCWD` 驗證。
- [x] 3.2 執行 `rtk go test ./...`（`solar_mqtt_go`）、repo `rtk pnpm verify` 與 `rtk git diff --check`，確認 canonical config 的完整讀寫契約 PASS、無回歸且變更僅落在本 change 核准範圍。

## 4. Review findings 回歸覆蓋

- [x] [P] 4.1 依「開發啟動腳本建置 executable-side binary」更新 `build_test.go` 的 wrapper contract red tests，證明 `start.sh`／`start.ps1` 必須 build 並啟動 `.solar_mqtt_go_run` platform binary、保留參數與既有 config copy，且不得包含 `go run`；以 `rtk go test . -run TestStartPowerShellScriptMatchesContract -count=1` 先確認現況因 temporary executable contract 失敗。
- [x] [P] 4.2 依「以隔離 seam 覆蓋 default handlers 與 scrape path」強化 command/tray 與 WebUI regression tests：以 temp-owned canonical/decoy fixtures 驗證 `newConfig` 後續 save、default GET/PUT、explicit missing path 與 non-callback scrape branch 都不讀寫 decoy，且 CWD／path seam cleanup failure 會使測試失敗；對已正確的 resolver 行為先做 mutation check，再以 `rtk go test . -run TestNewConfigUsesExecutableDefaultWhenCWDContainsDecoy -count=1` 與 `rtk go test ./internal/webui -run 'TestResolveConfigPathDefaultIgnoresCWDDecoy|TestLocalConfigAPIExplicitMissingPathRemainsAuthoritative|TestDefaultLocalConfigAPIAndScrapeUseCanonicalPath' -count=1` 驗證，不得覆寫任意 test executable 旁的 config。

## 5. Documented wrapper 與完整收尾

- [x] 5.1 依「開發啟動腳本建置 executable-side binary」修改 `start.sh`、`start.ps1` 與 `.gitignore`，讓 wrappers 在 `solar_mqtt_go` 目錄 build 並啟動 ignored `.solar_mqtt_go_run` platform binary，使 copied Python config 與 executable 相鄰、參數／broker/browser 行為及 relative `sqlite_path` CWD 語意不變；以 4.1 tests 與 shell syntax check 驗證。
- [x] 5.2 重新執行 `rtk go test ./...`（`solar_mqtt_go`）、`rtk pnpm verify`、`rtk spectra analyze fix-solar-mqtt-config-path-contract --json` 與 `rtk git diff --check`，確認 review findings 清除、完整 config path contract PASS，且 scope 未擴張至 config schema、storage、Python source、MQTT/security、release build 或 deployment service。
