## Problem

production service 將 stdout/stderr 寫入 journald，但 Device Status 的 log endpoints 掃描 LOG_DIR 內不存在的 .log files；operator 可能看到空陣列或 missing directory，實際錯誤卻留在 journal。device status 同時缺少 release commit/build/schema identity，現場無法確認正在診斷哪一版。

## Root Cause

systemd unit 與 deploy handoff 已把 journalctl 當真實 log source，server API 仍沿用 file-directory metadata contract；build/deploy 也沒有產生可由 runtime 讀取的 release manifest。

## Proposed Solution

- 將 solar-display journald unit records 定為 production server log truth，透過受保護 API 提供 bounded recent entries與 bounded text export。
- API 明確回報 source、available/unavailable reason、retention boundary；空內容不得冒充「沒有錯誤」。
- build/deploy 產生 release manifest，包含 commit、build time、package version 與最高 schema version；Device Status 顯示同一 identity。
- journal 不可用的 dev/test runtime 使用明確的 unavailable 或 fixture-backed adapter，不退回掃描任意 host paths。
- /health 維持便宜 liveness，不加入 journal 或 release 深度查詢。

## Non-Goals

- 不建立第二套無上限 file log sink。
- 不提供任意 journal unit、任意檔案路徑或 shell command 查詢。
- 不改 Device Status 的安全 read boundary。

## Success Criteria

- 注入一筆 solar-display server error 後，trusted operator 可從 Device Status 取得同一筆 bounded evidence。
- journal unavailable 時回傳可判讀原因，UI 不顯示誤導性的零檔案成功狀態。
- status 顯示的 release identity 與部署 manifest 一致。
- readonly root 與 journald retention 行為維持不變。

## Capabilities

### New Capabilities

- `deployment-release-identity`: 定義 release manifest 內容、生成時機與 Device Status 呈現。

### Modified Capabilities

- `device-status-log-access`: 將 production log source 從 LOG_DIR file listing 改為 bounded journald records/export，並加入 source 與 unavailable semantics。

## Impact

- Affected specs: `deployment-release-identity`, `device-status-log-access`
- Affected code:
  - Modified: `deploy.sh`, `deploy/deploy.sh`, `deploy/install-kiosk.sh`, `scripts/deploy.test.mjs`, `apps/server/src/config.ts`, `apps/server/src/routes/device.ts`, `apps/server/src/routes/device.test.ts`, `apps/web/src/services/api.ts`, `apps/web/src/pages/DeviceStatus/index.tsx`, `apps/web/src/pages/DeviceStatus/viewModel.ts`, `apps/web/src/pages/DeviceStatus/viewModel.test.ts`, `deploy.md`
  - New: `deploy/read-solar-display-journal.sh`, `scripts/generate-release-manifest.mjs`, `apps/server/src/services/deviceLogService.ts`, `apps/server/src/services/deviceLogService.test.ts`
  - Removed: none
