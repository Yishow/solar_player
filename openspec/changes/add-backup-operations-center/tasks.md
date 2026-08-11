## 1. Safe backup metadata projection

- [ ] 1.1 定義 safe backup/drill operation DTO與 strict versioned manifest parser。
- [ ] 1.2 掃描 protected backup registry只回 id/time/release/size/verification/secrets flag等安全 metadata。
- [ ] 1.3 新增 operation metadata persistence/locking與 bounded failure stages。

## 2. Fixed host operations

- [ ] 2.1 建立 fixed backup/drill host helper adapter，不接受任意 command/path。
- [ ] 2.2 `backup` operation重用 `export-runtime-state.sh` 並以 verified manifest/checksum決定 success。
- [ ] 2.3 `drill` operation重用 `restore-runtime-state.sh --drill`，解析 checksum/integrity/migration/health stages。
- [ ] 2.4 加 timeout、concurrent lock、sudo/permission與secret-safe error tests。

## 3. Management surface

- [ ] 3.1 新增 trusted Backup Operations Center API與 management UI。
- [ ] 3.2 顯示 latest backup、drill stages、storage/manifest warning與 safe restore handoff。
- [ ] 3.3 確認 UI不提供 production overwrite restore或 archive secret download。

## 4. Verification

- [ ] 4.1 跑既有 deploy backup/restore tests加新 adapter tests。
- [ ] 4.2 做 temp backup + restore drill witness，證明 production root/service未被 drill修改。
- [ ] 4.3 跑 root `pnpm test`、`pnpm build`、`pnpm verify`。
