## Context

目前 repo 已有 root `deploy.sh` 產生 online/offline bundle，並有 `deploy/install-kiosk.sh`、`deploy/enable-readonly-root.sh`、`deploy/verify-kiosk-install.sh` 處理 kiosk service、desktop launcher 與 overlayroot。這些工具能支援單機部署，但新 Raspberry Pi 5 Ubuntu Server 卡片仍需要人工串接 SSH/sudo、/data 分割、Node/pnpm、圖形 kiosk 套件、MQTT .env、部署與 readonly root 啟用。

新需求來自現場會反覆把不同容量的 SD 卡或正式機重新安裝。32G 測試卡與正式卡容量不同，磁碟 layout 不可寫死；同時分割與 readonly root 屬高風險操作，不能變成無檢查的遠端命令。

## Goals / Non-Goals

**Goals:**

- 提供一個從開發機執行的部署入口，可對 `pi@<pi-ip>` 或專案測試卡 `kz@<pi-ip>` 進行 preflight、bundle build/upload、目標端 bootstrap、install、restart 與 verification。
- 提供互動式 first-boot `system-boot/user-data` helper，讓新卡可不用記 YAML 或 cloud-init schema 就建立 `pi` sudo user、安裝 SSH，並保留 `su -` 的本機 root 密碼路徑。
- 把新卡初始化與日常更新分開：新卡初始化有互動磁碟 gate，日常更新可一鍵且不得改動磁碟。
- 讓磁碟流程依目標卡容量與現有分割狀態決定可執行動作，並在 root 已吃滿整張卡時拒絕線上 shrink。
- 保留現有 `/data/solar-display` runtime 假設，並讓 `.env`、SQLite data、logs、uploads 在日常更新中保持不被覆蓋。
- 安裝並設定輕量桌面與 RDP：Ubuntu Server 採 XFCE + xrdp，Firefox 作為 kiosk 主瀏覽器，RDP 進桌面不要求現場人員輸入密碼，SSH 與 sudo 仍要求系統密碼。
- 實體 HDMI/本機桌面採 lightdm 自動登入 kiosk 使用者，不要求輸入桌面登入密碼；系統層安裝與 sudo 仍需要密碼。
- 在 kiosk 使用者桌面放置 readonly system 維護捷徑：啟用 readonly root 與暫時解除 readonly root；兩者都透過固定 helper 執行，並在需要變更 host 設定時要求 sudo 密碼。
- 把 readonly root 放在最後的可選步驟，且必須通過 service health 與 kiosk install verification 後才允許 apply。

**Non-Goals:**

- 不改現有 web/server runtime API、播放頁、管理頁或 MQTT 資料模型。
- 不實作線上 root 分割區 shrink，也不自動搬移未知分割區上的資料。
- 不用腳本取代 Ubuntu image 燒錄工具；cloud-init boot 分割區準備仍是另一個前置流程。
- 不把 SSH 密碼、MQTT 密碼或 Wi-Fi 密碼寫死到 repo。
- 不讓 RDP 免密擴大到 SSH、sudo 或任意 Linux 使用者；免密桌面只服務 kiosk 使用者。
- 不要求每次部署都啟用 readonly root；施工與測試可保持 writable root。

## Decisions

### 新增單一遠端部署入口並保留既有 bundle 流程

新增 `scripts/raspi-onekey-deploy.sh` 作為操作者記得住的入口。它負責 local build、SSH preflight、bundle upload、呼叫目標端 helper、重新啟動服務與顯示 verification summary。它不取代 root `deploy.sh`，而是重用 root `deploy.sh` 產生的 deploy bundle，避免同一份 bundle 規則分裂。

部署入口預設從 SSH target 推導 kiosk 使用者，例如 `pi@<host>` 會部署給 `pi`，`kz@192.168.31.39` 會部署給現有測試卡的 `kz`。需要特殊情況時可用 `--kiosk-user <user>` 覆蓋。

