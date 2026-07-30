## Why

Device／Group 存在後，thin kiosk 仍缺少可跨重啟保存且不能由前端 JavaScript 讀取的正式身份。一次性 Pairing Token 與可撤銷 Device Credential 能在可信內網完成現場配對，而不把長期密鑰留在 URL 或資料庫明文。

## What Changes

- 管理端可為已建立 Device 產生短效、單次使用的 Pairing Token。
- 管理端取得不把 token 傳進 HTTP request 的 fragment pairing path，thin kiosk 由同源 landing page 完成 exchange。
- Pairing exchange 成功後立即消耗 token，簽發 opaque Device Credential，Server 僅保存兩者 hash。
- Credential 透過 HttpOnly、SameSite Cookie 傳遞；正式 HTTPS 部署加上 Secure。
- 重新配對撤銷舊 Credential；停用 Device 或失效 Credential 不得取得 authenticated client context。
- thin kiosk 使用專用 Firefox Profile 保存 Cookie，移除 private-window 依賴。
- 補齊 expiration、single-use、invalid-token、revocation、disabled-device 與 cookie attribute contract tests。

## Capabilities

### New Capabilities

- secure-device-pairing: 定義 Pairing Token、Device Credential、Cookie 與撤銷生命週期。

### Modified Capabilities

- pi-thin-kiosk-mode: thin kiosk 改以專用 Firefox Profile 保存 Device Cookie。
- management-api-access-boundaries: Device 配對管理操作沿用既有 management mutation trust boundary。

## Impact

- Affected specs: secure-device-pairing, pi-thin-kiosk-mode, management-api-access-boundaries
- Affected code:
  - New: apps/server/src/db/migrations/030_device_pairing_credentials.sql, apps/server/src/services/deviceCredentialService.ts, apps/server/src/routes/device-pairing.ts, apps/server/src/routes/device-pairing.test.ts, packages/shared/src/devicePairing.ts
  - Modified: apps/server/src/app.ts, packages/shared/src/index.ts, deploy/install-thin-kiosk.sh, deploy/verify-thin-kiosk.sh, docs/runbooks/pi-thin-kiosk-deploy.md
  - Removed: none
