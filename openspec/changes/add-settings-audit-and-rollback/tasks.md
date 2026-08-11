## 1. Audit persistence and provenance

- [ ] 1.1 新增 settings audit schema/indexes、actor class/fingerprint 與 shared API types。
- [ ] 1.2 實作 audit coordinator與 per-domain allowlist redaction contract。
- [ ] 1.3 接入 MQTT broker/topics、weather、playback、circuits、image playlist/settings mutations。
- [ ] 1.4 加 secret leakage tests，確保 password/token/authorization不進 DB/API/log。

## 2. History and rollback

- [ ] 2.1 新增 audit list/filter/detail API與 management UI。
- [ ] 2.2 為各 domain實作 rollback preview、current revision precondition與 validation。
- [ ] 2.3 rollback apply使用原 mutation path/sync並新增 linked audit event。
- [ ] 2.4 補 concurrent change conflict與 secret-preservation tests。

## 3. Verification

- [ ] 3.1 建立 route coverage test，確保 in-scope mutations皆產生 audit event。
- [ ] 3.2 跑管理頁/browser audit + rollback critical journey。
- [ ] 3.3 跑 root `pnpm test`、`pnpm build`、`pnpm verify`。
