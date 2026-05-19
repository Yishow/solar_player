## 1. 建立共用同步保護層

- [ ] 1.1 實作 **Dirty state gate before auto-refresh**，讓 **Preserve dirty management drafts during display sync** 在 `apps/web/src/hooks/useDisplaySyncRefresh.ts` 與新 guard hook 上成為共通行為，並以 hook / unit tests 驗證 dirty surface 收到 `display:sync` 不會覆蓋本地 draft。
- [ ] 1.2 實作 **Surface adapters for draft detection and authoritative reload**，讓 `Playback Settings`、`MQTT Settings`、`Circuit Settings`、`Image Management` 都能以一致 adapter contract 交付 **Refresh clean management surfaces on display sync**，並以頁面互動測試驗證 clean surface 收到 sync 會重抓 authoritative state。

## 2. 補上操作員決策與驗證

- [ ] 2.1 實作 **Remote-change banner and operator actions**，讓 **Resolve remote change explicitly** 提供保留編輯與捨棄重載兩個明確動作，並以 component / integration tests 驗證 discard-and-reload 會清除 pending、keep-editing 會保留本地 draft。
- [ ] 2.2 補齊四個管理頁的 regression coverage 與 artifact 驗證，確認 dirty-protection 不會阻斷 publish/readiness/asset summary 的 clean sync 更新，並以 `pnpm exec spectra analyze protect-management-drafts-during-display-sync` 與 `pnpm exec spectra validate --strict --changes protect-management-drafts-during-display-sync` 驗證交付。
