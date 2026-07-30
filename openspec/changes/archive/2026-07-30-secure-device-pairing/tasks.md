## 1. Pairing Token 與 Credential TDD

- [x] 1.1 先為 Issue short-lived single-use Pairing Tokens、Store and deliver opaque Device Credentials safely、Revalidate and revoke credentials 寫 failing route tests；直跑 src/routes/device-pairing.test.ts 驗證 15 分鐘、single-use race、hash-only、invalid-token、Cookie 與 re-pair cases。
- [x] 1.2 實作 Store only hashes and return secrets once 與 Exchange the token transactionally，使 token/credential schema 可重跑且競爭交換只有一個成功；以 migration test 與 parallel exchange test 驗證。
- [x] 1.3 實作 Deliver identity through a dedicated cookie 與 Revalidate device state on every authenticated context，使 solar_device_credential 具正確 attributes、remote HTTPS/trusted-proxy boundary，且 disabled/revoked/expired/malformed-expiry fail closed；以 Fastify inject Cookie contract test 驗證。

## 2. Kiosk 與管理邊界

- [x] 2.1 [P] 實作 Persist the Device Cookie in a dedicated Firefox Profile 與 Keep persistent Profile state on a writable root，讓 installer 不用 private-window、在 migrate mutation 前拒絕 overlayroot、清除 stale readonly launcher，且 verify script 能 read-back Profile owner/0700；以 deploy/verify-thin-kiosk.sh 的 controlled fixture 驗證。
- [x] 2.2 [P] 實作 Protect Device pairing administration with the management mutation boundary，讓 issue/revoke/re-pair 拒絕 playback caller；以 management auth route tests 驗證。
- [x] 2.3 以 TDD 實作 Pair through a fragment-only browser landing page 與 Cookie-authenticated status read-back，並更新 thin-kiosk runbook 說明首次 pairing、Cookie 跨重啟與 re-pair recovery；以 route contract test 與 fresh operator read-back 檢查命令及 observable result。

## 3. 整體驗證

- [x] 3.1 執行 focused server/deploy tests、pnpm test、pnpm build、pnpm verify 與 spectra analyze secure-device-pairing，修正所有 Critical/Warning。
