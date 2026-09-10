## Context

現有管理邊界已要求單一 token 比較實作。matchesManagementAccessTokenHeader 使用 UTF-8 buffer、byte-length guard 與 timingSafeEqual；matchesSocketAuthAccessToken 則自行 trim 後使用字串相等。createManagementAccessControl.classifySocketSession 接受兩種 token 輸入，形成可漂移的第二條比較路徑。

## Goals / Non-Goals

**Goals / In scope:** 在 managementAuth 模組內統一值比較，保留 HTTP 和 Socket 的擷取語意，以公開入口測試證明權限與 normalization 不變。

**Non-Goals / Out of scope:** 不改 token 發行或儲存、password gate、trusted origin、session 過期、Socket rooms、scope、API envelope；不新增通用 auth framework，不重拆整個大檔；不做時間攻擊實驗或宣稱已證實外洩。

## Decisions

### 共同比較核心

在 apps/server/src/plugins/managementAuth.ts 內建立 matchesManagementAccessTokenValue(presented: string | null, configured: string | null): boolean。未設定 configured 或 presented 缺席／空字串時直接 false，其他值以 Buffer.from(..., utf8) 比較 byte length；長度一致才呼叫 timingSafeEqual。函式不讀 request、不記錄 token、不決定其他信任條件。保留為模組內私有函式即可，測試經公開 adapter／classification 進入，不為測試增加 public API。

替代方案是讓 Socket 假造 HTTP headers 呼叫原函式，但這會把核心語意綁在 transport 並隱藏值來源，因此使用小型值比較函式。不新增單獨檔案或 class。

### 相容擷取與權限隔離

HTTP adapter 繼續使用 readHeaderValue：字串 trim、空白變 null、array 使用首元素。Socket adapter 只接受 auth.managementAccessToken 的字串，再 trim，非字串和空白視為缺席。不正規化 configured 值、不改大小寫、不做 Unicode normalization；使用它目前已載入的字串。兩個 adapter 都只把擷取值交給共同比較核心。

classifySocketSession 的 requestedClass 檢查、HTTP header 與 Socket payload 任一合法 token 可通過的 OR 關係，以及後續 trusted-origin／session fallback 完全不變。Token 不合法只代表 token path 失敗，不得誤寫成「即使另有合法 session 也必須拒絕」。

### 行為矩陣與結構驗證

在 apps/server/src/plugins/managementAuth.test.ts 對公開 matchesManagementAccessTokenHeader 與 createManagementAccessControl.classifySocketSession 建立相同 fixture matrix。Socket 測試明確指定 management-trusted，使用不受信任來源且無合法 session，避免其他 trust path 掩蓋 token 比較結果。覆蓋缺席、空字串、空白、正確值、前綴／尾端 mismatch、不同 byte length、Unicode 等字元數但不同位元組長度及未設定 token。

成功值外圍空白維持可接受；HTTP array-first 與 Socket non-string rejection 各有專屬測試。以最終 source review 確認所有 token equality 都進入同一 helper 且沒有普通字串等值捷徑；不以 noisy latency 斷言測試 constant-time。

## Implementation Contract

- 入口不變：matchesManagementAccessTokenHeader、createManagementAccessControl 的 HTTP trust 方法與 classifySocketSession。
- 等值判斷：同一 UTF-8 byte comparator 處理兩個 adapters；異長值不呼叫 timingSafeEqual，避免拋錯。
- 失敗語意：configured 為 null／空字串時 token path 不授權；其他既有 origin／session 決策獨立執行，不被本案重定義。
- 驗收：matrix 測試、HTTP array-first／Socket type tests、合法 session／trusted origin regression；跑 managementAuth.test.ts 與 SocketService.test.ts，最後 pnpm verify 並回讀最後 diff。
- 唯一預定修改範圍為 proposal Impact 的 managementAuth 模組與其測試；SocketService.test.ts 只作既有行為回歸。

## Risks / Trade-offs

- [測試被合法 origin 或 session 繞過] → token matrix 排除其他 trust witnesses，再用既有 tests 驗證 fallback 未改。
- [字元長度誤當 byte length] → 以 Unicode 異位元組案例和 source review 守住 byte guard。
- [把 token comparison 誤稱所有 auth constant-time] → 只聲明比較核心的 primitive 與 prefix-independent 契約，承認完整 request 包含其他運算。

## Migration Plan

無資料或設定遷移。正常程式更新即可；回退以本案限定 diff 為界，但會恢復第二份比較路徑。本次不執行程式更新。

## Open Questions

無待決需求。若實作發現未列出的第三個 token 入口，先確認是否同一 MANAGEMENT_ACCESS_TOKEN 契約再納入；不得順勢重構其他 token 類型。