替代方案是擴充 root `deploy.sh` 為所有部署入口，但 root `deploy.sh` 已經是 online/offline bundle selector；把遠端 SSH、磁碟初始化與 readonly root 全塞進同一選單會讓原本簡單的打包行為變難測。

### First-boot user-data 準備採互動選單

新增 `scripts/prepare-raspi-user-data.sh` 與 `scripts/prepare-raspi-user-data.ps1`。無參數執行時進入互動選單，預設 `system-boot` path、hostname、Linux user、user password、root password、timezone 與是否 package upgrade。預設 Linux user/password 為 `pi/pi`；`kz` 只作為目前專案測試卡覆蓋值。

腳本會備份原始 `user-data`，寫入 cloud-init `users`、`chpasswd.users`、`growpart.mode: off`、`resize_rootfs: false`、`package_update`、`packages: [sudo, openssh-server, avahi-daemon]`、SSH password auth 與 `runcmd` 啟用 SSH/avahi。停用 first-boot root auto-grow 是必要條件，否則 64G 卡第一次開機後 root 可能吃滿整張卡，後續一鍵部署無法線上 shrink root 建立 `/data`。它不得啟用 root SSH login，也不得把 sudo 改成免密。

同一個互動流程也會詢問 `/data` 目標大小，預設 10GiB，並寫出 `solar-deploy.env` 供後續部署命令讀取。`scripts/raspi-onekey-deploy.sh` 在 init 模式會從 Pi 的 `/boot/firmware/solar-deploy.env` 讀取 `DATA_SIZE_GB` 與 `MQTT_HOST`，但明確 CLI 參數仍優先。為了讓第一次進系統後能快速安裝維修工具，但不讓 cloud-init 因網路或 GitHub 下載卡住，helper 另產生 `solar-first-login-tools.sh` 到 boot partition。這個腳本由操作者第一次登入後手動執行，安裝最小維修工具與 nvm，且可重跑。

### 目標端 bootstrap helper 負責 host-specific 操作

新增 `deploy/raspi-bootstrap.sh`，由遠端 Pi 執行。它負責讀取 host 狀態：Ubuntu 版本、CPU 架構、sudo、`lsblk`/`findmnt`、`/data`、Node/pnpm、kiosk 套件、systemd 與 overlayroot。local script 只傳入明確參數，例如 install dir、MQTT host、模式與 root/data layout 選擇。

替代方案是在 local script 直接拼所有遠端命令。這會讓 quote/錯誤處理/測試很脆弱，也不利於日後在 Pi 上直接跑 dry-run。

### 磁碟初始化採互動選單與安全拒絕

磁碟選單列出目標 disk、總容量、分割區、mountpoint、root 分割區大小、是否已有 `/data`。允許的自動路徑只有兩種：沿用已存在且可寫的 `/data`，或在 root 未吃滿且磁碟尾端有未分配空間時建立新 `/data` 分割區。新卡部署預設固定 `/data` 為 10GiB，root 使用前段剩餘空間；若操作者明確傳 `--root-size-gb` 才改用 root target size。若 root 已吃滿整張卡，腳本必須停止並說明要重燒、預先關閉 growpart、或使用人工 offline resize。

替代方案是使用 growpart/parted/resize2fs 自動調整 root 大小，但線上 shrink ext4/root 風險高且不可在 kiosk 現場當成一鍵流程。

### 日常部署模式不得觸碰磁碟與 runtime state

日常部署以 `--mode update` 或等效選項執行，明確跳過 disk setup。它只更新應用 bundle 與 deploy helpers，保留 `.env`、`data`、`logs`、`uploads/images`、`uploads/brand`，接著安裝 production dependencies、restart `solar-display`、呼叫 health endpoint 與 verify script。

替代方案是每次重新建立 install dir。這會增加 SQLite、uploads 與現場設定遺失風險，不符合 kiosk 長期維護需求。

### Readonly root 是 verification-gated optional apply

