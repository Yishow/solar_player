## 1. 固定入口與比較契約

- [x] 1.1 在 apps/server/src/plugins/managementAuth.test.ts 依「行為矩陣與結構驗證」建立 HTTP 與 management-trusted Socket 的共用 fixture matrix，排除合法 origin／session 干擾；以 focused suite 驗證 missing、blank、正確值、前後 mismatch、異長、UTF-8 異 byte length 及未設定 token 的一致結果。
- [x] 1.2 為 Management token transports share one byte comparator 補可重現舊版第二條比較路徑的結構回歸：在同測試檔以現有 source-inspection 慣例斷言兩個具名 adapters 都委派同一值比較 helper、helper 具有 byte-length guard 和 timingSafeEqual；先證明目前 Socket 的普通字串比較使該測試失敗，不以延遲量測當安全證明。
- [x] 1.3 在同 suite 固定「相容擷取與權限隔離」：HTTP trim／array-first、Socket trim／非字串拒絕、合法 session／origin fallback、playback-safe requested class 與兩 token 入口 OR 關係；以公開入口分類斷言保留既有權限，不用私有 helper 結果取代整合驗證。

## 2. 統一比較核心

- [x] 2.1 在 apps/server/src/plugins/managementAuth.ts 落實「共同比較核心」，保留私有 matchesManagementAccessTokenValue，拒絕缺席值，以 UTF-8 byte length guard 後呼叫 timingSafeEqual；兩 adapters 保留擷取責任並共同委派，執行 1.1、1.2 證明值矩陣與結構回歸通過。
- [x] 2.2 回讀兩個 adapters 與 createManagementAccessControl，確認未正規化 configured token、未新增 token 日誌、未改 password／origin／session 邊界；執行 1.3 與既有 apps/server/src/realtime/SocketService.test.ts，並以 source review 確認同一管理 token 不殘留普通字串等值捷徑。

## 3. 交付驗證

- [x] 3.1 執行 pnpm --filter @solar-display/server test src/plugins/managementAuth.test.ts src/realtime/SocketService.test.ts、pnpm verify、git diff --check，回讀最後 diff 確認修改只落於 managementAuth 模組及其測試；記錄 PASS／FAIL／NOT RUN，不將本機 tests 或 timing-safe primitive 宣稱為完整系統計時安全證明。
