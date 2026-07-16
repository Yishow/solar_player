## 1. 必要套件安裝與 bootstrap gate

- [x] 1.1 以 TDD 完成「Install Tailscale as a standard deployment prerequisite」、「Install through a dedicated idempotent prerequisite helper」與「Run the prerequisite before application replacement」：先在 `scripts/deploy.test.mjs` 建立 Ubuntu 24.04 Noble fixture，證明目前缺少 helper、官方 keyring/source、readonly rejection、ready-state idempotence、online/offline bundle inclusion 與 executable mode、`systemctl enable --now tailscaled.service` 及 application replacement 前排序契約會失敗，再新增 `deploy/install-tailscale.sh`、更新 `deploy.sh` 並串接 `deploy/raspi-bootstrap.sh`；以 targeted node test 與 `bash -n deploy/install-tailscale.sh deploy/raspi-bootstrap.sh deploy.sh` 證明成功、失敗與不執行 enrollment 的案例。

## 2. 本機 readiness verification 與 dry-run

- [x] 2.1 以 TDD 完成「Verify local Tailscale readiness separately from tailnet enrollment」與「Verify local readiness without requiring enrollment」：先擴充 `scripts/deploy.test.mjs` fixture，證明 CLI 缺少、unit disabled、unit inactive 會使 `deploy/verify-kiosk-install.sh` fail，而 CLI present、unit enabled/active 且 `NeedsLogin`/無 IP 仍 pass，再最小修改 verifier；同時完成「Keep dry-run and documentation explicit」的 dry-run 行為部分，證明 `scripts/raspi-onekey-deploy.sh --dry-run` 顯示 Tailscale prerequisite 且不執行 package/service/enrollment mutation，並以 targeted node test 驗證。

## 3. 操作者 handoff 與交付 gates

- [x] 3.1 完成「Keep dry-run and documentation explicit」的文件部分：更新 `deploy.md` 與 `docs/runbooks/raspi-onekey-kiosk-deploy.md`，明確記錄 daemon readiness、`NeedsLogin` enrollment handoff、control-plane-assigned IP、operation-time `SSH_TARGET`、readonly disable/reboot 前置與 repo 不保存 auth key；以 documentation content test、完整 `node --test scripts/deploy.test.mjs`、`pnpm verify`、`spectra analyze add-tailscale-deployment-prerequisite --json` 與 `spectra validate add-tailscale-deployment-prerequisite` 驗證，且 Critical/Warning 必須為 0。
