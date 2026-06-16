## Context

現有 kiosk deploy 已有 root deploy bundle、deploy/install-kiosk.sh、deploy/start-solar-kiosk.sh、deploy/stop-solar-kiosk.sh、deploy/firefox-kiosk.desktop 與 systemd service template。install-kiosk.sh 目前會建立 runtime directories、解析 kz 使用者的 node/pnpm、安裝 systemd service、安裝 autostart launcher、設定 GDM autologin，並重啟 solar-display service。

這次部署目標是 Raspberry Pi kiosk，使用者已把系統用 USB 切出額外 data volume。需求同時包含：安裝到 /data、開機自動進 kiosk、離開 kiosk 後桌面 icon 可返回、最後把 root filesystem 調整成低寫入或 read-only，並降低強制斷電造成故障的風險。

## Goals / Non-Goals

**Goals:**

- 讓 kiosk install 可以用 INSTALL_DIR=/data/solar-display 完成 service、runtime paths、launcher paths 與 logs 配置。
- 明確建立桌面可點擊的 Solar Display Kiosk launcher，補足只安裝 autostart launcher 的缺口。
- 提供 read-only root hardening 腳本或流程，且在 /data runtime 不可寫時拒絕套用。
- 提供 verification helper，檢查 service、health endpoint、autostart launcher、desktop launcher、runtime storage path。
- 保持 kiosk exit 的固定 helper 與既有管理信任邊界。

**Non-Goals:**

- 不改成遠端 DB 或外部 DB connector。
- 不保證所有硬體斷電情境零風險；目標是可驗證地降低 root filesystem 與 runtime state 損壞風險。
- 不新增 client 可傳 arbitrary host command 的能力。
- 不把 app source 或 build output 移出現有 monorepo bundle 結構。

## Decisions

### Use /data/solar-display as the kiosk install root

INSTALL_DIR 已經是 install-kiosk.sh 的主要抽象，使用 /data/solar-display 作為整個 bundle 與 runtime 根目錄可以讓 WorkingDirectory、.env、SQLite data、uploads、logs、ReadWritePaths 同步收斂。替代方案是保持 /opt/solar-display 並只把 DATA_DIR/UPLOADS_DIR 指到 /data；這會形成 split-brain runtime，deploy、backup、read-only 檢查都更容易漏掉路徑。

### Install both autostart and desktop launchers from one launcher definition

deploy/firefox-kiosk.desktop 應繼續作為 launcher template，但 install-kiosk.sh 需要把它安裝到 autostart directory 與 Desktop directory。兩個 launcher 都呼叫同一個 start helper，避免自動開機與手動返回使用不同命令。桌面 launcher 需要 owner、execute bit，並盡量設定 GNOME trusted metadata；若 metadata 設定工具不可用，installer 要記錄 warning 而不是中斷 service installation。

### Keep kiosk exit and re-entry bounded to fixed helpers

Device Status 的 kiosk exit 已經經由固定 stop helper。這次只補 re-entry 的固定 start helper 與桌面 launcher，不讓 web client 指定 process name、command、URL 或 filesystem path。start helper 只接受既有 KIOSK_URL/KIOSK_HEALTH_URL 環境覆寫，預設仍指向 local app。

### Gate read-only hardening behind runtime write verification

read-only root hardening 必須在 /data/solar-display 存在且 kiosk user 可寫時才執行。hardening 腳本應先列印與檢查 runtime write locations，再調整 root filesystem 寫入策略。若 /data 未掛載、不可寫，或 service path 不在 /data/solar-display，腳本要 fail closed。這比直接修改 fstab 或 remount root 更安全。

### Verify before and after reboot

新增 verify helper，支援在 SSH session 中檢查 systemd state、/api/health 或 /health fallback、launcher 檔案、runtime path、service environment 與 writable directories。read-only hardening 之後仍要能重跑 verify helper，確認開機後 service 可用、離開 kiosk 後桌面 launcher 可返回。

