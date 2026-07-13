## Summary

把目前只含 health 的 static OpenAPI 從誤導性的完整 API 入口，收斂成有明確範圍、與 runtime critical routes 可自動比對的契約。

## Motivation

`docs/openapi.yaml` 目前自述為 Phase 1 skeleton 且只列 /health，但 server 實際註冊 playback、display publishing、MQTT、assets、readiness 與 device 等 route domains；使用者開啟 /docs 會合理誤認它代表完整 runtime contract。先固定 critical operations，比一次重寫所有 response envelopes 更可驗證。

## Proposed Solution

- 明確標示 /docs 的 coverage scope，並補齊 playback settings/pages/rotation plan、display registry/draft/live/validate/publish、MQTT settings、images、display readiness 與 device status 的實際 path／method。
- 依現行 response shape 與 management auth class 記錄 success、error、conflict 與 access-denied schemas，不統一既有 envelope。
- 新增 contract coverage test，從 served OpenAPI JSON 驗證 critical operation inventory 與代表性 app.inject responses。
- README 說明哪些 domains 屬於 authoritative critical subset，哪些仍未納入。

## Non-Goals

- 不在一個 change 文件化所有 routes。
- 不更改既有 API path、auth decision 或 response envelope。
- 不導入 code generation 或新 client SDK。

## Capabilities

### New Capabilities

- `critical-api-contract-documentation`: 定義 /docs 的 scope、critical operation inventory、auth/error schemas 與 runtime coverage test。

### Modified Capabilities

（無）

## Impact

- Affected specs: `critical-api-contract-documentation`
- Affected code:
  - Modified: `docs/openapi.yaml`, `README.md`
  - New: `apps/server/src/routes/openapi-contract.test.ts`
  - Removed: none
