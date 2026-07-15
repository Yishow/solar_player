## 1. 四檔 boot profile helper

- [x] 1.1 以 TDD 完成「Persist the verified Pi 5 four-stage fan profile」與「Use a managed boot-config block before dtoverlay」：先在 `scripts/deploy.test.mjs` 建立 temporary model/config fixtures，證明 helper 會在第一個 `dtoverlay=` 前建立唯一 managed block、寫入 12 個約定值、保留 unrelated lines、重跑 idempotent、非 Pi 5 no-op、Pi 5 config error fail closed，再實作 `deploy/configure-pi5-fan-control.sh` 使 targeted `node --test scripts/deploy.test.mjs` 通過。

## 2. Installer、bundle 與 runtime verification

- [x] 2.1 以 TDD 完成「Include Pi 5 thermal configuration in kiosk installation」與「Integrate thermal configuration through kiosk installation and verification」：先加入 bundle-required-file、executable helper、installer fail-closed invocation fixtures，再修改 `deploy.sh` 與 `deploy/install-kiosk.sh`，以 `node --test scripts/deploy.test.mjs` 證明每個 Pi kiosk bundle 都包含 helper 且 helper failure 不能被後續 health success 掩蓋。
- [x] 2.2 以 TDD 完成「Verify the boot and runtime thermal contract」：先加入 boot profile 與 sysfs fixture assertions，再擴充 `deploy/verify-kiosk-install.sh`，使 Pi 5 上的 managed values、`pwm-fan`、`max_state=4`、`mode=enabled`、`policy=step_wise` 與四個 trip points 任一不符都以既有 `FAIL:` 聚合及 nonzero 結束；以 `node --test scripts/deploy.test.mjs` 驗證。

## 3. Operation-time SSH target 文件契約

- [x] 3.1 以 TDD 完成「Resolve the Raspberry Pi connection target at operation time」與「Keep connection targets operation-scoped」：先加入 documentation fixture 拒絕 Pi SSH/RDP/health/reboot command context 的 numeric fixed target，再將 `deploy.md` 與 `docs/runbooks/raspi-onekey-kiosk-deploy.md` 改為先設定 `PI_HOST`/`SSH_TARGET` 並全程重用，保留且明確標示 MQTT broker 為 dependency address；以 `node --test scripts/deploy.test.mjs` 與 `rg` content review 驗證。

## 4. Deploy fixture 與 artifact gates

- [x] 4.1 完成「Test the managed block and wiring through deploy fixtures」整體回歸：執行 `node --test scripts/deploy.test.mjs`、`pnpm verify`、`spectra analyze deploy-pi5-four-stage-fan-control --json` 與 `spectra validate deploy-pi5-four-stage-fan-control`，修正本 change 導致的所有失敗並引用各 gate 真實輸出。

## 5. 現場 Pi 5 部署與 reboot witness

- [x] 5.1 依 Migration Plan 使用操作者本次指定的 operation-time SSH target 部署新版 bundle，確認 managed block 後執行一次 controlled reboot；重新連線後執行 kiosk verification 與 thermal sysfs witness，證明 `mode=enabled`、`policy=step_wise`、`pwm-fan max_state=4`、四個 trip points與 boot block 全部一致，且 `/health` 與 playback pages 保持正常。
