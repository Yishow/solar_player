## Why

目前管理密碼設定端點被排除於共用 mutation hook；當密碼 gate 尚未啟用時，未受信任來源可直接呼叫 `PUT /api/management-auth/password` 開啟 gate 並設定密碼。這讓既有 trusted management origin boundary 在最重要的 bootstrap 狀態失效。

## What Changes

- 讓 password 設定 mutation 在 gate disabled 時也必須先通過既有 trusted management origin/access-token boundary。
- 保留已驗證 management session 與 recovery access token 的既有管理流程。
- 以 untrusted origin、untrusted remote 與 trusted bootstrap 請求測試鎖住邊界；未受信任請求不得啟用或停用 gate。

## Non-Goals

- 不把 password endpoint 納入通用 hook 以外的 route shell 或 API 架構重寫。
- 不改變公開的 password state GET、unlock 失敗回應、密碼雜湊或 session 生命週期。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `management-api-access-boundaries`: password gate configuration mutations SHALL preserve trusted management origin/access-token boundary even while the gate is disabled.

## Impact

- Affected code:
  - Modified: `apps/server/src/routes/management-auth.ts`
  - Modified: `apps/server/src/routes/management-auth.test.ts`
  - Modified: `apps/server/src/plugins/managementAuth.test.ts`
- Affected spec: `management-api-access-boundaries`
