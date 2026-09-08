## 1. 重現與修正

- [x] 1.1 以失敗測試重現：preview 含萬用字元 topic 的草稿實測回 `409 SOURCE_REVIEW_REQUIRED`，應為 422；同時保留 `scaleDecimal: "0"` 的 `PREVIEW_DRAFT_MISMATCH` 案例。
- [x] 1.2 在 `metricDestinationOwnershipService` 新增 `isMetricDestinationOwnershipConflict()`，以既有 `OWNER_CONFLICT_CODES` 為唯一來源，不在 route 複製清單。
- [x] 1.3 preview route 改用該判斷：歸屬衝突 409、其餘 422；response body 形狀與 apply route 行為不變。

## 2. 驗證與交接

- [x] 2.1 執行 `pnpm --filter @solar-display/server test src/routes/mqtt-guided-activation.test.ts src/routes/settings-mqtt.test.ts src/services/guidedMqttMappingService.test.ts`，確認既有歸屬衝突仍為 409。
- [x] 2.2 執行 `pnpm verify`，記錄實際測試數與結果。
