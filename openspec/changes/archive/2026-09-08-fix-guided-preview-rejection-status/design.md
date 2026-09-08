## Context

`site-energy-profiles.ts` 的 preview handler 以 `error.statusCode ?? 422` 決定狀態碼。`guidedMqttMappingService.conflict()` 對所有拒絕都附 `statusCode: 409`，其中 `SOURCE_REVIEW_REQUIRED`、`PREVIEW_DRAFT_MISMATCH` 是草稿驗證，不是歸屬爭用。

## Goals / Non-Goals

**Goals:** 歸屬衝突與草稿驗證錯誤在 HTTP 層可區分，且判斷依據只有一份。

**Non-Goals:** 不重寫服務層的 `conflict()`，不動 apply route，不重新定義既有錯誤碼。

## Decisions

### 在 route 依「錯誤碼是否為歸屬衝突」決定狀態碼

route 改用 `isMetricDestinationOwnershipConflict(code)` 判斷：true 回 409，其餘一律 422。判斷函式放在 `metricDestinationOwnershipService`，直接讀既有的 `OWNER_CONFLICT_CODES`，因此新增一種 owner 時不需要同步第二份清單。

替代方案「在服務層把驗證錯誤改成不帶 statusCode」會動到已通過審查的錯誤規約，且 `conflict()` 的其他呼叫端（apply 路徑）仍需要 409；風險大於收益，不採用。

## Implementation Contract

- `POST /api/data-hub/mqtt-mappings/preview` 對 `MANAGED_SOURCE_METRIC_CONFLICT`、`DERIVED_METRIC_IDENTITY_CONFLICT` 回 409。
- 同一 endpoint 對其他任何拒絕（含 `SOURCE_REVIEW_REQUIRED`、`PREVIEW_DRAFT_MISMATCH`、未帶 code 的例外）回 422。
- response body 形狀不變：`{ success:false, error:<code>, timestamp }`。
- 歸屬衝突仍不得發出可用的 preview token，且不得寫入任何來源、mapping 或訂閱。
- apply route 的狀態碼與行為完全不變。

## Risks / Trade-offs

- [client 已依賴目前的 409] → 該行為只存在於 `bf103185` 之後的短區間，且 422 是它更早的長期行為；回到 422 是回復而非新契約。

## Verification Approach

以失敗測試起頭：preview 一個含萬用字元 topic 的草稿應為 422、`scaleDecimal: "0"` 的草稿應為 422；既有的歸屬衝突測試仍須為 409。跑 `mqtt-guided-activation`、`settings-mqtt`、`guidedMqttMappingService` 相鄰測試與 `pnpm verify`。

## Migration Plan

無資料或 schema 遷移。回復本 change 只會讓狀態碼回到過度寬鬆的 409。
