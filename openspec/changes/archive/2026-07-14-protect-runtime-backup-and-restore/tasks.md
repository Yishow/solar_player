## 1. 先鎖住 backup 與 archive contract

- [x] 1.1 在 `scripts/deploy.test.mjs`新增active/inactive service、checkpoint failure、archive failure、permissions與tamper fixtures，覆蓋「Update deployment requires a verified runtime backup」及「Runtime archive is secret-safe and self-describing」；驗證：現況因只警告active service且無manifest/0600 gate而失敗。
- [x] 1.2 依「Archive format is verifiable and secret-safe」擴充 `deploy/export-runtime-state.sh`，產生0700 backup directory、0600 runtime/prior-app archives、versioned manifest與SHA-256 evidence，並在service停止後checkpoint；驗證：fixture manifest entries/checksums/schema/source identity正確，tamper或checkpoint failure nonzero。

## 2. Restore helper 與 drill

- [x] 2.1 為「Restore helper verifies before replacing state」與「Restore drill proves database and runtime viability」加入checksum-first、existing-target refusal、confirmation、integrity/migration/health fixtures；驗證：invalid checksum不寫target，valid temp drill回報integrity ok與healthy。
- [x] 2.2 依「Restore is explicit and temp-first」實作 `deploy/restore-runtime-state.sh`的verify、temp drill與explicit overwrite modes；驗證：上述fixtures通過，且drill不讀寫production install root或service。

## 3. 接入 one-key update 與 rollback handoff

- [x] 3.1 依「Backup gate precedes application replacement」修改 `deploy/raspi-bootstrap.sh`：update先stop→verified backup→copy，任一步失敗恢復原service state且不替換application；驗證：ordered fixture與backup-failure fixture通過。
- [x] 3.2 依「Failed updates preserve rollback material」保留prior application archive，health failure只輸出prior/runtime paths與restore command、不自動restore DB；驗證：「Failed update preserves rollback material without destructive database rollback」fixture確認DB sentinel未回滾。
- [x] [P] 3.3 更新 `scripts/raspi-onekey-deploy.sh` dry-run、`README.md`與`deploy.md`，完整交付修改後的「Provide a local Raspberry Pi kiosk deployment entrypoint」；驗證：dry-run列出backup/recovery stages且文件read-back能執行restore drill。

## 4. 整體 rehearsal

- [x] 4.1 執行shell syntax與node --test scripts/deploy.test.mjs，再於temp root跑export→tamper reject→restore drill；驗證：所有automated checks exit zero、archive/manifest permissions符合0700/0600。
- [x] 4.2 在一台非production Linux/Pi執行install→update→forced health failure→prior app recovery→temp DB restore drill；驗證：舊runtime可恢復、production DB未自動rollback、service與kiosk verify最終通過並保存evidence。
