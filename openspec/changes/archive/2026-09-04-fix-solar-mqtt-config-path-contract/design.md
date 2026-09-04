## Context

`internal/config.DefaultConfigPath()` 已回傳 executable directory 下的 `solar_config.json`，但 application entry path 沒有一致採用它：`commands.go` 的 default resolver 先檢查 process CWD，WebUI resolver 也掃描多個 CWD-relative candidates。結果是同一個 binary 會因啟動目錄不同而讀寫不同設定，違反既有 Python `CONFIG_PATH` 相容契約。

現有 `start.sh` 與 `start.ps1` 先把 Python config 複製到 `solar_mqtt_go` 工作目錄，卻透過 `go run` 執行位於 Go build cache 的暫存 binary。移除 CWD fallback 後，該 binary 不會再看到 wrapper 剛準備的 config，因此 documented development launch path 也必須改為執行與 config 同目錄的穩定 binary。

設定 path 與資料庫 path 有不同語意：application config 固定跟隨 executable；config 內的相對 `sqlite_path` 仍由 storage 依 process CWD 解讀。兩者不可在同一修正中混用。

## Goals / Non-Goals

**Goals:**

- command、tray 與 WebUI 的未指定 config path 都使用 `config.DefaultConfigPath()`。
- CWD 中即使存在另一份 `solar_config.json`，也不影響 application config 的 load/save target。
- `start.sh` 與 `start.ps1` 啟動的 executable 與 wrapper 準備的 `solar_config.json` 位於同一目錄。
- 保留測試與 caller 明確提供 config path 的 seam。
- 以 conflicting-file regression tests 證明讀與寫使用同一 path。

**Non-Goals:**

- 不修改 JSON schema、coercion、migration、unknown-key retention 或 atomic save。
- 不修改相對 `sqlite_path` 的 process-CWD 語意。
- 不新增 config search path、環境變數 override 或 CLI flag。
- 不修改 release build outputs、Windows service 定義或其他 deployment topology。
- 不修改 Python collector、MQTT/security contract 或部署服務定義。

## Decisions

### 所有預設入口直接採用 executable-relative DefaultConfigPath

`config.DefaultConfigPath()` 是唯一 default source of truth。`commands.go` 的 `configPathFor` default implementation 直接委派給它；WebUI 在 `Options.ConfigPath` 空白時也直接採用它。移除 `os.Stat`/candidate probing，不再根據檔案是否存在或 CWD 改變選擇。

替代方案是保留 candidate probing 並調整順序，但仍會讓缺少 executable config 時悄悄落到另一份檔案，無法滿足固定部署位置契約。

### 明確提供的 ConfigPath 保持 authoritative

`StartWithOptions` 與既有 test seams 明確傳入非空 path 時，load、save、scrape-now handler 都使用該 path，不檢查或替換成其他 candidate。這保留 focused tests 與嵌入 caller 的隔離能力，同時不建立新的 runtime override surface。

替代方案是完全移除 path injection，但會迫使 tests 寫入 test executable directory，降低隔離性且沒有產品價值。

### relative sqlite_path 繼續由 process CWD 解讀

此 change 只統一 application config path，不對 `storage.Open` 的輸入做 executable-relative rebase。`sqlite_path: "solar.db"` 仍代表 process CWD 下的 `solar.db`，與 Python compatibility baseline 相同。

替代方案是讓所有相對 path 都跟隨 executable，但這是另一個 runtime contract 變更，會改變既有資料庫位置，故排除。

### 以 conflicting CWD fixture 驗證完整讀寫路徑

測試在 CWD 放置可辨識的 decoy config，同時讓 default/injected executable-side config 使用不同值；驗證 `newConfig`、WebUI local-config GET/PUT 與相關 startup resolver 都選定 canonical path，且 decoy 檔案不被改寫。既有 `TestRelativePathUsesProcessCWD` 保持 PASS，作為 SQLite boundary guard。

### 開發啟動腳本建置 executable-side binary

