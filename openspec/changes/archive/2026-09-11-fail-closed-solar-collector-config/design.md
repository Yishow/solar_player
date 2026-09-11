## Context

Go collector 的設定 loader 為了相容舊 Python 設定，缺檔時保留 defaults、factory 缺欄位時以 default factory 合併。這種相容行為適合讀取與遷移，但不適合當作「可以開始對 Solar 設備登入與發布 MQTT」的判斷。

## Goals / Non-Goals

**Goals:**

- data-plane readiness 只相信磁碟上明確存在的 factory 必填欄位。
- 保留現有 config loader 相容性，不讓這次安全修正擴散成大規模設定格式重寫。
- invalid config 時 tray 仍可提供本機修復入口。

**Non-Goals:**

- 不修已退役 Python collector。
- 不改 MQTT broker transport defaults、SQLite 歷史查詢或 WebUI 本身的設定寫入格式。
- 不宣稱 runtime hot-reload；invalid-config tray session 儲存後需要重新啟動。

## Decisions

### 1. 驗證 persisted raw JSON，不驗證 merged Config

新增 `config.ValidateDataPlaneFile(path)`，直接讀檔並檢查明確 factory 欄位。若先 `Load()` 再驗證，缺少的密碼或 URL 已可能被 compatibility defaults 補上，看不出原始設定其實不完整。

### 2. CLI 擷取入口共用 gate

`run`、`once`、legacy `--once`、`test-login`、`dump-api` 在 dispatch 時先過同一個 gate。`test-mqtt` 與歷史查詢不依賴 Solar 登入，因此不被 gate 擋住。

### 3. Tray 採 config-only session

tray 必須保留本機 WebUI 作為修復入口。若啟動前驗證失敗，該 tray session 暫時把正式 MQTT connect path 改成拒絕連線；WebUI 照常啟動。為避免 stale in-memory Config 被誤認成已 reload，儲存後明確要求重新啟動 tray，而不是宣稱即時恢復。

## Risks / Trade-offs

- **本機檔案在 readiness check 與既有 loader 讀取之間被外部程序替換**：正常 WebUI 使用 atomic replace，風險限於非常窄的本機競態；本 change 不重寫整個 loader。若未來需要 hostile-local-process threat model，再把 validate+load 收斂成單一 snapshot API。
- **空密碼的特殊設備**：本 change 將 login credentials 視為必填非空字串；若真有匿名/空密碼設備，需要另行明確規格化，不能靠 defaults 猜。
- **tray 儲存後需重啟**：換取不使用 stale Config 啟動 data-plane 的清楚行為。

## Implementation Contract

- validator 不回傳或記錄 password value。
- legacy 單廠 top-level 四欄完整時仍通過 readiness。
- 多廠設定 factory_id 不可重複；base_url 必須是含 host 的 `http` 或 `https` URL。
- 設定未就緒時 data-plane command exit code 為 1。
- 新增 regression tests，並保留既有 CLI dispatch 可替換函式的測試能力。