## Implementation Contract

Behavior:

- Running the installer with INSTALL_DIR=/data/solar-display and KIOSK_USER=kz installs the backend service using /data/solar-display as WorkingDirectory and runtime root.
- The kz desktop session contains a clickable Solar Display Kiosk launcher after install.
- Device Status kiosk exit leaves the operator with a visible desktop re-entry target named Solar Display Kiosk.
- Read-only hardening refuses to apply when /data/solar-display is not writable by kz.
- Verification reports actionable failures for missing desktop launcher, missing autostart launcher, unhealthy service, unhealthy local health endpoint, or runtime paths outside the configured install root.

Interfaces:

- deploy/install-kiosk.sh accepts INSTALL_DIR, KIOSK_USER, KIOSK_GROUP, KIOSK_HOME, NODE_BIN, PNPM_BIN, KIOSK_URL, and KIOSK_HEALTH_URL as environment overrides.
- deploy/verify-kiosk-install.sh accepts INSTALL_DIR, KIOSK_USER, KIOSK_URL, and KIOSK_HEALTH_URL.
- deploy/enable-readonly-root.sh accepts INSTALL_DIR and KIOSK_USER, and exits non-zero before making changes if runtime write validation fails.
- deploy/firefox-kiosk.desktop remains the launcher template for autostart and desktop re-entry.

Failure modes:

- Missing node or pnpm remains a hard installer failure.
- Missing Desktop directory is repaired by installer creation.
- GNOME trust metadata failure is reported as a warning if the executable desktop file is still installed.
- Missing or unwritable /data/solar-display blocks read-only hardening.
- Health endpoint failure blocks final verification but does not delete installed files.

Acceptance criteria:

- scripts/deploy.test.mjs covers bundle inclusion and executable permissions for new helpers.
- Shell syntax checks pass for deploy/install-kiosk.sh, deploy/start-solar-kiosk.sh, deploy/verify-kiosk-install.sh, deploy/enable-readonly-root.sh, and deploy/stop-solar-kiosk.sh.
- A remote verification run against kz@192.168.31.166 confirms service state, health endpoint, launcher paths, and /data/solar-display runtime paths before read-only hardening.
- After read-only hardening and reboot, the same verification run confirms service health and launcher presence.

Scope boundaries:

- In scope: deploy scripts, service template, launcher template, runbook text, deploy bundle tests.
- Out of scope: external DB migration, changing MQTT ingestion, adding arbitrary remote command execution, replacing Firefox with another browser.

## Risks / Trade-offs

- [Risk] read-only root changes can lock out package updates or break desktop services if applied too broadly. → Mitigation: hardening must be explicit, gated by runtime write checks, and documented with verification and rollback instructions.
- [Risk] Desktop environments differ in how they trust .desktop files. → Mitigation: install executable launcher and best-effort GNOME trust metadata; verification checks file presence and executable bit.
- [Risk] /data can mount too late at boot. → Mitigation: installer and verification check /data/solar-display; service fails visibly instead of writing back to root.
- [Risk] SQLite can still be damaged by power loss if the data volume itself is interrupted mid-write. → Mitigation: keep WAL mode, concentrate writes under /data, and require backup/export guidance rather than claiming zero-risk persistence.

## Migration Plan

1. Build the deploy bundle locally.
2. Copy the bundle to the Raspberry Pi and install it under /data/solar-display.
3. Run kiosk verification before enabling read-only root hardening.
4. Confirm Device Status kiosk exit and desktop launcher re-entry.
5. Enable read-only root hardening only after runtime writes are confirmed under /data/solar-display.
6. Reboot and rerun verification.
7. Roll back by disabling the read-only root changes and restoring the previous systemd service backup if verification fails.

## Open Questions

- The exact root read-only mechanism depends on the Raspberry Pi OS image and mount layout; apply must inspect the live host before choosing fstab, overlayroot, or systemd-remount based implementation.
