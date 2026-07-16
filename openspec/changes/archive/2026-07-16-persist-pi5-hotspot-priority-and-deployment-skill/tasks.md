## 1. Hotspot policy 與部署管線

- [x] 1.1 以 TDD 實作「使用單一 target helper 管理 hotspot policy」與「部署期間只 enable 不啟動 timer」，交付 `Persist an operation-selected hotspot as the preferred Wi-Fi profile`、`Install the delayed hotspot trigger as persistent system state`：先在 `scripts/deploy.test.mjs` 加入 profile/priority/env/unit/idempotency/invalid-input fixtures 並確認 RED，再新增 `deploy/configure-hotspot-priority.sh` 使測試 GREEN；驗證 `node --test scripts/deploy.test.mjs --test-name-pattern='hotspot policy'` 通過。
- [x] 1.2 以 TDD 實作「operation-time hotspot inputs 由 one-key entrypoint 傳遞」，完整交付 `Provide a local Raspberry Pi kiosk deployment entrypoint`：先加入 `--hotspot-connection-id`、`--hotspot-scan-ssid`、`--hotspot-priority` 的 dry-run/forwarding/ordering RED fixtures，再讓 `scripts/raspi-onekey-deploy.sh`、`deploy/raspi-bootstrap.sh` 與 `deploy.sh` 在 requested policy 下安裝與呼叫 helper，且部署期間不切換 Wi-Fi；驗證 focused deploy tests 與 dry-run output。
- [x] 1.3 以 TDD 實作「verifier 以已寫入 env 作為預期值來源」，交付 `Verify hotspot policy from target state`：先加入 configured/pass、drift/fail、unconfigured/skip fixtures，再擴充 `deploy/verify-kiosk-install.sh` 檢查 profile SSID、autoconnect、priority、installed units 與 timer enabled；驗證 focused deploy tests 通過。

## 2. Repo-local deployment skill

- [x] 2.1 依 skill-creator 初始化並實作「repo-local skill 是 AI 執行入口而非文件複本」，交付 `Provide a repo-local Pi 5 deployment skill`、`Require evidence gates before and after live deployment`、`Require Wi-Fi priority and delayed-trigger evidence`：建立 `.agents/skills/pi5-deployment/SKILL.md` 與 `agents/openai.yaml`，將 `deploy.md` 保留為人類詳細 handoff 並補 skill 路由；驗證 `quick_validate.py`、openai metadata content check 與 `scripts/deploy.test.mjs` 的 required-gates assertion 通過。

## 3. 完整驗證與現場遷移

- [x] 3.1 依 Implementation Contract 的 `Behavior`、`Interface and data`、`Acceptance criteria`、`Scope boundaries` 對 artifacts 與實作執行 `spectra analyze persist-pi5-hotspot-priority-and-deployment-skill --json`、`pnpm verify` 與 `git diff --check`，確認規格、bundle、部署 helper、verifier 與 skill 無 placeholder/漂移且全部交付 gates 通過。
- [x] 3.2 依 Migration Plan 對 operation-time target `kz@100.99.99.2` 以 connection `Yishow`、SSID `Yishow`、priority `100` 執行 update，保存 verified backup；重開機後以 NetworkManager journal 證明初次可見時的優先 activation，或稍晚可見時由 trigger 從 fallback 自動切換，以 `nmcli` 證明 profile priority、以 systemd 證明 timer enabled，並確認 release、service、health、kiosk、thermal gates，任何 unrelated runtime blocker 分開回報。
