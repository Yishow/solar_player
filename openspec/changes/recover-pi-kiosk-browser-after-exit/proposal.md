## Why

Pi kiosk 的桌面 autostart 目前只啟動一次 Firefox，launcher 在送出命令後立即結束；若 Firefox 因 Snap channel error 或啟動期異常退出，該次圖形 session 不會自動補開頁面。2026-07-30 的實機 boot 證據顯示 LightDM、server 與首次 Firefox 啟動均成功，但既有 launcher log 曾記錄 Firefox channel error，因此需要在既有 session 內補上有界的瀏覽器恢復行為。

## What Changes

- 讓既有 kiosk launcher 在 Firefox 非預期退出後等待短暫退避、重新確認 server health，再重啟同一 kiosk URL。
- 讓既有 kiosk stop helper 明確留下人工退出訊號，使 launcher 在受信任的退出操作後停止監看，不會立刻把 Firefox 拉回。
- 保留既有 LightDM autologin、健康等待、單 session 防重複啟動、桌面手動重返 kiosk 與 thin-kiosk 共用 helper 契約。
- 增加部署回歸測試，證明非預期退出會恢復、人工退出不會恢復，且重新手動啟動會清除先前退出狀態。

## Non-Goals

- 不新增 systemd daemon、timer、API 或背景資料收集器。
- 不修改 Firefox 套件、Snap mount namespace、LightDM、XFCE、播放輪播或頁面路由。
- 不改變 Pi 5 四段風扇曲線；本次 operation 僅套用既有風扇 helper 與驗證實機轉速。
- 不更新 Pi 上的 Solar Player application、Node.js runtime、資料庫或 runtime assets。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `raspi-onekey-kiosk-deployment`: 已安裝 kiosk 的 Firefox 非預期退出時，既有 launcher 必須在同一圖形 session 內有界退避並恢復頁面。
- `device-kiosk-exit-control`: 受信任的人工 kiosk exit 必須抑制自動恢復，直到使用者再次啟動 kiosk。

## Impact

- Affected specs: `raspi-onekey-kiosk-deployment`, `device-kiosk-exit-control`
- Affected code:
  - Modified: `deploy/start-solar-kiosk.sh`, `deploy/stop-solar-kiosk.sh`, `scripts/deploy.test.mjs`
  - New: none
  - Removed: none
- Affected systems: co-located Pi kiosk 與重用相同 launcher 的 Pi thin-kiosk；本次 operation 只選擇性安裝 kiosk start/stop helper 與既有風扇設定，不改 server application、API 或 runtime data。