readonly root 仍由 `deploy/enable-readonly-root.sh` 控制。新的入口只在 `solar-display` active、health endpoint 成功、runtime write paths 可寫、desktop launcher/autostart 存在時，才允許以明確 `--apply-readonly` 或互動確認啟用。未指定時只做 dry-run，回報下一步。

替代方案是部署完成後自動套用 overlayroot。這會讓部署失敗後修復成本變高，也不適合測試卡與施工階段。

### 桌面維護捷徑只包固定 readonly helper

部署會在 kiosk 使用者桌面新增兩個 launcher：`Enable Read Only System.desktop` 與 `Temporarily Disable Read Only System.desktop`。launcher 只執行 repo 提供的固定 helper，不接受任意 command 或參數。啟用 helper 呼叫既有 `deploy/enable-readonly-root.sh` 的 apply path；暫時解除 helper 只把 overlayroot 設定改成 disabled 並提示 reboot，若目前已在 overlayroot 中則使用 `overlayroot-chroot` 對 lower root 寫入設定。

替代方案是在文件中要求 SSH 手動執行指令，但使用者已要求桌面入口，且 RDP 桌面會成為現場維修路徑。用固定 helper 比讓桌面捷徑直接執行可編輯 shell command 安全。

### XFCE 加 xrdp 作為輕量遠端桌面

Ubuntu Server 上不安裝 GNOME，改安裝 `xfce4`、`lightdm`、`xrdp`、`xorgxrdp`、Firefox 與必要的 X session 支援。實體畫面由 lightdm autologin 進入 kiosk 使用者的 XFCE session，RDP 只提供維修桌面與 kiosk re-entry，不承擔展示主流程；展示主流程仍由 systemd service 與 Firefox kiosk launcher 負責。

RDP 免密需求用明確的 `--rdp-auth passwordless` 模式處理，針對 kiosk 使用者渲染 xrdp autologon 設定與 XFCE session。此模式不得改 SSH daemon 設定，不得改 sudoers 免密，不得解除 kiosk 使用者的系統密碼。因 xrdp 設定會包含可用於 kiosk 使用者登入的 credential material，檔案必須 root-owned 且只適用公司受控網段。

替代方案是保留 GNOME + GDM + xrdp，現場已證實 GNOME Shell 對 Pi 5 太重；另一個替代方案是完全不支援 RDP，只用 SSH 維護，但使用者需要桌面 re-entry，因此第一版採 XFCE + xrdp。

## Implementation Contract

**Behavior:**

- 操作者可從開發機執行 `scripts/raspi-onekey-deploy.sh pi@<pi-ip>` 或 `scripts/raspi-onekey-deploy.sh kz@192.168.31.39`，腳本先顯示目標主機、模式、install dir、MQTT host、bundle 類型、kiosk user 與是否會碰磁碟。
- 操作者可用 `scripts/prepare-raspi-user-data.sh` 或 `.ps1` 的互動選單準備 first-boot cloud-init；一路接受預設值會建立 `pi` sudo user、安裝 `openssh-server`、設定 root local password，且 root SSH login 保持 disabled。
- first-boot helper 會詢問 `/data` partition size，預設 `10`，並寫出 `solar-deploy.env`，其中至少包含 `DATA_SIZE_GB=<value>`、`KIOSK_USER=<user>`、`MQTT_HOST=192.168.31.62`。
- init deploy 若未明確傳入 `--data-size-gb` 或 `--mqtt-host`，會從 `/boot/firmware/solar-deploy.env` 採用 first-boot helper 產生的值。
- first-boot helper 可產生 `solar-first-login-tools.sh`，腳本安裝最小維修工具與 nvm；這些動作不得放進 cloud-init 自動執行。
- `--mode init` 會在目標 Pi 執行完整 preflight 與互動式磁碟 gate；`--mode update` 只做日常應用更新並拒絕執行磁碟分割。
- `--dry-run` 會顯示將執行的 local/remote 階段與目標端檢查結果，但不得 build/upload/apply system changes。
- `--skip-disk` 可在 init 模式沿用既有 `/data`；若 `/data` 不存在或不可寫，腳本必須失敗。
- `--mqtt-host 192.168.31.62` 會在首次建立 `.env` 時寫入 MQTT broker host；若目標已有 `.env`，腳本必須保留現有 `.env` 並提示未覆蓋。
- `--apply-readonly` 只能在 verification 成功後呼叫 readonly root apply；沒有此參數時 readonly root 只做 dry-run。
- `--desktop xfce-xrdp` 會安裝 XFCE + xrdp；`--rdp-auth passwordless` 會讓 RDP 進入 kiosk 使用者桌面不需要現場輸入密碼。SSH 與 sudo 驗證不得因此被停用。
- Firefox 必須存在於目標機並作為 `start-solar-kiosk.sh` 的主 browser；bootstrap 若找不到 Firefox 必須安裝或 fail with message。
- lightdm 必須設定 kiosk 使用者 autologin，讓實體桌面開機後不要求輸入登入密碼；這不得新增 sudo NOPASSWD。
- 桌面會提供 `Enable Read Only System.desktop` 與 `Temporarily Disable Read Only System.desktop`；點擊後開啟終端執行固定 helper，並在需要套用或解除 readonly root 時要求 sudo 密碼。

