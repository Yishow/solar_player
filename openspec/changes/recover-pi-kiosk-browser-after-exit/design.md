## Context

現行 `start-solar-kiosk.sh` 由 XFCE XDG autostart 啟動，等待 server health 後以背景程序啟動 Firefox，寫入該圖形 session 的 PID file，隨即結束。2026-07-30 實機開機證據顯示 LightDM autologin、server health 與 Firefox 首次啟動成功；歷史 launcher log 同時出現 Firefox `Exiting due to channel error`，代表首次啟動後的瀏覽器退出沒有存活程序負責恢復。

`stop-solar-kiosk.sh` 是受信任管理操作的固定 host helper。恢復機制必須區分非預期 Firefox 結束與這個人工退出，否則既有 Device Status「退出 kiosk」會失效。Co-located kiosk 與 thin-kiosk 皆重用同一 launcher，因此修正必須留在既有 helper 邊界。

## Goals / Non-Goals

**Goals:**

- 在同一個圖形 session 中，Firefox 非預期退出後以固定退避重新啟動既有 kiosk URL。
- Server 暫時未健康時保留 launcher，持續以既有健康檢查窗口等待，而非永久放棄該次 autostart。
- 人工 kiosk exit 後停止恢復；使用者由桌面 launcher 再次啟動時恢復正常監看。
- 保留單 session PID 防重複、既有環境解析、FHD resolution、display sleep 與桌面 re-entry 行為。

**Non-Goals:**

- 不新增 systemd user/root service、timer、API、資料庫狀態或新依賴。
- 不修補 Firefox Snap mount namespace warning，也不修改 LightDM、XFCE、播放邏輯或 Pi 5 風扇曲線。
- 不將人工退出狀態跨 reboot 持久化；新圖形 session 的 autostart 必須能正常開頁。
- 不在本次 operation 更新 Solar Player application、Node.js runtime、資料庫或 runtime assets。

## Decisions

### 由既有 launcher 持有 Firefox lifecycle

`start-solar-kiosk.sh` 在啟動 Firefox 後等待該 child PID。Firefox 結束時，launcher 清理 PID file；若沒有人工退出訊號，記錄 exit status、固定等待 5 秒、重新進入 server health gate，再啟動同一 URL。

選擇既有 launcher 而非 systemd service，因為它已在正確的 XFCE session 中取得 DISPLAY、XDG runtime、D-Bus 與 Wayland 資訊；新增 systemd 圖形服務會複製 session discovery 並擴大安裝、解除安裝及權限面。

### 使用使用者 state directory 的人工退出 marker

`stop-solar-kiosk.sh` 在停止 Firefox 前原子建立 `${XDG_STATE_HOME:-$HOME/.local/state}/solar-display/kiosk-stop-requested`。監看中的 launcher 在 child 結束後看到 marker 即清理 PID file並正常退出，不再重開 Firefox。新的 `start-solar-kiosk.sh` invocation 在 lifecycle 開始前移除 marker，讓桌面 re-entry 與下一次 autostart 恢復監看。

選擇單一使用者 marker 而非 PID signal 或 API 參數，因為 stop helper 與 launcher 已共享同一 kiosk user/state directory，而 server 端固定 helper invocation 不需增加任意參數面。此 kiosk 契約同一時間只允許一個本機 display session；不為未要求的多 seat 狀態新增抽象。

Launcher 與 stop helper 另以目標 Ubuntu 24.04 essential `util-linux` 提供的
`flock` 協調「最後一次 marker 檢查、Firefox spawn、marker 建立與
Firefox stop」，避免人工退出落在檢查與 spawn 之間。這不新增安裝套件；
兩個 helper 都會在進入 lifecycle 前顯式驗證 `flock` 存在。

### 健康等待窗口逾時後退避再等待

保留現有 `KIOSK_WAIT_SECONDS` 每次健康檢查窗口與 log；窗口逾時不再結束整個 launcher，而是等待相同 5 秒 recovery delay 後開啟下一個窗口。如此 server 延遲超過單一窗口仍可恢復，且每秒 health probe 與固定退避維持低負載。

選擇持續等待而非提高單次 120 秒常數，因為固定更大數值仍會留下永久放棄的失敗窗，且無法適應維護期間的暫時不可用。

## Implementation Contract

**Observable behavior**

