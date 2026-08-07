## 1. Session 分級

- [x] 1.1 依設計決策「新增 unidentified 這一層 socket session 分級」，在 `packages/shared/src/managementAccess.ts` 新增表示連線識別狀態的 `unidentified` 分級，與既有 `playback-safe`、`management-trusted` 並存。以 `pnpm --filter @solar-display/shared test` 確認型別匯出可用且既有型別使用處不中斷。
- [x] 1.2 依「Classify socket sessions as playback-safe or management-trusted」，讓 `SocketService` 的 handshake middleware 對 `playback-safe` 且無法解析出 Display Client Context 的情形改為放行並標記 `unidentified`，不再以錯誤終止連線；憑證被撤銷、停用、對應 Device 不存在，以及解析過程拋出非預期錯誤，四種情形一律標記 `unidentified` 而非已識別。先在 `apps/server/src/realtime/SocketService.test.ts` 寫出這四種情形的失敗測試，再實作至通過。

## 2. 廣播對象

- [x] 2.1 依設計決策「以已識別連線的 room 表達廣播對象，而非排除未識別連線」，讓已識別連線（具備有效 Device Credential 的 `playback-safe`，以及 `management-trusted`）於 connection handler 加入一個共用 room，`unidentified` 連線不加入任何 room。以測試斷言兩類連線的 room 歸屬驗證。
- [x] 2.2 依設計決策「廣播一律經由兩個具名輔助方法，並以原始碼層級測試守住」，在 `SocketService` 新增「對全部連線廣播」與「只對已識別連線廣播」兩個私有方法，並把既有八個 `this.io.emit(` 呼叫改為經由其中之一；`emitManagementOnly` 維持不變。以既有 SocketService 測試確認事件仍送達正確對象。
- [x] 2.3 依「Restrict unidentified socket sessions to an explicit feed allowlist」與設計決策「白名單目前只含 server:time」，讓 `server:time` 走全部連線廣播，其餘七個事件走已識別連線廣播。以 spec 中的送達對照表為案例，寫出「`unidentified` 連線收到 `server:time`」與「收不到 `liveMetrics:update`、`mqtt:status`、`circuitMetrics:update`、`display:sync`、`circuit:settingsUpdated`、`playback:settingsUpdated`、`images:updated` 及管理專屬事件」兩組測試後實作至通過。
- [x] 2.4 新增 `apps/server/src/realtime/SocketService.broadcastGuardrails.test.ts`，讀取 `SocketService` 原始碼並斷言 `this.io.emit(` 只出現在「對全部連線廣播」那一個方法內——以該呼叫的位置同時晚於 `broadcastToAll` 宣告、早於 `broadcastToIdentified` 宣告來釘住，使 constructor 或其他方法內新增的 emit 也會失敗。
- [x] 2.5 依「the session SHALL NOT receive ... any management-only event」，讓房間投遞成為唯一路徑：`SocketServerLike.to` 由選填改為必填，`broadcastToIdentified` 移除 optional-call、`emitManagementOnly` 移除「`to` 不存在時退回全連線廣播」的 fallback。該 fallback 會使 `deviceStatus:update`、`system:error`、`system:recovered` 送達全部連線。以 SocketService 測試斷言 `playback-safe` 與 `unidentified` 連線皆收不到這三個管理專屬事件。

## 3. 未識別連線的行為

- [x] 3.1 依「Reject invalid identity and heartbeat payloads safely」與設計決策「未識別連線的 heartbeat 一律忽略」，讓 `unidentified` 連線送出的 `client:heartbeat` 一律丟棄：不建立、不更新 Device registry entry，也不改變任何 Device 的 liveness 狀態，且連線維持存續。先寫出「`unidentified` 連線送 heartbeat 後 registry 無新增」的失敗測試，再實作至通過。
- [x] 3.2 讓 `unidentified` 連線送出任何需要 Display Client Context 的事件時一律忽略且不拋出未捕捉例外，連線不被中斷。以測試斷言送出後連線仍為連線狀態驗證。

## 4. 端對端與交付

- [x] 4.1 依「Broadcast an ordered Server Time Signal」，斷言未配對連線於連線當下收到一次 `server:time`、其後依 30000 毫秒間隔持續收到。以 SocketService 測試搭配可注入的排程驗證。測試替身的 `io.emit` 必須如實模擬 socket.io 扇出到每一條連線，否則只數 `io.emitted` 無法證明未加入任何 room 的連線真的收得到；斷言以該 socket 自身收到的 `server:time` 次數（連線時 1 次，之後每次排程各 +1）為準。
- [x] 4.2 以 Playwright 對未配對瀏覽器開啟 `/overview`，斷言 header 在 10 秒內不再顯示等待同步的字樣並顯示實際時間；同時斷言五個展示頁的既有渲染不受影響。將此測試放入既有的 browser smoke 流程中執行。
- [x] 4.3 斷言已配對 client 收到的事件集合、`management-trusted` 的分級判定與管理專屬事件送達對象，與本次變更前完全相同。以既有 SocketService 測試補上這三條迴歸斷言驗證。
- [x] 4.4 執行 `pnpm verify` 並確認全數通過；若有失敗，修正後重跑至通過並保留實際輸出作為佐證。