**Interface / data shape:**

- Local CLI: `scripts/raspi-onekey-deploy.sh <user@host> [--mode init|update] [--install-dir /data/solar-display] [--mqtt-host <ip-or-host>] [--bundle online|offline] [--desktop xfce-xrdp|none] [--rdp-auth passwordless|system-password] [--rdp-password <password>] [--sudo-password <password>] [--kiosk-user <user>] [--dry-run] [--skip-disk] [--apply-readonly] [--create-data-partition] [--data-size-gb <gb>] [--root-size-gb <gb>]`。
- First-boot CLI: `scripts/prepare-raspi-user-data.sh [--interactive] [--boot-path <path>] [--hostname <name>] [--user <name>] [--password <password>] [--root-password <password>] [--timezone <tz>] [--package-upgrade] [--data-size-gb <gb>] [--mqtt-host <host>] [--skip-first-login-tools] [--skip-nvm]` and PowerShell equivalent。
- Remote helper CLI: `deploy/raspi-bootstrap.sh --mode init|update --install-dir <path> --mqtt-host <host> --bundle-dir <path> [--desktop xfce-xrdp|none] [--rdp-auth passwordless|system-password] [--rdp-password <password>] [--kiosk-user <user>] [--dry-run] [--skip-disk] [--apply-readonly] [--create-data-partition] [--data-size-gb <gb>] [--root-size-gb <gb>]`。
- Desktop helper CLI: `deploy/configure-lightweight-desktop.sh --user <kiosk-user> --desktop xfce-xrdp|none --rdp-auth passwordless|system-password [--rdp-password <password>] [--dry-run]`。
- Verification summary prints named checks with `OK:` or `FAIL:` prefixes, matching the existing `deploy/verify-kiosk-install.sh` style.

**Failure modes:**

- SSH connection failure, missing sudo, unsupported OS/architecture, missing `/data` in update mode, unwritable runtime paths, service health failure, or kiosk verification failure must exit non-zero with a concrete message naming the failed check.
- If root partition consumes the full disk and `/data` is absent, init mode must exit non-zero and must not run partition shrink commands.
- If target `.env` already exists, deployment must preserve it and print that MQTT defaults were not overwritten.
- If RDP passwordless is requested without a password source, deployment must fail before changing xrdp config and explain that SSH/sudo remain password-protected.
- If desktop mode is `none`, deployment must skip xrdp package/config changes and still install the kiosk service.
- If readonly root preflight fails, deployment must leave root writable and print the failed condition.
- If a desktop readonly helper cannot find `overlayroot-chroot` while trying to disable an active overlayroot system, it must fail with a concrete message and leave the current readonly setting unchanged.

