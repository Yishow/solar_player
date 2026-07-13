## Context

server以 Fastify Swagger static mode發布 `docs/openapi.yaml`，目前只有 /health。完整 routes在 swagger註冊後載入，因此不會自動補入 static spec。切換 dynamic route schemas會要求大量 route refactor；此 change只收斂最關鍵 operations並建立 drift test。

## Goals / Non-Goals

**Goals:**

- 讓 /docs誠實標示 coverage boundary。
- 文件化 web runtime與 operator最依賴的 critical methods。
- 保留現行 response shapes與 auth classes。
- 用 served spec與 app injection抓 drift。

**Non-Goals:**

- 不追求 128 routes全覆蓋。
- 不切換 dynamic OpenAPI generation。
- 不統一 response envelope或產生 client SDK。

## Decisions

### Keep a bounded static critical subset

繼續以 `docs/openapi.yaml`作 static source，info description明列 authoritative critical subset與 excluded domains。第一批 inventory固定為：

- health GET。
- playback settings、pages、rotation-plan的 GET/PUT。
- display-page-registry的 GET/POST、item PUT、archive POST。
- display-pages draft GET/PUT、live GET、validate POST、publish POST。
- settings/mqtt GET/PUT。
- images GET/POST。
- display-readiness GET。
- device/status GET。

這個範圍涵蓋 playback bootstrap、authoring/publish、MQTT、assets與 diagnostics，不把所有 monitoring/story routes塞入同一 change。

### Classify access and preserve real response shapes

每個 operation使用 OpenAPI extension x-solar-access-class，值只允許 playback-safe、trusted-management-read、trusted-management-mutation。schemas按現有 route shape建立，不新增共用 success envelope。

draft PUT完整描述409 conflict；management endpoints描述403 access denied；validation/upload描述其現有400/422；所有 routes保留現有500 safe error。

### Contract coverage uses served JSON and app injection

新增的 route-level contract test先透過 buildApp取得 /docs/json，對固定 inventory逐一檢查 path、method、access class與 response schemas。再使用 isolated DB對各 domain至少一個 success與一個代表性 error做 app.inject，驗 top-level keys、status與文件一致。

不新增 YAML parser dependency，也不以 source regex猜 route。

## Implementation Contract

- Behavior：/docs顯示列出的 critical operations且明確說明非完整全站 spec。
- Interface：x-solar-access-class為固定三值；critical inventory與 response codes由 test常數鎖定。
- Failure modes：runtime path/method、auth class、status或 top-level shape與 spec漂移時 contract test nonzero。
- Acceptance：server contract test、完整 server tests、production build與 /docs manual read-back通過。
- In scope：static OpenAPI critical subset、README boundary、contract test。
- Out of scope：未列 routes、API redesign、dynamic generation、client codegen。

## Risks / Trade-offs

- [static spec仍可能對未測 nested fields漂移] → first pass驗 critical required fields與代表性 responses；後續 domain change再加深，不假裝全覆蓋。
- [operation list過大] → 固定上述 inventory，超出項目另開 change。
- [auth說明與 plugin漂移] → access class test以現行 management auth integration responses交叉驗證。

## Migration Plan

此 change無 runtime data migration。部署只替換 docs與 tests；回滾不影響 API。
