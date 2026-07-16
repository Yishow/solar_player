## 1. Scope routing 與 app update

- [x] 1.1 以 TDD 交付「使用單一 scope 參數區分 app update 與 full deploy」及 `Select application update or full deployment scope`：先在 `scripts/deploy.test.mjs` 加入 update 預設 app、init 預設 full、explicit forwarding 與 host-option conflict 的 RED fixtures，再修改 `scripts/raspi-onekey-deploy.sh` 使 focused scope tests GREEN，並確認 dry-run 清楚列出不同行為。
- [x] 1.2 以 TDD 交付「app update 共用備份與 bundle replacement 但走獨立完成門檻」及 `Perform a minimal installed-application update`：先加入 backup-before-copy、service/health/release verification 與 host helper exclusion fixtures，再修改 `deploy/raspi-bootstrap.sh`，驗證 app scope 不執行 apt、Tailscale、env、desktop、kiosk、hotspot、readonly、full verifier 或 reboot，且缺少既有 prerequisite 時 fail closed。

## 2. Skill 與文件路由

- [x] 2.1 交付「full deploy 保留既有主機層流程與 reboot witness」、「dirty test build 必須誠實標記並限制用途」及 `Route deployment requests by operational scope`：更新 `.agents/skills/pi5-deployment/SKILL.md` 與 `deploy.md`，讓目前程式變更到測試 Pi 預設走 app scope、主機層需求走 full scope；以 skill validation、metadata content check 與 deploy required-gates test 驗證。

## 3. 驗證與測試 Pi 更新

- [x] 3.1 依 Implementation Contract 的 `Behavior`、`Interface and data`、`Acceptance criteria` 與 `Scope boundaries` 執行 `spectra analyze split-pi5-full-deploy-and-app-update --json`、`spectra validate split-pi5-full-deploy-and-app-update`、focused deploy tests、`pnpm verify` 與 `git diff --check`，確認 scope interface、failure modes、full regression 與 scope boundaries 全部通過。
- [x] 3.2 使用 app scope 將使用者明確要求的目前 dirty worktree 全部部署到 operation-time 測試 Pi，保存 verified backup；驗證 remote manifest `sourceDirty=true`、base commit、service active、`/health` 與 overview HTTP，並證明未執行 reboot 或 full host deployment gates。
