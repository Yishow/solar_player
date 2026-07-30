## Context

此 change 以前置 device-group-management-foundation 為基礎，為預先建立的 Device 提供現場配對與可撤銷長期身份。現有 thin kiosk private-window 行為無法保存 HttpOnly Cookie，必須同步調整部署腳本。

## Goals / Non-Goals

**Goals:**

- 建立單次、短效 Pairing Token 與不可讀的 Device Credential。
- 讓 Browser 以安全 Cookie 跨重啟保存身份。
- 讓重新配對、撤銷與 Device 停用立即失效。

**Non-Goals:**

- 不建立帳號、SSO、角色、Browser localStorage credential 或 MQTT credential。
- 不以 hostname、IP、Socket ID 或 Browser UUID 當正式身份。
- 不在此 change 實作 site-scoped playback 或管理 UI。

## Decisions

### Store only hashes and return secrets once

Pairing Token 有效 15 分鐘且僅在建立 response 出現一次；Device Credential 有效 365 天，token 與 credential 以 SHA-256 hash 保存。替代方案是資料庫加密明文，但外洩時仍可解密冒用，故不採用。

### Exchange the token transactionally

Exchange 在單一 transaction 驗證 token hash、Device、expiry 與 unused 狀態，標記 used_at、撤銷既有 active credential，再建立新 credential。競爭的第二次 exchange 必須失敗，不能得到第二個有效 Credential。

### Deliver identity through a dedicated cookie

Cookie 使用 HttpOnly、SameSite=Lax、Path=/ 與 Max-Age=31536000；remote exchange 強制 HTTPS 並加 Secure，僅 loopback development 允許 plain HTTP。TLS reverse proxy 只透過明列的 `TRUST_PROXY_IPS` 信任 forwarded protocol，避免 caller 偽造。JavaScript 不接觸 credential。專用 Firefox Profile 由 thin-kiosk installer 以 kiosk user、0700 建立並由 verify script read-back，替代 private window。

### Pair through a fragment-only browser landing page

Pairing Token creation response 同時提供相對 `pairingPath`，格式為 `/device-pairing#token=<token>`。URL fragment 不會進入 HTTP request、Server log 或 Referer；landing page 讀取後立即以 `history.replaceState` 清除 fragment，再以 same-origin JSON POST 呼叫 exchange。頁面使用 no-store、no-referrer 與 nonce CSP；成功後只依 204 結果導向 `/overview`，JavaScript 不接觸 Device Credential。

### Revalidate device state on every authenticated context

Credential hash 命中後仍檢查 revoked_at、expires_at、Device enabled 與 Group enabled。停用或撤銷立即阻止後續 authenticated context，不依賴 Cookie 自行到期。

### Keep persistent Profile state on a writable root

Dedicated Profile 是身份持久化的一部分，thin-kiosk installer 必須在任何 migrate stop/disable 前拒絕 active overlayroot。舊版 installer 所建立、但依賴 co-located `/data/solar-display` 的 readonly launcher 會被精確移除，verifier 亦拒絕殘留；不讓重啟後消失或不可寫的 Profile 被誤判成功。

## Implementation Contract

**Behavior**

- 管理者可建立 Pairing Token；同 Device 新 token 不使已存在 credential 自動失效。
- 管理者取得 fragment-only pairingPath；Browser landing page 清除 fragment 後才交換 token。
- 成功 exchange 回 204 並設定 Cookie；response body 與 logs 不包含 credential。
- 重新配對成功後舊 credential 立即失效。
- expired、used、invalid token 與 missing／invalid credential 產生不同穩定 error code。
- malformed stored expiry 一律 fail closed；status success/error 一律 no-store。
- remote exchange 僅接受 direct HTTPS 或明列 proxy 所轉送的 HTTPS；remote HTTP 不消耗 token。

**Interface / data shape**

- Management create route：POST /api/devices/:id/pairing-tokens。
- Browser landing route：GET /device-pairing。
- Playback exchange route：POST /api/device-pairing/exchange，body 含 token。
- Authenticated read-back route：GET /api/device-pairing/status，只回目前 Device 的 paired、deviceId 與 clientId。
- Cookie 名稱固定 solar_device_credential。

**Failure modes**

- token 失敗不消耗有效 token；競爭成功者以外皆回 409 pairing_token_used。
- Pairing landing page 不快取、不送 Referer，且 token 不得出現在 GET request 或 HTML response。
- Status route 缺少 Cookie 時回 credential_missing；無效、撤銷、到期或停用狀態沿用 credential validation 的穩定 error code。
- 僅 loopback 非 HTTPS 開發環境不設 Secure；remote HTTP 回 pairing_https_required。
- `TRUST_PROXY_IPS` 空值不信任 forwarded headers，無效 IP 使 Server 啟動失敗。
- 專用 Firefox Profile 建立失敗時 installer 非零退出，不回退 private window。
- active overlayroot 在 migrate mutation 前失敗；verifier 驗 owner、0700 與 stale readonly launcher absence。

**Acceptance criteria**

- Pairing contract tests涵蓋 expiry、single-use、race、hash persistence、fragment landing flow、authenticated status read-back、revocation、disabled Device 與 Cookie attributes。
- deploy/verify-thin-kiosk.sh 證明專用 Profile 與 launcher 參數存在。
- focused server/deploy tests、pnpm test、pnpm build、pnpm verify 通過。

**Scope boundaries**

- In scope：credential schema/service/routes、shared contract、thin-kiosk profile 與其 writable-root compatibility。
- Out of scope：Device fleet UI、Socket aggregation、OS time、Root Agent 寫入能力。

## Risks / Trade-offs

- [一年 credential 增加外洩窗口] → 每次 request 重驗 Device 狀態並支援重新配對撤銷。
- [專用 Profile 改變現場啟動行為] → installer 與 verify script 同步驗證，保留既有 kiosk URL 與 user 權限。
