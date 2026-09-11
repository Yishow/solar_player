## 1. 固定 path ID 與 side-effect 回歸

- [x] 1.1 新增 route-level table cases 覆蓋 Images / Circuits / Brand / Display Ops 的 `12abc`、`12.0`、`+12`、`0`、負數與超出 safe integer；斷言 400，並確認 prefix=12 的 circuit/brand/image 未被修改。
- [x] 1.2 加入合法但不存在 ID 的 cases，固定 404；同步修正 Circuit PUT 舊測試「名稱說 404、實際斷言 200」的不一致。

## 2. 建立共用 strict identifier 邊界

- [x] 2.1 新增 `managementInputValidationPlugin` 共用 canonical positive-safe-integer parser；Images / Circuits / Brand / Display Ops 在 route handler 前統一拒絕 partial parse，不需讓四個舊 handler 各自複製規則。
- [x] 2.2 review server 其餘 numeric path parsers；本 change 僅處理已確認使用 `parseInt(request.params...)` 的四個 route 家族，不擴大改寫已採嚴格 Number + integer 檢查的 routes。

## 3. Circuit / Image runtime validation

- [x] 3.1 加入 Circuit invalid create/PUT fixtures：空名稱、負 capacity、threshold 逆序、未知 slot、非法 display order；PUT 以 existing + patch candidate 驗證，斷言 400 與 DB 不變。
- [x] 3.2 實作 Circuit raw type + complete candidate validator：POST 套既有 defaults 後驗證；PUT 先讀 existing、保留既有 null/no-op 語意後驗證完整 candidate。invalid request 在 handler 前結束，因此不會發 mutation/display-sync event。
- [x] 3.3 加入 Image invalid duration、aspect ratio、category、usage scope 與 wrong-type boolean cases；validator 在 handler 前拒絕並確認 image row 不變。

## 4. Atomic reorder

- [x] 4.1 Circuit / Image reorder 加 duplicate ID、unknown ID、負／小數 order cases；每次失敗後比對原 order 未變。
- [x] 4.2 實作 transaction 前 array/item/uniqueness/existence preflight；只有全部通過才進既有 handler transaction 與 socket/display-sync emission。

## 5. Review 與驗證

- [x] 5.1 主代理 review 最終修改：修正 null 數字欄位不可被當成 omitted、保留 Circuit optional string 的舊 null/no-op 行為、確認 malformed=400 / missing=404 且 invalid request 在 route side effects 前終止。
- [x] 5.2 對新增 validation plugin 執行 standalone TypeScript syntax/type-boundary check（排除 workspace module resolution）通過；完整 server route tests、`pnpm --filter @solar-display/server test`、`pnpm verify` 與 OpenSpec/Spectra validate 因目前執行環境沒有完整 workspace，標記 NOT RUN，不宣稱通過。
