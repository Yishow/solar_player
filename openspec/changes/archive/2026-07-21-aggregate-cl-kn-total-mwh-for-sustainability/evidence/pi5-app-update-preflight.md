# Pi 5 app update preflight

- 執行時間：2026-07-16 23:25（Asia/Taipei）
- 目標：operation-time target `100.99.99.2`（Tailscale 節點 `rpi5-cl`）
- 預定 scope：`--mode update --scope app --skip-disk`
- Source：base commit `90a3954`，dirty worktree；使用者已明確要求部署目前所有變更到測試 Pi。
- Local gate：`pnpm verify` 全 stages 通過。

## Blocker

- SSH preflight：TCP 22 連線逾時，尚未登入目標。
- ICMP：3/3 timeout。
- Tailscale status：目標節點 offline，最後上線約 5 小時前；本機節點與 Tailscale route 正常。
- Tailscale ping：逾時。

因此沒有建立遠端備份、沒有替換應用程式、沒有重啟 service，也沒有執行 FHD witness。Task 4.3 必須維持未完成；目標重新上線後，從 SSH/service/health/app-scope prerequisite preflight 重新開始。
