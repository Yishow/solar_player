## Why

Standards 軸 review 在管理存取控制這一塊留下六個非行為性的 findings。它們不會讓功能出錯，但每一個都讓下一個讀這段程式的人（或 agent）更容易做出錯誤判斷：

1. **死碼。** `classifyManagementRequest` 在沒有 `Origin` 的分支裡先用 `isSameHostReferer` early-return，兩行後又把同一個呼叫放進 `trusted` 的 `||` 運算式裡——那個位置永遠是 false。讀的人會以為 referer 在這裡還有作用。
2. **同一個判定跑兩次。** `classifySocketSession` 對同一份 handshake 呼叫 `classifyManagementRequest` 兩次，一次取 `.trusted`、一次取 `.passwordGateSatisfied`，而旁邊已經有一個現成的 `classify` helper 沒被用到。
3. **同一段運算式重複六次。** `!passwordGateEnabled() || isManagementSessionValid(request)` 在 `classifyManagementRequest` 裡逐字重複六次。要改密碼閘的判定條件就得同時改對六個地方。
4. **三個名字，一份完全相同的實作。** `isTrustedManagementMutationRequest`、`isTrustedManagementReadRequest`、`isTrustedManagementRequestLike` 的主體逐字相同。
5. **plugin 有兩個沒人使用、而且接不上的選項。** `ManagementAuthPluginOptions` 宣告了 `passwordGateEnabled` 與 `isManagementSessionValid`，但 fallback 分支建立 access control 時把兩者丟掉。目前唯一的呼叫端一律傳 `accessControl`，所以沒有實際影響；但若有人改用那兩個選項，密碼閘會靜默失效。
6. **兩個型別被混為一談。** `ManagementSocketSessionClass` 含有 `"unidentified"`，但那個值只由 SocketService 依 Display Client Context 解析結果指派，管理來源分類永遠不會回傳它。型別因此宣告了一個 `classifySocketSession` 產生不出來的結果。

另外，`managementPasswordService.ts`、`managementSessionService.ts` 與 `SecuritySettings/index.tsx` 採多語句同行的密集寫法，與 `apps/server/src`、`apps/web/src` 其他檔案落差明顯；`PasswordGateState` 宣告了一個從未被寫入的 `authenticated?` 欄位。

## What Changes

- 移除 `classifyManagementRequest` 中恆為 false 的 `isSameHostReferer` 判斷。
- `classifySocketSession` 對同一份 handshake 只分類一次。
- 密碼閘條件收斂成單一運算式，不再逐字重複。
- 三個信任判定共用同一份實作，三個名字保留。
- `managementAuthPlugin` 只接受 `accessControl`，移除沒人使用且接不上的四個選項與其 fallback。
- `ManagementSocketSessionClass` 縮回管理分類真正會產生的兩個值，socket 連線狀態改用一個包含 `unidentified` 的獨立型別。
- 移除 `PasswordGateState.authenticated`。
- 把三個密集寫法的檔案改回與周邊一致的多行風格。

## Non-Goals

- 不改任何對外行為。所有既有測試必須在不修改斷言的情況下維持通過。
- 不重新命名 `ManagementAccessControl` 的三個信任判定，也不改任何呼叫端。
- 不合併 `packages/shared` 之外的型別，不動 SocketService 的分類邏輯本身。
- 不處理上傳副檔名清單那一則 finding；那是另一個 change。
- 不處理 playback 五頁移除 banner 所需的 FHD witness；那需要人工驗收。

## Capabilities

### Modified Capabilities

- `management-socket-session-boundaries`: 明確區分「管理來源分類」與「socket 連線識別狀態」兩件事，前者永遠不會產生 unidentified

## Impact

- `apps/server/src/plugins/managementAuth.ts`
- `apps/server/src/app.ts`
- `apps/server/src/realtime/SocketService.ts`
- `apps/server/src/services/managementPasswordService.ts`
- `apps/server/src/services/managementSessionService.ts`
- `apps/web/src/pages/SecuritySettings/index.tsx`
- `packages/shared/src/managementAccess.ts`
