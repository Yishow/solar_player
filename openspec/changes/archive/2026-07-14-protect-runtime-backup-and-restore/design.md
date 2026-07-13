## Context

one-key update的 remote bootstrap目前直接同步 bundle、安裝 dependencies並重啟 service；server啟動時會自動 migrations。既有 `deploy/export-runtime-state.sh`只封裝 mutable paths且對 active service僅警告，沒有 archive integrity、secret permissions、restore drill或 prior application rollback material。

## Goals / Non-Goals

**Goals:**

- application replacement前建立並驗證一致 snapshot。
- archive可識別來源、檢查完整性且 secrets owner-only。
- restore helper支援 temp drill與明確 production restore。
- 更新失敗保留 prior application與 runtime recovery material。

**Non-Goals:**

- 不自動回滾 production DB。
- 不做雲端、排程或多代 retention service。
- 不改 migrations或 readonly-root boundary。
- 不在 apply直接部署 production Pi。

## Decisions

### Backup gate precedes application replacement

`deploy/raspi-bootstrap.sh`在 update mode完成 host/disk preflight後，先停止 active solar-display service，再從 staged bundle呼叫 export helper對既有 install root建立 backup。只有 archive、sidecar hash與 manifest payload verification全部成功，才進入 copy_bundle。

init mode沒有既有 runtime，不執行 backup gate。dry-run必須列出 backup stage但不建立檔案。任何 backup failure都在 application replacement前退出，並嘗試恢復原 service state。

### Archive format is verifiable and secret-safe

每次 backup建立 `backups/<timestamp>/` mode 0700，內含 runtime archive、archive SHA-256 sidecar、prior application archive與 manifest，所有 files mode 0600。runtime archive包含存在的 data、uploads、.env與一份 manifest copy；manifest列 creation time、source release identity、schema versions、entries、每個 payload checksum與 containsSecrets。

export在 service停止後執行 SQLite WAL checkpoint，再封裝。若 sqlite3不可用或 checkpoint/integrity preflight失敗，update fail closed；不退回 live file copy。

### Restore is explicit and temp-first

`deploy/restore-runtime-state.sh`接受 backup directory與 target root。預設拒絕 existing non-empty target；production overwrite需要明確 confirmation token。流程先驗 sidecar hash、extract到 temp、驗每個 payload checksum，再將 mutable paths寫入 target。

drill mode固定使用 fresh temp root，對 DB執行 integrity_check、以 bundle code執行 migrations、啟動 bounded server health smoke，結束後清理 process與 temp root。drill不接觸 production service。

### Failed updates preserve rollback material

prior application archive排除 .env、data、logs、uploads、backups，只保存可執行 bundle。新 service health失敗時，bootstrap停止並輸出 prior application、runtime archive與 restore command；它不自動把 archived DB覆蓋到已可能被 migration寫入的 production DB。

operator可先恢復 prior application，再評估是否需要 explicit runtime restore。

## Implementation Contract

- Behavior：update沒有 verified backup就不覆蓋 app；成功 backup可在 temp root完成 restore drill。
- Interface：export回報 backup directory；restore接受 backup directory、target root與 explicit overwrite confirmation；manifest使用 JSON且包含 versioned schema。
- Failure modes：service stop、checkpoint、archive、hash、manifest、restore verification、integrity、migration或 health任一失敗皆nonzero並指出 recovery material；production DB不自動rollback。
- Acceptance：deploy fixture tests覆蓋 active/inactive service、backup failure、permissions、tamper detection、temp restore drill與 failed health handoff；非 production Pi rehearsal再驗 service與 kiosk。
- In scope：one-key update、export/restore helpers、prior app material、permissions、docs/tests。
- Out of scope：scheduled backup、remote storage、schema changes、production execution。

## Risks / Trade-offs

- [backup增加 update downtime] → 只封裝 mutable state與單一 prior bundle，並在 rehearsal記錄時間；不以 unsafe live copy換速度。
- [archive包含 secrets] → directory 0700、files 0600、manifest顯式 containsSecrets，文件禁止上傳未加密 archive。
- [migration後直接 DB rollback破壞新資料] → 永不自動 restore DB；只輸出明確 operator path。
- [disk space不足] → preflight估算 mutable＋prior bundle大小並保留 margin，不足時在 stop/copy前退出。

## Migration Plan

先在 temp install fixture完成 export/restore tests，再於非 production Linux root完成 update failure演練，最後在非 production Pi執行 install→update→health failure→prior app recovery→temp DB restore drill。回滾本 change不刪既有 backups。
