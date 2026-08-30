## Why

目前自發自用率、CO₂、Factory Circuit aggregate、CL+KN generation 等計算分散在 server/story/service 內，MQTT Settings 的 Card Data 只能顯示公式診斷，Widget 也沒有可重用的計算資料模型。若把公式直接塞進 Widget，每張卡都會變成小型 ETL，難以驗證 dependency、freshness、cycle、null 與 cross-site 行為，因此需要中央 Derived Metric Registry。

## What Changes

- 新增 Derived Metric Registry，讓 derived metric 以 stable `metricKey`、output scope、input aliases、input metric/scope selectors、受限 expression、unit、precision、null/fallback policy 與 metadata 被集中定義與重用。
- expression 只允許受限語法與白名單運算：數值常數、括號、`+ - * /`、`sum`、`avg`、`min`、`max`；禁止 JavaScript `eval`、任意函式、property access 或 code execution。
- 儲存/啟用前驗證未知 input、重複 alias、dependency cycle、除零可預見錯誤、非法 expression、scope 不相容與 unit 規則；無效定義不得進入 runtime。
- Derived metric freshness 由實際 dependencies 的最差 freshness 推導，timestamp 採能代表完整計算的最舊 dependency；provenance 必須能一路追到 input semantic metrics 與其 raw source topics。
- 同 site derived metric 預設使用 `inherit` input scope；跨廠/global 計算必須逐一明確宣告 input scope，例如 CL 與 KN 的 generation 分別指定 `cl` / `kn`，不得隱式抓取「另一廠」。
- 將既有 hardcoded 計算分階段遷入 registry，首批至少包含 `selfConsumptionRatio`、CO₂ reductions、Factory Circuit aggregates，以及 CL+KN canonical generation；現有結果與 fallback semantics 必須以 regression tests 保持相容，除非 delta spec 明確修改。
- Widget 只綁 derived metric 的 `metricKey`，不保存 formula；公式管理與資料呈現責任分離。
- 提供 management authoring/preview API 與安全 formula editor contract；完整 Data Hub IA/導航由 `improve-data-management-workflows` change 整合。
- Registry lifecycle 與正確性補強（來自本 change 自身 diff 的 code review）：停用定義時一併退役其 evaluation 與物化值、啟動時的 registry 編譯改為 fail soft（mutation 仍嚴格）、單位驗證與換算納入量級（scale）而非只比對 dimension、input 單位大小寫正規化且不把無單位讀數當成宣告單位、per-site aggregate 只在宣告的 site 評估、ingestion 改走 reverse dependency index 的增量評估、preview 先驗證再評估、page staleness policy 對 registry-backed aggregate KPI 具最終決定權、derived dependency 診斷以實際解析狀態而非 topic mapping 有無判定。

## Capabilities

### New Capabilities

- `derived-metric-registry`: 定義 derived metric identity、inputs、scope、evaluation、freshness、provenance、fallback 與 runtime lifecycle。
- `derived-metric-expression-authoring`: 定義受限 expression grammar、validation、preview 與 management mutation contract。

### Modified Capabilities

- `playback-metric-contract`: derived source classification 與 dependency requirements 必須由 registry 定義而非 page-local hardcode。
- `display-page-per-metric-freshness`: derived freshness 必須由 registry dependencies 的 worst/stalest reading 計算。
- `display-monitoring-story-model`: derived binding 的 value、fallback、freshness 與 provenance 必須使用 registry evaluation result。
- `display-card-data-management`: formula/dependencies 從唯讀診斷升級為 registry-backed definition/preview provenance，不再只是硬編碼文字。
- `multi-factory-generation-aggregation`: CL+KN canonical generation 改為明確 global derived metric，保留「兩廠完整且 current 才更新、否則保留最後完整值」的完整性契約。

## Impact

- Affected shared types: metric registry/definition/evaluation DTO、expression AST/validation errors、provenance/freshness contracts。
- Affected server: 預計新增 derived metric registry/evaluator service 與 persistence migration，並逐步替換 `displayStoryService.ts`、factory generation aggregate、CO₂/self-consumption hardcoded branches。
- Affected management APIs/UI: derived definition CRUD、validation/preview 與 dependency/provenance diagnostics；導航整併另由 Data Hub change 完成。
- Dependency: 使用 `scope-live-metrics-by-site` 的 scoped metric resolver；Widget consumption 可與 `add-widget-data-bindings` 串接，但 registry 本身不依賴 Widget editor 才能運作。
- Review 補強觸及：`derivedMetricRegistryService.ts`（停用退役、fail-soft 編譯、單位正規化、per-site 宣告）、`derivedMetricExpression.ts`（量級驗證與換算）、`MqttClientService.ts`（增量評估）、`displayStoryService.ts`（staleness gate、catalog hoist）、`displayCardDataService.ts`（dependency 狀態）、`routes/derived-metrics.ts`（preview 驗證）、`settings-mqtt.ts`（identity conflict 涵蓋 disabled 定義）、`MockMetricsFeedService.ts`（月累積）。
- Non-goals: 不支援任意 JavaScript、SQL、network/file access、user-defined functions 或無限制跨 scope 表達式。
