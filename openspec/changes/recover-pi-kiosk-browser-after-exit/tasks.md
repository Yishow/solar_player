## 1. Red tests 與 helper 實作

- [x] 1.1 先在 `scripts/deploy.test.mjs` 建立會失敗的隔離 fake-command tests，完整覆蓋 `Keep the kiosk browser recoverable within the graphical session` 與 `Preserve intentional kiosk exit while browser recovery is active`：驗證 Firefox 非預期退出後第二次啟動、health window timeout 後新窗口、人工 stop marker 阻止第二次啟動、下一次 invocation 清除 stale marker；執行 `node --test scripts/deploy.test.mjs` 並確認新 cases 在 source 修改前為 red。
- [x] 1.2 依「由既有 launcher 持有 Firefox lifecycle」與「健康等待窗口逾時後退避再等待」決策修改 `deploy/start-solar-kiosk.sh`，使單一 session monitor 等待 child、以 `KIOSK_RESTART_DELAY` 退避並重新通過 health gate，同時維持 live PID 防重複；以 task 1.1 的 recovery／timeout cases 轉 green 並執行 `bash -n deploy/start-solar-kiosk.sh`。
- [x] 1.3 依「使用使用者 state directory 的人工退出 marker」決策修改 `deploy/stop-solar-kiosk.sh` 與 launcher startup，使 stop helper 先寫 marker、monitor 不重啟、下一個 launcher 清除 marker；以 task 1.1 的 intentional-exit／stale-marker cases 轉 green並執行 `bash -n deploy/stop-solar-kiosk.sh`。

## 2. Repo 與實機交付驗證

- [x] 2.1 驗證 helper 沒有擴張到 systemd、API、LightDM、播放或風扇曲線，且 co-located/thin-kiosk 共用契約通過：執行 `node --test scripts/deploy.test.mjs`、`git diff --check`、`spectra analyze recover-pi-kiosk-browser-after-exit --json` 與 `pnpm verify`，所有指令須成功。
- [ ] 2.2 依 `Migration Plan` 選擇性安裝 kiosk start/stop helper 並套用 repo 既有 Pi 5 fan configuration，不更新 Solar Player application、Node.js runtime、資料庫或 runtime assets；reboot witness 必須顯示 `solar-display`、LightDM autologin、`/health`、`/overview`、Firefox kiosk process 與 launcher monitor 正常，Pi 5 cooling state 至少 1 且 `fan1_input` 大於 0，並以終止 Firefox child 後出現新 PID 證明自動恢復，最後回報 helper rollback path 與 launch acceptance 證據。
