## 1. 建立會抓 drift 的 contract test

- [x] 1.1 在 `apps/server/src/routes/openapi-contract.test.ts`先建立失敗inventory，覆蓋「Critical operation inventory matches runtime paths and methods」、「Critical management authorization is visible」與「Runtime examples remain executable」；驗證：現況served spec缺少critical paths而測試失敗。

## 2. 補齊 bounded static subset

- [x] 2.1 依「Keep a bounded static critical subset」更新 `docs/openapi.yaml` info與固定inventory，交付「API documentation declares its coverage boundary」；驗證：/docs明列covered/excluded domains且inventory test找得到所有指定path/method。
- [x] 2.2 依「Classify access and preserve real response shapes」補x-solar-access-class、現行success schemas與400/403/409/422/500 responses，交付「Critical schemas preserve existing response contracts」；驗證：draft conflict、MQTT mutation、image upload與device status的schema assertions通過。
- [x] [P] 2.3 更新 `README.md`說明 /docs只是authoritative critical subset而非全站；驗證：文件read-back能列出coverage與non-goals，且沒有Phase 1 skeleton的誤導描述。

## 3. Served JSON 與 runtime驗證

- [x] 3.1 依「Contract coverage uses served JSON and app injection」讓test從/docs/json讀spec，並以isolated DB對六個domains執行代表性success/error injections；驗證：故意改一個status/top-level key時test失敗，還原後完整server tests通過。
- [x] 3.2 執行server contract test、完整server tests、production build並手動開/docs read-back；驗證：commands exit zero、Swagger UI顯示critical operations與access classes且不自稱全量。
