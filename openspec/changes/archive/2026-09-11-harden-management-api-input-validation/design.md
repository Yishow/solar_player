## Context

server 新舊路由的 path ID 規則已分岔：Devices / Device Groups / Playback Profiles 會把整段字串轉成 Number 後要求正整數；Images / Circuits / Brand / Display Ops 還使用 `parseInt`，因此 `12abc` 會解析為 12。Circuit / Image body 又直接以 TypeScript cast 進 SQL，對非前端正常路徑的輸入防線較弱。

這個 change 目標不是做一套大型 schema framework，而是把已確認的錯誤邊界收斂成少量可重用 runtime validation，先保護「改錯 record」與「把不合理狀態寫進 DB」兩類風險。

## Goals / Non-Goals

**Goals:**

- numeric path ID 只有完整、正整數、safe integer 才能通過。
- Circuit / Image mutation 在任何 DB 或 filesystem/socket side effect 前驗證完成。
- bulk reorder 採 all-or-nothing input semantics。
- not-found 與 malformed input 使用可預期 HTTP status。

**Non-Goals:**

- 不統一全 server 的 response/error envelope。
- 不在這個 change 清洗既有 DB 壞資料；讀取仍應能顯示，後續可另做 repair tool。
- 不新增第三方 validation 套件，除非實作期證明現有 repo 已有且重用成本更低。
- 不改 management access control、CSRF/CORS 或權限規則。

## Decisions

### Path ID 用完整字串驗證，不再用 parseInt

建立單一 helper，例如 `parsePositiveIntegerPathId(value)`：

- input 必須符合 canonical decimal positive integer（`^[1-9][0-9]*$`）。
- Number 轉換後必須 `Number.isSafeInteger`。
- 失敗回 typed validation error，route 映射為 400。

因此 `12abc`、`12.0`、`+12`、空白、0、負數與超大整數全部拒絕，不再允許 partial parse。現有已採嚴格行為的 routes 可暫不改，或在不擴大 scope 的前提下後續收斂到同 helper。

### Circuit 以「合併後 candidate」做跨欄位驗證

POST 先套現有 defaults 形成完整 candidate；PUT 先讀 existing，再套 patch 形成完整 candidate，最後一次驗證後才 UPDATE。至少驗證：

- `nameZh` trim 後非空。
- `ratedCapacity` 是 finite number 且 >= 0。
- threshold 欄位都是 finite number，且 `normalMin <= normalMax <= attentionMin <= attentionMax <= warningMin <= warningMax`。
- `displayOrder` 是 >= 0 的 safe integer。
- `displaySlot` 為 null 或 shared `displayCircuitSlotKeys` 成員。
- `pageKey` 若提供，trim 後非空。

不額外規定 warningMax 必須等於 ratedCapacity，以免把既有可接受的業務設定硬鎖死。

### Image mutation 只接受明確、有限、允許集合中的值

PUT image 對有提供的欄位驗證：

- `displayDuration`：safe integer 且 >= 1。
- `aspectRatio`：finite number 且 > 0。
- `category` / `usageScope`：現有 shared allowlist 成員。
- boolean 欄位必須真的為 boolean；文字欄位若驗證則只接受 string/null 的既有契約，不做隱式數字轉字串。

上傳檔案 content validation 不屬本 change。

### Reorder 先驗完整集合，再進 transaction

Circuit/Image reorder 先驗證 array、每項 ID/order、ID 唯一，再一次查出所有 requested IDs 是否存在。任何 unknown / duplicate / invalid item 直接 400，且 transaction 不開始、socket event 不發。通過後才用現有 transaction 更新。

這不要求 reorder 必須包含整張表全部 row；只要求「送來的每一筆都有效且唯一」。

### HTTP status 清楚區分 malformed 與 missing

- path/body 格式錯誤：400。
- ID 格式正確但 record 不存在：404。
- valid mutation：維持既有 2xx shape。

Circuit PUT 的 `success:false` + 200 改為 404，是刻意的契約修正。

## Implementation Contract

- In scope：Images/Circuits/Brand/Display Ops 的 numeric path parsing；Circuit/Image create/update/reorder runtime validation。
- Side effects：invalid request 不得改 DB、檔案、playlist row，不得 emit mutation/display-sync socket event。
- Error detail：回應可指出欄位/原因，但不得回 stack、SQL、filesystem path 或 request secret。
- Existing data：讀取既有 row 不因新 validator 失敗；只有新的 write candidate 被擋。
- Verification：每個 invalid class 都有 route-level regression，並斷言 persistence/event count 不變。

## Risks / Trade-offs

- [既有前端其實送出非 canonical ID] → Web UI 產生的 ID 本來就是數字路徑；先用現有 route tests / browser smoke 驗證，不為未知 client 保留 `12abc` 這種錯誤相容。
- [既有 DB 已有 threshold 逆序，PUT 任一無關欄位會被完整 candidate validator 擋住] → 實作前先 fixture 檢查 seed/現有合法資料；若 production 已有 legacy invalid row，需明確 repair/migration 計畫，不能偷偷放寬新寫入規則。
- [bulk reorder preflight 多一次 SELECT] → row 數量很小，換取 all-or-nothing 與明確錯誤；測試不以微小 query 數為優先。
- [共用 helper 被擴成大型 validation framework] → 僅抽 path ID 與必要小工具；Circuit/Image 規則留在 domain route/service 附近。
- [錯誤 response shape 被順便大改] → 本 change 只標準化 status semantics，不做全 server envelope 重構。
