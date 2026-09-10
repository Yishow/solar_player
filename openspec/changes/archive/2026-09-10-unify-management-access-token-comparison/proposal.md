## Problem

P2／Bug Fix。HTTP 管理 token 使用 timingSafeEqual，但 Socket auth payload 仍以字串相等比較，違反現行管理邊界「只有一份 token 比較實作」的契約。這是程式與規格不一致，並非已證實可利用的計時攻擊。

## Root Cause

matchesManagementAccessTokenHeader 將擷取和位元組比較包在 HTTP adapter 中，matchesSocketAuthAccessToken 因此另寫 trim 與相等判斷；兩個入口沒有共同的 token-value 比較邊界。

## Proposed Solution

在 managementAuth 模組保留小型 HTTP／Socket 擷取 adapter，將 token 值辨識集中到單一 UTF-8 位元組比較函式。保留入口既有 trim／HTTP array-first 語意，拒絕未設定 token、缺席、空白及非字串 Socket 值；先檢查 byte length，再使用 timingSafeEqual。其他 origin、password、session 與權限分類不變。

## Success Criteria

- HTTP header 與 Socket auth payload 的等值、不同前綴、不同 byte length、空白、缺席與未設定 token 案例符合相同判斷表。
- 兩個入口實際呼叫同一比較函式；模組不殘留另一份 token 字串等值判斷。
- 現有 password-gate／trusted-origin／management-session 與 socket scope 測試保持通過；不以微秒 benchmark 宣稱安全證明。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `management-api-access-boundaries`: 將單一 token 比較契約明確延伸到 HTTP header 與 Socket auth payload，並固定 transport normalization 相容行為。

## Impact

- Affected specs: `openspec/specs/management-api-access-boundaries/spec.md`。
- Modified: `apps/server/src/plugins/managementAuth.ts`、`apps/server/src/plugins/managementAuth.test.ts`。
- 驗證但不預定改動：`apps/server/src/realtime/SocketService.test.ts`。
- New／Removed: 無。無 token 換發、儲存格式、API、依賴或部署設定變更。