**Acceptance criteria:**

- `scripts/deploy.test.mjs` covers bundle inclusion for the new helper, executable bits, dry-run output, `.env` preservation behavior, and disk refusal text for root-full layouts.
- `scripts/deploy.test.mjs` covers the first-boot user-data helpers, including interactive defaults for `pi`, SSH package install, root local password, backup creation, growpart/resizefs disabled, and root SSH disabled.
- `scripts/deploy.test.mjs` covers first-boot deploy env generation, configurable `DATA_SIZE_GB`, and first-login tools generation for both shell and PowerShell helpers.
- `scripts/deploy.test.mjs` covers XFCE/xrdp dry-run output, RDP passwordless opt-in behavior, and the rule that SSH/sudo authentication is not disabled.
- `scripts/deploy.test.mjs` covers readonly desktop launcher installation and verifies those launchers invoke fixed helper paths rather than arbitrary commands.
- Shell syntax checks pass for `scripts/raspi-onekey-deploy.sh`, `scripts/prepare-raspi-user-data.sh`, `deploy/raspi-bootstrap.sh`, and `deploy/configure-lightweight-desktop.sh`.
- Existing deploy helper tests continue to pass.
- Manual verification on a Pi can run init without readonly first, confirm `solar-display` health, confirm kiosk launcher installation, then run readonly dry-run before explicit apply.

**Scope boundaries:**

- In scope: shell scripts, deploy bundle contents, first-boot `user-data` helpers, XFCE/xrdp host setup, readonly desktop launchers, runbook, deployment defaults, deploy tests, and small adjustments to existing deploy helpers needed for composition.
- Out of scope: UI changes, server API changes, database schema changes, MQTT ingestion behavior, browser page design, and automated image flashing.

## Risks / Trade-offs

- [Risk] SD card partition layouts vary across images and prior installs → Mitigation: print the detected layout, only support known safe cases, and fail closed for root-full/no-free-space layouts.
- [Risk] Installing kiosk graphical packages and Firefox on Ubuntu Server can differ between Pi images → Mitigation: keep package install idempotent, report missing packages explicitly, and document the supported Ubuntu 24.04 arm64 target.
- [Risk] RDP passwordless access weakens desktop login security on the LAN → Mitigation: restrict the behavior to an explicit RDP mode for the kiosk user, keep SSH/sudo password-protected, keep xrdp config root-owned, and document it as company-LAN-only.
- [Risk] Readonly root makes post-deploy repair harder → Mitigation: require verification before apply and default to readonly dry-run.
- [Risk] SSH password deployment can expose credentials in shell history → Mitigation: accept normal SSH config/agent usage and avoid storing passwords in repo or generated files.
- [Risk] New one-key script can drift from existing bundle behavior → Mitigation: reuse root `deploy.sh` output and extend `scripts/deploy.test.mjs` to validate shipped helper contents.

## Migration Plan

1. Implement and test the new scripts locally with dry-run fixtures and shell syntax checks.
2. Run update mode against an already prepared Pi with `/data/solar-display` and verify service health.
3. Run init mode against a test 32G Pi card without readonly apply, verify `/data`, service, kiosk autostart and desktop re-entry.
4. Run readonly dry-run, then explicit readonly apply only after successful verification.
5. If deployment fails before readonly apply, rerun update mode after fixing the reported check. If readonly apply causes boot issues, boot with the card mounted externally or recovery environment and remove `/etc/overlayroot.local.conf`.

## Open Questions

- 正式上機卡的目標 root 保留大小要採預設 12G 還是 16G；第一版可提供選單，不把值寫死。
- 正式 kiosk 瀏覽器要沿用 Firefox 還是改為更輕量的 Chromium/Openbox 組合；第一版以現有 helper 支援的 Firefox kiosk 為預設，避免同時換瀏覽器堆疊。
