## Problem

部分 server routes 仍用 `Number.parseInt(request.params.id, 10)` 解析 path ID。JavaScript 會把 `12abc` 解析成 `12`，因此格式錯誤的 URL 可能落到真實 record，而不是被拒絕。現行 Devices、Device Groups、Playback Profiles 已使用較嚴格的整數檢查，但 Images、Circuits、Brand、Display Ops 等舊路由仍存在不一致。

同時，Circuit / Image mutation 的 TypeScript body type 主要是開發期提示，HTTP runtime 沒有完整驗證。負數 duration、非有限數值、錯序 threshold、未知 enum、重複／不存在的 reorder ID 等輸入可能進到 SQLite，或讓 bulk mutation 靜默只改到部分資料。Circuit PUT 找不到 record 時目前還可能以 HTTP 200 回 `{ success:false }`，呼叫端較難可靠判斷。

## Root Cause

- path ID 解析由各 route 自行實作，舊路由沿用 `parseInt + isFinite`，沒有「整段字串必須是合法正整數」的共用規則。
- request body 的 TypeScript 型別不會在 runtime 擋掉手動 API、舊前端或壞掉的 client。
- reorder 在 transaction 內直接逐筆 UPDATE，沒有先做完整集合驗證，未知 ID 可以變成 no-op，缺少 all-or-nothing 的輸入契約。

## Proposed Solution

- 新增 server 共用 strict path-id validator，僅接受完整 canonical positive integer；拒絕 suffix、decimal、sign、zero、negative、空值與超出安全整數範圍的 ID。
- 將 Images、Circuits、Brand、Display Ops 的 numeric path ID 改走同一 validator；合法但不存在的 ID 回 404，格式錯誤回 400。
- 為 Circuit create/update 建立 runtime candidate validation：名稱、page/slot、有限數值、非負 rated capacity、整數 display order，以及 threshold band 的順序一致性在寫 DB 前完成。PUT 先合併 existing + patch 再驗證，避免 partial patch 繞過跨欄位規則。
- 為 Image update 建立 runtime validation：duration 為正整數、aspect ratio 為有限正數、category/usage scope 僅允許 shared allowlist；型別錯誤不靠 JS coercion 接受。
- Circuit/Image reorder 在 transaction 前驗證 body shape、ID 唯一、display order 合法、所有 ID 都存在；任一錯誤整批 400，DB 與 socket/display-sync 都不變。
- 維持各 route 既有成功 response shape；本 change 不趁機統一整個 server 的 error envelope。

## Success Criteria

- `/api/images/12abc`、`/api/circuits/12abc`、對應 Brand / Display Ops 路由都回 400，且不讀寫 ID 12 的 record。
- `12.0`、`+12`、`0`、負數、超出 safe integer 的 path ID 被拒絕；合法正整數仍照舊工作。
- Circuit invalid candidate（NaN/Infinity 等非 JSON 數字由測試以 injection/typed seam 模擬、負 capacity、threshold 逆序、未知 slot、非法 order、空名稱）在 persist 前 400，無 DB change、無 update event；合法 partial PUT 仍可更新。
- Circuit PUT/DELETE、Image PUT/DELETE 等合法但不存在 ID 使用 404，不再用 200 表示 not found。
- Image invalid `displayDuration` / `aspectRatio` / `category` / `usageScope` 被拒絕且資料不變。
- reorder 若有重複 ID、未知 ID 或非法 order，整批不修改；合法 reorder 的既有結果與事件維持。
- server tests 與 `pnpm verify` 通過。

## Capabilities

### New Capabilities

- `management-api-input-validation`：建立管理 API 對 path identifier、Circuit/Image mutation 與 reorder 的一致 runtime validation 契約。

### Modified Capabilities

- （無；既有各頁成功操作語意維持，由新 cross-cutting capability 補上輸入邊界。）

## Impact

- Affected code（預期）：
  - `apps/server/src/routes/images.ts`
  - `apps/server/src/routes/circuits.ts`
  - `apps/server/src/routes/brand.ts`
  - `apps/server/src/routes/display-ops.ts`
  - 新增共用 route validation helper
  - `packages/shared` 的既有 circuit slot / asset enum allowlist（重用，不重複定義）
  - 對應 route tests
- 不變更 DB schema；不自動清理既有可能已存在的不合法 row，僅阻止新 mutation 繼續寫入。
