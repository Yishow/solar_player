## Context

`managementAuth.ts` 累積了數個 change 的疊加：先有來源信任判定，再疊上密碼閘，再疊上 socket 分類。每一層都是正確的，但疊加的過程留下了死碼、重複的運算式與一個宣告得比實際更寬的型別。這些都不影響行為——638 個 server 測試在改動前後都必須全綠——但它們讓「密碼閘的條件是什麼」這個問題在檔案裡有六個答案。

`"unidentified"` 的來源特別值得釐清：它不是管理來源分類的結果，而是 SocketService 在 Display Client Context 解析失敗時指派的。`classifySocketSession` 只會回傳 `playback-safe` 或 `management-trusted`，但它的回傳型別說它可能回傳三種。

## Goals / Non-Goals

**Goals:**

- 讓密碼閘的判定條件在程式裡只有一個位置。
- 讓型別只描述實際可能發生的值。
- 移除已經不可能執行到的分支與沒人使用的選項。
- 讓這幾個檔案的排版與周邊一致。

**Non-Goals:**

- 不改任何對外行為，不改任何既有測試的斷言。
- 不重新命名 `ManagementAccessControl` 的三個信任判定，不動任何呼叫端。
- 不動 SocketService 的分類邏輯與 socket 事件配送規則。
- 不處理上傳副檔名清單與 FHD witness。

## Decisions

### 行為不變是這個 change 的驗收條件，不只是期望

每一項都是重構。因此驗收方式不是新增測試，而是「既有測試在斷言完全不變的情況下全綠」。唯一新增的測試針對型別分割後 `classifySocketSession` 的回傳值域，因為那是新表達出來的約束。

### 密碼閘條件抽成一個具名判定

`!passwordGateEnabled() || isManagementSessionValid(request)` 的語意是「密碼閘沒開，或這個請求帶著有效的管理 session」。抽成 `satisfiesPasswordGate(request)` 之後，六個回傳點共用它，改條件只需要改一處。

`access-token` 與 `untrusted` 兩條路徑刻意不套用這個判定：前者永遠滿足（token 就是復原路徑），後者永遠不滿足（來源都不可信了，談密碼閘沒有意義）。這兩個常數值保留在原地，讓「為什麼這裡不一樣」看得出來。

### 沒有 Origin 的分支只判斷一次 referer

原本的寫法是：referer 同主機就 early-return，否則再算一次 `isSameHostReferer(...) || isLoopbackRemoteAddress(...)`。第二次的 `isSameHostReferer` 在那個位置必然是 false。改寫成先算一次 referer 結果，再依它決定走哪一條，語意完全相同而且看得出來只有 loopback 這一個額外條件。

### 三個信任判定共用一份實作，但名字保留

三個名字在呼叫端傳達了意圖（這是 mutation／這是 read／這是非 Fastify 的請求物件），把 41 個呼叫端改成同一個名字會失去這個資訊，而且製造大量無意義的 diff。真正的問題是三份逐字相同的主體，所以三個名字指向同一個函式即可。

### plugin 只接受已建好的 access control

`managementAuthPlugin` 目前唯一的呼叫端一律傳 `accessControl`，fallback 分支從未被執行過，而它接不上密碼閘的事實是一個等著被踩的地雷。把 `accessControl` 改為必要參數並刪掉 fallback 與其餘三個選項，地雷就不存在了——不是「記得要傳」，而是「不傳就編譯不過」。

### 分開「管理來源分類」與「socket 連線識別狀態」

`ManagementSocketSessionClass` 縮回 `playback-safe | management-trusted`，代表管理來源分類的結果。新增 `DisplaySocketSessionClass = ManagementSocketSessionClass | "unidentified"`，代表 SocketService 對一條連線的識別狀態。前者是後者的子集合，因此 SocketService 可以直接把分類結果存進狀態，不需要轉換。

這讓 `classifySocketSession` 的回傳型別不再宣告一個它產生不出來的值，也讓「unidentified 從哪裡來」在型別上就答得出來。

### 排版跟隨周邊，不引入新規範

repo 沒有 lint 或 formatter，所以判準是「與同目錄其他檔案一致」：一行一個語句、控制流程用大括號、多個 import 換行。這是機械性的改寫，不調整任何邏輯。

## Implementation Contract

**Behavior**

- 沒有任何對外行為改變。管理存取判定、密碼閘、socket 分類與事件配送的結果在改動前後完全相同。
- `classifySocketSession` 只會回傳 `playback-safe` 或 `management-trusted`。
- 不傳 `accessControl` 給 `managementAuthPlugin` 會是型別錯誤，而不是靜默停用密碼閘。

**Interface / data shape**

- `packages/shared` 匯出 `ManagementSocketSessionClass = "playback-safe" | "management-trusted"` 與 `DisplaySocketSessionClass = ManagementSocketSessionClass | "unidentified"`。
- `ManagementAuthPluginOptions` 縮為 `{ accessControl: ManagementAccessControl }`。
- `PasswordGateState` 縮為 `{ enabled: boolean; lockedUntil: string | null }`。
- `ManagementAccessControl` 的成員名稱與簽章不變。

**Failure modes**

- 這個 change 不新增任何失敗路徑。若既有測試出現任何斷言失敗，代表重構改到了行為，必須回退該項而不是修改測試。

**Acceptance criteria**

- `pnpm --filter @solar-display/server test` 的 638 個測試在斷言完全未修改的情況下全綠。
- `apps/server/src/plugins/managementAuth.test.ts` 新增一條測試，斷言 `classifySocketSession` 在 unidentified 情境（無 Device Credential 的 playback 連線）仍只回傳 `playback-safe`。
- `apps/server/src/plugins/managementAuth.ts` 中 `passwordGateEnabled()` 的呼叫只出現在一個具名判定裡。
- `pnpm verify` 全綠。

**Scope boundaries**

- 在範圍內：`managementAuth.ts`、`app.ts` 的 plugin 註冊、`SocketService.ts` 的型別引用、`managementPasswordService.ts`、`managementSessionService.ts`、`SecuritySettings/index.tsx`、`packages/shared/src/managementAccess.ts`。
- 不在範圍內：任何 route 檔、任何測試的既有斷言、SocketService 的分類與配送邏輯、上傳副檔名清單、FHD witness。

## Risks / Trade-offs

- 重構沒有測試保護的分支時，最大的風險是「以為等價其實不等價」。死碼移除與條件抽取兩項都是可以逐行核對的等價變換，而 638 個既有測試涵蓋了管理存取與 socket 分類的主要路徑；但涵蓋不等於完備，因此驗收條件是斷言不得修改。
- 縮小 `ManagementSocketSessionClass` 會讓任何把 `"unidentified"` 當成管理分類結果的既有程式編譯失敗。這正是想要的效果——目前只有 SocketService 使用該值，改用新型別即可。
- 排版改寫會讓這幾個檔案的 `git blame` 指向本次 commit。以可讀性換取歷史精確度，在這幾個新檔案上代價很小。
