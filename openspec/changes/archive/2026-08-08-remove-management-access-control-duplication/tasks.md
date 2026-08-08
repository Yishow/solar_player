## 1. 管理存取判定收斂成單一真相

- [x] 1.1 依設計決策「密碼閘條件抽成一個具名判定」，在 `apps/server/src/plugins/managementAuth.ts` 把 `!passwordGateEnabled() || isManagementSessionValid(request)` 抽成一個具名判定並讓六個回傳點共用；`access-token` 永遠滿足、`untrusted` 永遠不滿足的常數值保留在原地。以 `grep -c "passwordGateEnabled()" apps/server/src/plugins/managementAuth.ts` 的結果為 1，且 `pnpm --filter @solar-display/server test src/plugins/managementAuth.test.ts src/routes/management-auth.test.ts` 在斷言未修改的情況下全綠驗證。
- [x] 1.2 依設計決策「沒有 Origin 的分支只判斷一次 referer」，移除 `classifyManagementRequest` 中恆為 false 的第二次 `isSameHostReferer` 呼叫，改為先算一次結果再決定分支。以既有的「same-host browser reads stay trusted when referer matches but Origin is absent」測試仍通過驗證。
- [x] 1.3 依設計決策「三個信任判定共用一份實作，但名字保留」，讓 `isTrustedManagementMutationRequest`、`isTrustedManagementReadRequest`、`isTrustedManagementRequestLike` 指向同一個函式，三個成員名稱與簽章不變、呼叫端不動。以 `pnpm --filter @solar-display/server test` 全綠驗證。
- [x] 1.4 依設計決策「`classifySocketSession` 對同一份 handshake 只分類一次」，讓它改用既有的 `classify` helper 取得單一 decision，再同時讀 `trusted` 與密碼閘結果。以既有的「socket sessions stay playback-safe unless a trusted caller explicitly requests management access」測試仍通過驗證。

## 2. 移除接不上的擴充點

- [x] 2.1 依設計決策「plugin 只接受已建好的 access control」，把 `ManagementAuthPluginOptions` 縮為 `{ accessControl: ManagementAccessControl }`，刪除 fallback 建構與 `managementAccessToken`、`trustedOrigins`、`passwordGateEnabled`、`isManagementSessionValid` 四個選項，並同步更新 `apps/server/src/app.ts` 的註冊呼叫。以 `pnpm --filter @solar-display/server build` 通過（不傳 `accessControl` 會是型別錯誤）與 server 測試全綠驗證。
- [x] 2.2 移除 `apps/server/src/services/managementPasswordService.ts` 的 `PasswordGateState.authenticated`，該欄位從未被 `readManagementPasswordState` 寫入。以 server build 與 `src/services/managementPasswordService.test.ts` 通過驗證。

## 3. 分開管理來源分類與 socket 識別狀態

- [x] 3.1 依 requirement「Classify socket sessions as playback-safe or management-trusted」與設計決策「分開「管理來源分類」與「socket 連線識別狀態」」，把 `packages/shared/src/managementAccess.ts` 的 `ManagementSocketSessionClass` 縮為 `playback-safe | management-trusted`，並新增 `DisplaySocketSessionClass = ManagementSocketSessionClass | "unidentified"`。以 `pnpm run build:shared` 通過驗證。
- [x] 3.2 讓 `apps/server/src/realtime/SocketService.ts` 的每條連線識別狀態改用 `DisplaySocketSessionClass`，分類邏輯與事件配送規則一字不改。以 `pnpm --filter @solar-display/server test src/realtime/SocketService.test.ts src/realtime/SocketService.broadcastGuardrails.test.ts` 在斷言未修改的情況下全綠驗證。
- [x] 3.3 在 `apps/server/src/plugins/managementAuth.test.ts` 新增一條測試，斷言沒有 Device Credential 的 playback handshake 經 `classifySocketSession` 仍回傳 `playback-safe`，證明管理來源分類不會產生 `unidentified`。

## 4. 排版跟隨周邊

- [x] 4.1 依設計決策「排版跟隨周邊，不引入新規範」，把 `apps/server/src/services/managementPasswordService.ts`、`apps/server/src/services/managementSessionService.ts` 與 `apps/web/src/pages/SecuritySettings/index.tsx` 從多語句同行改為一行一語句、控制流程加大括號、多個 import 換行，邏輯一字不改。以受影響測試全綠且 `git diff --stat` 顯示這三個檔案沒有新增或刪除任何語句驗證。

## 5. 驗證

- [x] 5.1 依設計決策「行為不變是這個 change 的驗收條件，不只是期望」，執行 `pnpm --filter @solar-display/server test`，確認全部測試在斷言未修改的情況下通過；若有任何失敗，回退造成失敗的重構項而不是修改測試。
- [x] 5.2 執行 `pnpm verify`，確認 `build`、`bundle-budget`、`server`、`web`、`deploy`、`server-runner` 六個 stage 全數通過。
