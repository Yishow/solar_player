## Why

`deploy/deploy.sh` 預設安裝到 /opt/solar-display，卻直接安裝一份所有 runtime paths 都指向 /data/solar-display 的 systemd unit；同一次 deploy 可能建置成功但服務從另一個不存在或過期的目錄啟動。現行 Pi、readonly root 與 kiosk 驗證都以 /data/solar-display 為 writable runtime boundary，部署入口必須使用同一契約。

## What Changes

- 將 /data/solar-display 設為正式預設 install root。
- generic deploy 仍接受明確 install root，但安裝 systemd unit 前必須將 WorkingDirectory、EnvironmentFile、DATA_DIR、LOG_DIR 與 ReadWritePaths 一致地渲染到該 root。
- 以 temp-root／source assertions 鎖住預設與自訂 root，並證明 update 不覆蓋 .env、data、logs、uploads。
- 同步 README、部署 handoff 與 ops conventions 的正式路徑描述。

## Non-Goals

- 不重寫 one-key installer 或 readonly-root 流程。
- 不降低 systemd hardening。
- 不在此 change 加入 backup／restore、network policy 或 live production deploy。

## Capabilities

### New Capabilities

- `deployment-install-root-consistency`: 定義 installer、installed unit、mutable runtime paths 與部署文件必須共享同一 install root。

### Modified Capabilities

（無）

## Impact

- Affected specs: `deployment-install-root-consistency`
- Affected code:
  - Modified: `deploy/deploy.sh`, `deploy/solar-display.service`, `scripts/deploy.test.mjs`, `README.md`, `deploy.md`, `docs/ops/conventions.md`
  - New: none
  - Removed: none
