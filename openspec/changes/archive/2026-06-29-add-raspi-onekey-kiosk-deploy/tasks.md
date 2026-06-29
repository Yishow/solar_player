## 1. 測試契約與 fixture

- [x] 1.1 [P] 建立 `Provide a local Raspberry Pi kiosk deployment entrypoint` 與 `Keep daily update deployments non-destructive` 的 deploy test fixture，驗證 `scripts/deploy.test.mjs` 能斷言 dry-run 會列出 target/mode/install dir/MQTT/readonly 設定，且 update mode 不包含分割、格式化或 mount table 修改命令。
- [x] 1.2 [P] 建立 `Gate new-card disk initialization behind detected layout and confirmation` 的磁碟 layout fixture，驗證 root-full/no-`/data` 會輸出 online root shrink not supported 並 exit non-zero，既有 writable `/data` 會被辨識為 reuse path。
- [x] 1.3 [P] 建立 `.env` preservation fixture 覆蓋 `Preserve MQTT defaults without overwriting target configuration`，驗證首次 install 會產生 MQTT host 預設，既有 `.env` 不會被覆蓋且會印出 not overwritten 訊息。
- [x] 1.4 [P] 建立 `Configure lightweight XFCE RDP without weakening SSH or sudo` 與 `XFCE 加 xrdp 作為輕量遠端桌面` 的 desktop fixture，驗證 dry-run 會列出 XFCE+lightdm+xrdp 與 Firefox 安裝、local desktop autologin、RDP passwordless opt-in、SSH/sudo 仍需密碼，且缺少 RDP password source 時 fail closed。
- [x] 1.5 [P] 建立 `Provide fixed desktop controls for readonly system maintenance` 與 `桌面維護捷徑只包固定 readonly helper` 的 launcher fixture，驗證桌面會安裝 `Enable Read Only System` 與 `Temporarily Disable Read Only System`，且 launcher 只呼叫固定 helper、執行 host 變更時仍需 sudo。
- [x] 1.6 [P] 建立 `First-boot user-data 準備採互動選單` / `Prepare first-boot user-data with an interactive menu` fixture，驗證無參數互動選單預設產生 `pi` sudo user、`openssh-server`、root local password、備份原 `user-data`、停用 growpart/resize_rootfs，且 root SSH login disabled。

## 2. 遠端部署入口與 host bootstrap

- [x] 2.1 實作 `新增單一遠端部署入口並保留既有 bundle 流程`：`scripts/raspi-onekey-deploy.sh` 接受 `<user@host>`、`--mode init|update`、`--install-dir`、`--mqtt-host`、`--bundle online|offline`、`--desktop xfce-xrdp|none`、`--rdp-auth passwordless|system-password`、`--dry-run`、`--skip-disk`、`--apply-readonly`，驗證方式為 `bash -n scripts/raspi-onekey-deploy.sh` 與 dry-run fixture 通過。
- [x] 2.2 實作 `目標端 bootstrap helper 負責 host-specific 操作`：`deploy/raspi-bootstrap.sh` 驗證 Ubuntu 24.04 arm64、sudo、`/data`、install dir、Node/pnpm、Firefox、service/kiosk helper prerequisite、XFCE/xrdp prerequisite，並以 `OK:`/`FAIL:` summary 回報；驗證方式為 `bash -n deploy/raspi-bootstrap.sh` 與 host-preflight fixture 通過。
- [x] 2.3 將新 helper 納入 root bundle 流程，確保 `deploy.sh` online/offline bundle 都包含 executable `scripts/raspi-onekey-deploy.sh`、`deploy/raspi-bootstrap.sh`、`deploy/configure-lightweight-desktop.sh` 與 readonly desktop launcher templates，驗證方式為 `DEPLOY_CHOICE=1 DEPLOY_BUILD_CMD=true ./deploy.sh`、`DEPLOY_CHOICE=2 DEPLOY_BUILD_CMD=true ./deploy.sh` 或對應 fixture 測試通過。

## 3. 磁碟、runtime state 與環境設定

