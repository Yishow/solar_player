## Problem

從 e7776da8 到 13c5ae0b 的 review 已重現兩個契約缺口：原始 HTTP numeric path 含反斜線時可繞過驗證並修改數字前綴資源；sidecar 接受未 canonicalize 的 identity key，導致同一 serial 靜默取得新 zone_id。

## Root Cause

驗證層重新解析 request URL，與 Fastify 已匹配路由的參數語意不同。sidecar 載入驗證只檢查 serial trim 後非空，卻保留未 trim 的原始 key，與 resolver 使用的 canonical key 不同。

## Proposed Solution

- 以 Fastify 已匹配路由與實際 resource param 決定驗證，不以 WHATWG URL 正規化後的路徑推測資源。
- sidecar 僅接受 canonical serial 與 position key；非法 state 明確失敗且檔案不變。
- 收斂兩個 validator 重複的小型 helpers，以及 service／once 重複的 sidecar 初始化流程。
- 加入 raw HTTP 與 malformed sidecar 的回歸驗證，完成 review、repo gate 與歸檔收尾。

## Success Criteria

原始 HTTP 的反斜線 numeric ID 在 Circuit、Image、Brand、Display Ops covered routes 皆回 400，無 DB、檔案或事件副作用；合法 ID 維持既有成功及 404 行為。未 trim serial key、非 canonical position key 與正規化後重複 identity 的 sidecar 皆拒絕載入；合法 mapping 跨重啟不變。既有 runtime partial update、MQTT mask／reconnect zero 與 playlist validation 維持通過。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `management-api-input-validation`：補明確 raw-path 與路由參數一致性案例。
- `solar-zone-identity-stability`：補明確 canonical identity key 與拒絕不改檔案例。

## Impact

- Modified: `apps/server/src/plugins/managementInputValidation.ts`、`apps/server/src/plugins/runtimeInputValidation.ts`、`apps/server/src/routes/management-input-validation.test.ts`
- New: `apps/server/src/plugins/inputValidationSupport.ts`
- Modified: `solar_mqtt_go/internal/zoneidentity/store.go`、`solar_mqtt_go/internal/zoneidentity/store_test.go`、`solar_mqtt_go/internal/service/service.go`、`solar_mqtt_go/internal/service/zone_identity.go`、`solar_mqtt_go/commands.go`
- Removed: `solar_mqtt_go/zone_identity.go`、`solar_mqtt_go/internal/service/zone_identity_test.go`
- New: `solar_mqtt_go/internal/zoneidentity/prepare.go`、`solar_mqtt_go/internal/zoneidentity/prepare_test.go`
- 不新增依賴或改變資料庫 schema；既有 active runtime change 依最終工程證據另行收尾，保留原歷史歸檔。