`start.sh` 與 `start.ps1` SHALL 在 `solar_mqtt_go` 目錄建置專用的 `.solar_mqtt_go_run`（Windows 為 `.solar_mqtt_go_run.exe`）後執行該 binary；root `.gitignore` 忽略這兩個 local artifacts。Wrapper 保留既有 Python config copy、MQTT broker probe、browser launch 與參數傳遞，且不改變 process CWD，因此 config 與 executable 同目錄、相對 `sqlite_path` 仍落在原工作目錄。

替代方案是在系統 temp directory 建置 binary，但 WebUI save 會寫入短生命週期目錄；另一替代方案是新增 CLI/env config override，但超出本 change 的 interface scope。兩者皆不採用。

### 以隔離 seam 覆蓋 default handlers 與 scrape path

Command test 先獨立證明 default `configPathFor` 忽略 CWD decoy，再透過既有 replaceable seam 在 temp directory 驗證 `newConfig` 與後續 save 共用同一 canonical path。WebUI 增加 package-private default-path seam，production 初始化為 `config.DefaultConfigPath`，tests 必須在 cleanup 還原；藉此以 temp config 驗證 default GET/PUT 與未提供 `ScrapeNow` callback 的 config-loading branch，不直接寫入任意 test executable 旁的檔案。所有 CWD 與 seam cleanup failure 都必須讓測試失敗，不得靜默忽略。

替代方案是由測試覆寫真正 executable-adjacent config，但 `go test -c` 產物可能與 operator config 同目錄，隔離風險不可接受。

## Implementation Contract

- **Behavior:** 未明確提供 config path 時，不論 process CWD 為何，Go collector 的 command、tray 與 WebUI 都讀寫 executable 旁的 `solar_config.json`；CWD 同名檔案不被讀取或覆寫。
- **Interface:** `config.DefaultConfigPath() string` 維持 executable-relative；`configPathFor` test seam 與 `webui.Options.ConfigPath` 非空值維持可注入且 authoritative。
- **Launch wrappers:** `start.sh` 與 `start.ps1` SHALL build and execute the ignored `.solar_mqtt_go_run` platform binary beside `solar_config.json`; they SHALL NOT use `go run`, change CWD semantics, or add a runtime config override.
- **Read/write consistency:** `Config.ConfigPath()`、control save 與 WebUI local-config handlers 必須沿用同一個已載入/明確傳入的 path，不在 handler 期間重新搜尋 CWD candidates。
- **Failure mode:** Canonical config 不存在或無法讀寫時，沿用現有 load/save error；不得靜默 fallback 到 CWD 或其他相對候選檔。
- **SQLite boundary:** 相對 `sqlite_path` 繼續由 process CWD 解讀；此 change 不 rebase 或 migrate database files。
- **Test isolation:** regression tests SHALL use temp-owned canonical and decoy files, restore process-global seams/CWD with checked cleanup, and SHALL NOT overwrite an arbitrary executable-adjacent config.
- **Acceptance:** conflicting-CWD command/tray read-write tests、default and explicit WebUI GET/PUT tests、non-callback scrape path、wrapper source-contract tests、`go test ./...`、repo `pnpm verify` 通過，且 diff 不包含 config format、storage path、Python source、MQTT/security 或 deployment service changes。

## Risks / Trade-offs

- [Risk] 開發者過去依賴從 repo root 自動找到 config → 這是現行錯誤 fallback；以 explicit test/caller path 與 documented launch scripts 處理開發隔離，不保留 runtime probing。
- [Risk] Wrapper 每次啟動都需重新 build → 使用固定 ignored local artifact，換取 executable/config path 一致與可預測的 save target；不改 release build pipeline。
- [Risk] WebUI handler 仍呼叫 resolver 導致未來重新引入 probing → resolver 僅允許「非空值原樣使用，空值採 DefaultConfigPath」並以 conflicting-CWD test 鎖定。
- [Risk] 測試修改 package-global path seam 與 CWD → 禁止相關 tests 使用 `t.Parallel()`，並以可檢查的 cleanup 完整還原。
- [Risk] 誤把 SQLite path 一併 rebase → 保留並重跑 `TestRelativePathUsesProcessCWD`。