- [x] 3.1 實作 `磁碟初始化採互動選單與安全拒絕`：init mode 顯示 disk size、partition list、root size、`/data` status 與 root-size/data layout choices；新卡預設 `/data` 固定 10GiB、root 用剩餘前段空間；root-full/no-`/data` 必須拒絕且不得呼叫 shrink/format/mount mutation，驗證方式為磁碟 layout fixture 通過。
- [x] 3.2 實作 `日常部署模式不得觸碰磁碟與 runtime state`：update mode 保留 `.env`、`data`、`logs`、`uploads/images`、`uploads/brand`，只更新 application files 與 deploy helpers，驗證方式為 runtime preservation fixture 通過。
- [x] 3.3 實作 MQTT default handling：首次 install 使用 `--mqtt-host` 寫入 `.env` 的 broker host，既有 `.env` 保持 byte-for-byte 不變並印出未覆蓋訊息，驗證方式為 `.env` preservation fixture 通過。
- [x] 3.4 實作 `Configure lightweight XFCE RDP without weakening SSH or sudo` 與 `XFCE 加 xrdp 作為輕量遠端桌面`：新增 `deploy/configure-lightweight-desktop.sh` 安裝/設定 XFCE+lightdm+xrdp、Firefox、kiosk 使用者 XFCE session、local desktop autologin、RDP passwordless opt-in，且不得修改 sshd password auth 或 sudoers 免密；驗證方式為 desktop fixture 與 `bash -n deploy/configure-lightweight-desktop.sh` 通過。
- [x] 3.5 實作 `Provide fixed desktop controls for readonly system maintenance`：安裝 `Enable Read Only System` 與 `Temporarily Disable Read Only System` 桌面 launcher 與固定 helper，啟用/解除 readonly root 都要求 sudo 並提示 reboot；驗證方式為 launcher fixture 與 shell syntax checks 通過。

## 4. Kiosk install、readonly gate 與文件

- [x] 4.1 實作 `Install and verify kiosk runtime on Ubuntu 24.04 Raspberry Pi`：bootstrap 對 supported host 安裝或確認 Node/pnpm、Firefox、service、kiosk launcher helpers、desktop re-entry launcher、XFCE+xrdp remote desktop，unsupported host 在變更前 fail closed；驗證方式為 preflight fixture 與現有 `deploy/verify-kiosk-install.sh` 相容測試通過。
- [x] 4.2 實作 `Readonly root 是 verification-gated optional apply` 與 `Gate readonly root apply behind successful verification`：沒有 `--apply-readonly` 時只 dry-run 或印出下一步；有 `--apply-readonly` 時必須先通過 service active、health、runtime writable、launcher checks 才呼叫 `deploy/enable-readonly-root.sh` apply，驗證方式為 readonly gate fixture 通過。
- [x] 4.3 [P] 撰寫 `docs/runbooks/raspi-onekey-kiosk-deploy.md`，包含新卡 init、日常 update、32G 測試卡與正式卡容量差異、root-full 拒絕原因、MQTT host 設定、XFCE+xrdp/Firefox/RDP passwordless 設定、SSH/sudo 仍需密碼、readonly desktop controls、readonly root apply/rollback 與人工驗證 checklist；驗證方式為內容 review 確認每個 spec requirement 名稱都有對應操作段落。

## 5. 整體驗證

- [x] 5.1 執行完整本地驗證：`node scripts/deploy.test.mjs`、`bash -n scripts/raspi-onekey-deploy.sh scripts/prepare-raspi-user-data.sh deploy/raspi-bootstrap.sh deploy/configure-lightweight-desktop.sh deploy/install-kiosk.sh deploy/enable-readonly-root.sh deploy/verify-kiosk-install.sh deploy/readonly-system-enable.sh deploy/readonly-system-disable.sh`、`spectra analyze add-raspi-onekey-kiosk-deploy --json`、`spectra validate add-raspi-onekey-kiosk-deploy` 皆通過，並記錄尚未在實機執行的項目。
- [x] 5.2 在測試 Pi 上執行 manual witness：先以 `--mode init --dry-run` 確認 layout，再以不套 readonly 的 init/update 流程驗證 health、service、desktop re-entry launcher、XFCE+xrdp/RDP passwordless、readonly desktop controls 與 MQTT host，最後做 readonly apply 並重開機驗證 root overlay 與 `/data` 可寫；驗證方式為回報每個遠端 check 的 `OK:`/`FAIL:` summary。2026-06-16 在 `kz@192.168.31.40` 完成；MQTT host 已設定為 `192.168.31.62`，但 broker `192.168.31.62:1883` 從 Pi 與開發機皆不可達，屬外部 broker/防火牆待處理。

## 6. First-login 維修工具與 deploy env

- [x] 6.1 [P] 擴充 first-boot helper 測試，覆蓋互動選單可輸入 `/data` 大小、產生 `solar-deploy.env`、產生可執行 `solar-first-login-tools.sh`，且 shell/PowerShell helper 都保留 `pi` 預設與可改成 `kz`。
- [x] 6.2 實作 first-boot helper：新增 `--data-size-gb`、`--mqtt-host`、`--skip-first-login-tools`、`--skip-nvm`，互動模式提示 `/data` 大小，寫出 `solar-deploy.env` 與最小維修工具+nvm 安裝腳本。
- [x] 6.3 更新部署文件與驗證：記錄第一次登入後執行 `sudo bash /boot/firmware/solar-first-login-tools.sh`，以及後續部署使用 `DATA_SIZE_GB`；驗證方式為 `node scripts/deploy.test.mjs`、shell syntax、`spectra analyze`、`spectra validate` 通過。
