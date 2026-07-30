## 1. View model 與狀態 TDD

- [x] 1.1 先為 Manage Devices and Groups from one trusted surface、Complete pairing actions without exposing credentials、Present fleet status with explicit operational states 寫 failing viewModel/component tests；驗證 50 rows、empty/loading、unpaired/disabled/offline、duplicate 與 token clear。
- [x] 1.2 實作 Separate load model, view model, and mutations，使成功 mutation 只刷新受影響 resource、失敗保留可讀 rows；以 loadModel/viewModel tests 驗證 409 與 partial unavailable。

## 2. Route、操作與 observability

- [x] 2.1 實作 Add a dedicated lazy management route 與 Keep management code out of playback sessions，使 /device-fleet 僅在 ManagementShell 載入；以 router chunk/navigation tests 驗證 playback route 不發管理 request。
- [x] 2.2 實作 Reveal pairing tokens only at creation，使 Pairing dialog close 清除 plaintext 且 re-pair 明確確認；以 component interaction tests 驗證。
- [x] 2.3 [P] 實作 Show stable Device identity and duplicate connection diagnostics，在 Device Status 顯示 Group/Site/connection/duplicate 且不暴露 raw source；以 DeviceStatus viewModel tests 驗證。
- [x] 2.4 [P] 補 Preserve Device Fleet CRUD and status behavior across rendering changes contract tests，鎖定 CRUD、pairing、access gating 與 explicit states；以既有 test command 驗證。

## 3. 整體驗證

- [x] 3.1 執行 pnpm --filter @solar-display/web test、pnpm test、pnpm build、pnpm verify 與 spectra analyze device-fleet-management-surface，修正所有 Critical/Warning。
