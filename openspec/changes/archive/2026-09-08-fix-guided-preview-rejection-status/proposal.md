## Why

`fix-guided-mqtt-write-integrity`（commit `bf103185`）為了讓歸屬衝突回 409，把 guided mapping preview route 的錯誤狀態碼改成 `error.statusCode ?? 422`。但 `guidedMqttMappingService` 的 `conflict()` 是共用 helper，草稿格式驗證也用它，因此所有驗證錯誤都帶 `statusCode: 409`。結果 `SOURCE_REVIEW_REQUIRED` 與 `PREVIEW_DRAFT_MISMATCH` 從 422 一併變成 409，超出該次修復的意圖。

409 對 client 的意思是「這個目的地被別人佔用了，換一個」；422 的意思是「你的草稿本身不合法，去修草稿」。把後者講成前者會把使用者引導到錯誤的修正方向。

## What Changes

- guided mapping preview route 只在**真正的目的地歸屬衝突**時回 409，其餘拒絕維持原本的 422。
- 歸屬衝突碼以 `metricDestinationOwnershipService` 的既有 `OWNER_CONFLICT_CODES` 為單一事實來源，route 不另外維護清單。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `guided-mqtt-tag-mapping`：M2-R11 明確區分「歸屬衝突回 409」與「其他 preview 拒絕保留既有狀態碼」。

## Impact

影響 `apps/server/src/routes/site-energy-profiles.ts`、`apps/server/src/services/metricDestinationOwnershipService.ts` 與 `apps/server/src/routes/mqtt-guided-activation.test.ts`。不改服務層的擲出行為、不改 apply route、不動 schema、資料或部署。

## Evidence and Review Boundary

缺陷來自 2026-09-08 的 `/code-review`，並以失敗測試重現：preview 一個 topic 含萬用字元的草稿，實測回 `409 SOURCE_REVIEW_REQUIRED`（應為 422）。apply route 的狀態碼不在本次範圍。

## Non-Goals

不重構 `conflict()` helper、不調整服務層錯誤碼語意、不變更 apply route 的 409 行為、不新增 endpoint。

## Delivery Boundary

修正已於前一個 change 的 apply session 中完成並通過驗證，本 change 將其收攏為有界交付紀錄。交付需 focused tests 與 `pnpm verify`。