- XDG autostart 或桌面 launcher 啟動 kiosk helper 後，helper 必須保持存活並監看它啟動的 Firefox child。
- Firefox child 以任何 status 非人工結束時，helper 必須記錄該 status、等待預設 5 秒、重新通過既有 health gate，再以原 `KIOSK_URL` 啟動 Firefox。
- 單次 health window 達 `KIOSK_WAIT_SECONDS` 時，helper 必須記錄 timeout、等待 recovery delay，再開始新窗口；不得永久退出。
- 固定 stop helper 被呼叫時，必須先建立人工退出 marker，再停止 Firefox；監看 helper 看到 marker後必須正常退出且不得重啟 Firefox。
- 新的 launcher invocation 必須在啟動 lifecycle 前移除舊 marker，因此桌面 `Solar Display Kiosk` 能重新進入，reboot/autostart 不受上次人工退出影響。
- 偵測到同 session PID file 指向仍存活程序時，第二個 launcher invocation 必須維持既有行為：記錄並退出，不建立第二個監看 loop。

**Interface and state**

- 保留 `KIOSK_URL`、`KIOSK_HEALTH_URL`、`KIOSK_WAIT_SECONDS`、`KIOSK_START_DELAY` 與 `KIOSK_DISPLAY_OUTPUT` 介面。
- 新增可選 `KIOSK_RESTART_DELAY`，預設為 5 秒，僅控制 timeout／非預期退出後的退避。
- 人工退出 marker 固定為 `${XDG_STATE_HOME:-$HOME/.local/state}/solar-display/kiosk-stop-requested`；不得放入 repo、runtime DB 或 root-owned 路徑。

**Failure modes**

- Firefox 非零或零 status 非人工退出皆視為可恢復退出，因為 kiosk 的預期穩態是頁面持續顯示。
- Health 長期失敗時只按窗口記錄 timeout 並退避，不密集重啟 Firefox。
- Launcher 收到 session 結束而被系統終止時不保證跨 session 監看；下一次正常 autostart 負責新 session。

**Acceptance criteria**

- `scripts/deploy.test.mjs` 必須以隔離 fake commands 證明：Firefox 首次非預期退出後至少啟動第二次；stop marker 使監看 loop 結束且沒有第二次啟動；新 invocation 會清除 stale marker；health timeout 會開始下一個檢查窗口。
- `node --test scripts/deploy.test.mjs`、shell syntax checks 與 `pnpm verify` 必須通過。
- 選擇性部署 kiosk start/stop helper 與既有風扇設定後，reboot witness 必須顯示 LightDM autologin、`solar-display` active、`/health` 與 `/overview` 200、Firefox kiosk process 存活、launcher monitor process 存活。
- Reboot 後 Pi 5 thermal witness 仍須顯示 cooling state 至少 1 且 `fan1_input` 大於 0；此條只驗證既有風扇設定可運作，非本 change 的新風扇行為。
- 實機終止 Firefox child 後，launcher monitor 必須維持存活，並在退避與 health gate 後產生新的 Firefox PID；這是「開機後頁面消失可自行恢復」的 launch acceptance。

**Scope boundaries**

- In scope: kiosk start/stop helper、對應 deploy regression tests、同一 change 的 delta specs 與任務紀錄。
- Out of scope: server application 更新、Node.js runtime 更新、資料庫與 runtime assets、server API、web UI、playback route、Firefox/Snap 套件、LightDM/XFCE 設定、風扇曲線、readonly-root policy。

## Migration Plan

本次 operation 只把修改後的 `start-solar-kiosk.sh` 與 `stop-solar-kiosk.sh` 安裝到既有 deploy／host helper 位置，另執行 repo 既有 Pi 5 fan configuration helper；不得替換 application bundle、Node.js runtime、資料庫或 runtime assets。安裝前保留舊 helper 副本；若 launch witness 失敗，只需還原該副本並重啟圖形 session，不需回復整包 application。

若任何完整部署已在收斂範圍前啟動，必須先停止並從 verified backup 還原原 application，再進行上述選擇性安裝。驗收以 reboot 後服務／頁面／風扇 witness 與一次 Firefox 非預期退出後的新 PID 為準。

## Risks / Trade-offs

- [Risk] Firefox 命令把 URL 轉交給另一個既有 instance 後立即結束，造成 recovery loop → 既有 session PID guard 先阻止正常重複 invocation；測試與實機 witness 必須確認部署後只有一個 monitor 與 Firefox kiosk process。
- [Risk] 人工退出 marker 遺留 → 每個新的 launcher invocation 都先清除 marker，讓桌面 re-entry 與 reboot autostart恢復。
- [Risk] Server 長期失敗使 launcher 長時間存在 → health probe 保持每秒一次且每個窗口後固定退避，不建立額外 daemon 或快速 fork loop。
- [Risk] Stop helper 與 Firefox exit 競態 → stop helper 必須先寫 marker 再送出 `pkill`，監看端只在 child 結束後判斷 marker。
