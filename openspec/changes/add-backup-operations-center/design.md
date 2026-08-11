## Context

`export-runtime-state.sh` 與 `restore-runtime-state.sh --drill` 已具備 checksum、manifest、permissions、integrity/migration/health smoke等可靠防線。管理 UI不應重寫這些邏輯或自己打包 DB；正確做法是把既有 helpers當唯一執行核心，新增安全 adapter與結果 projection。

## Goals / Non-Goals

**Goals:**

- operator能看到 backup/drill最近狀態與失敗 stage。
- UI觸發仍走既有 verified helper契約，不複製 backup算法。
- 所有 server→host操作固定命令、固定 root/backup registry，不接受任意 command/path注入。
- production restore繼續要求 CLI explicit confirmation。

**Non-Goals:**

- 不在 browser傳輸 `.env`/archive contents。
- 不建立任意檔案瀏覽器。
- 不把 backup failure自動觸發 production rollback。

## Decisions

### 既有 manifest 是 backup truth source

新增 parser只讀 existing versioned manifest/checksum sidecar與 archive stat，轉成 safe DTO：id/timestamp/sourceRelease/size/verified/containsSecrets/schema summary。未知 manifest版本顯示 unsupported，不猜欄位。

### 透過固定 privileged helper 執行

沿用 device log/kiosk helper的 fixed executable pattern。Server呼叫例如 `/usr/local/sbin/solar-display-backup-op backup` 或 `drill <registered-id>`；registered-id由 server從 backup directory allowlist解析，不接受 caller提供任意 filesystem path。Helper有 timeout/lock，避免同時跑兩個 backup/drill。

### Operation metadata 與 archive分離

DB只存 operation id/type/status/stages/start/end/bounded reason/backup id；archive仍由既有 scripts寫 protected directory 0700/0600。UI不拿 archive內容。

### Restore drill 永遠使用 temp root

Management drill只呼叫既有 `--drill` semantics，必須證明沒有 production service/root mutation。真正 overwrite restore只顯示 runbook/CLI handoff，不提供 HTTP mutation。

## Implementation Contract

- Backup Center能列最後成功/失敗 backup與 manifest verification結果。
- trigger backup若 checksum/manifest verification失敗，operation顯示 failed且不宣稱可還原。
- drill stage至少呈現 archive checksum、SQLite integrity_check、migration、health smoke。
- API/日志不得回 `.env` contents、archive secret、raw command或任意 path traversal資訊。
- concurrent operation被 lock/rejected，不同 request不得同時修改 backup state。
- production restore沒有 web action。

## Migration Plan

不改 existing backup format。新增 operation metadata table可為空；首次載入掃 existing backup manifests建立只讀 projection，不移動 archives。Host helper安裝沿用 deploy hardening與sudo allowlist。Rollback移除 UI/adapter不影響 backups。

## Risks / Trade-offs

- [Risk] backup可能耗時超過一般 HTTP request → 使用 operation id + polling/socket progress，實際 helper有更長但 bounded timeout。
- [Risk] privileged helper擴大攻擊面 → 固定 executable/subcommands、registered id、no arbitrary path、management auth與server-side allowlist。
- [Risk] 舊 manifest版本解析錯 → version switch + strict parser，unknown版本只顯示 unsupported。
