## Summary

把 `Device Status` / diagnostics 的安全操作邊界與 operator runbook 補完整，讓系統不只知道哪些診斷 action 是安全的，也能在 UI、API 與文件中清楚告訴 operator 何時該用 page-level diagnostics、何時該改走 systemd / deploy runbook。

## Motivation

目前系統雖然已把 `reboot` 保持停用、把 display diagnostics 限制在 safe read / refresh actions，但這些規則分散在 route stub、view model 文案與少數測試裡。`Device Status` 也沒有第一手 runbook 告訴 operator 哪些操作只是安全摘要、哪些需要到主機層或 `systemctl restart solar-display`。這會讓現場維運在故障時缺少一致指引，甚至誤以為某些 stub API 代表正式可用操作。

## Proposed Solution

- 定義 `Device Status` 的 safe-ops contract，明確區分「安全診斷讀取 / refresh」與「需主機層 runbook 處理的危險操作」。
- 在 API summary 與前端 `Device Status` 上加入 operator-facing guidance，清楚標示 diagnostics action 的目的、限制與 escalation destination。
- 補一份 repo 內的 diagnostics / safe-ops runbook，描述常見故障的頁面處置、systemd restart 邊界、以及目前明確不支援的 device-control 行為。

## Non-Goals

- 不在這個 change 內啟用真正的 reboot、cache purge 或其他危險 device controls。
- 不建立完整遠端維運後台或 SSH orchestration。
- 不重做 `Device Status` 的整體版型。

## Alternatives Considered

- 只在 route error message 中留一句 `Use systemctl restart solar-display instead.`：資訊太零散，operator 仍缺少完整診斷流程。
- 直接移除所有 stub routes 而不補 guidance：可減少誤解，但無法替代現場真正需要的操作說明。

## Impact

- Affected specs:
  - device-diagnostics-safe-ops-runbook
  - device-status-display-diagnostics
- Affected code:
  - Modified:
    - apps/server/src/routes/device.ts
    - apps/server/src/routes/device-display-ops.ts
    - apps/server/src/services/deviceDisplayOpsService.ts
    - apps/web/src/pages/DeviceStatus/index.tsx
    - apps/web/src/pages/DeviceStatus/viewModel.ts
    - apps/web/src/pages/DeviceStatus/DeviceStatusContent.tsx
    - apps/web/src/services/api.ts
    - README.md
    - docs/README.md
  - New:
    - docs/runbooks/device-diagnostics-safe-ops.md
    - packages/shared/src/deviceSafeOps.ts
  - Removed: (none)
