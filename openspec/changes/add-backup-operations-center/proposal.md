## Why

Repo 已有 verified runtime backup、checksum manifest、secret-safe permissions、restore helper 與 temp restore drill，但這些能力主要存在 deploy/runbook/CLI。現場管理者從 Device Status 或設定頁看不到「最後一次備份何時、是否驗證成功、大小多少、對應哪個 release、最近一次 restore drill 有沒有真的通過」。因此最成熟的保護機制反而缺少日常可視性。

## What Changes

- 新增 Backup Operations Center，讀取/整理既有 backup manifest 與 drill result，顯示最後成功/失敗時間、archive size、source release、schema/checksum verification、contains-secrets標記與 storage health。
- 提供 trusted management「建立一次 verified backup」與「對指定 verified backup 執行 temp restore drill」操作，server只能呼叫固定 host helper，不接受任意 shell/path。
- operation有 bounded progress/result、timeout/correlation id；錯誤不回傳 `.env`、secret內容或完整內部 command。
- drill結果顯示 checksum、SQLite integrity、pending migrations、bounded health smoke 各 stage。
- production overwrite restore仍保留 CLI + explicit confirmation，不新增一鍵覆寫 production按鈕。
- Backup Center 可顯示可複製的安全 restore handoff/runbook資訊，但不直接下載 secret-containing archive到一般 browser。

## Non-Goals

- 不改既有 backup archive格式或放寬檔案權限。
- 不提供 browser 一鍵 production restore。
- 第一版不做遠端雲端備份同步。

## Capabilities

### New Capabilities

- `backup-operations-center`: 管理頁可視化 verified backup/restore-drill狀態，並透過固定受控 helper觸發 backup與 non-destructive drill。

### Modified Capabilities

（無）

## Impact

- Affected specs: new `backup-operations-center`; implementation必須遵守既有 `runtime-backup-and-restore` 契約。
- Affected code: fixed backup/drill host helper adapter、server routes/service、Device Status/management UI、manifest parser、tests。
- Affected data: operation metadata可保存於 runtime DB；backup archive本身仍在既有 protected backup directory。
