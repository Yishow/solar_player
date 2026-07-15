## 1. Always-active boot profile

- [x] 1.1 以 TDD 完成「Persist the verified Pi 5 four-stage fan profile」與「Use an always-active first thermal trip instead of a userspace timer」：先將 `scripts/deploy.test.mjs` 的 managed block example 改為 `(0,5000,75)` 並證明舊 `50000` profile 失敗，再修改 `deploy/configure-pi5-fan-control.sh`；以 targeted `node --test scripts/deploy.test.mjs` 驗證唯一 block、idempotence、unrelated lines 與非 Pi 5 behavior 不退化。

## 2. Runtime floor 與 RPM verification

- [x] 2.1 以 TDD 完成「Verify the boot and runtime thermal contract」與「Verify both requested state and physical fan motion」：先加入 thermal/hwmon fixtures，證明 `cur_state=0`、RPM 0、缺少 RPM input 與舊 trip 50000 均 fail，再擴充 `deploy/verify-kiosk-install.sh` 的 path override 與既有 `FAIL:` aggregation；以 targeted 與完整 `node --test scripts/deploy.test.mjs` 驗證。

## 3. Deployment contract 與 live witness

- [x] 3.1 完成「Keep deployment and rollback inside the existing managed block」：更新 `deploy.md` 與 `docs/runbooks/raspi-onekey-kiosk-deploy.md`，說明最低檔由 0 m°C trip 交給 kernel governor、reboot 後 20 秒驗證 state/RPM、rollback 恢復 50000；以 documentation content test、`pnpm verify`、`spectra analyze keep-pi5-fan-lowest-stage-running --json` 與 `spectra validate keep-pi5-fan-lowest-stage-running` 驗證。
- [x] 3.2 使用操作者本次指定的 operation-time SSH target 執行 one-key update 與 controlled reboot，從 SSH 恢復起算在 20 秒內取得 `cur_state >= 1`、RPM > 0、active trips `0/60000/67500/75000`，並執行 kiosk verification 與 `/health`；任一 gate 失敗即依 Migration Plan 恢復第一個 trip 50000 後重開機。
