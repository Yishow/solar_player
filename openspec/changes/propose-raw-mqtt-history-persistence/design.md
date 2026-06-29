## Context

目前系統的資料鏈分成三層：`live_metric_values` 保存最新值、`metric_snapshots` 保存彙整後的監看快照、`daily_energy_summaries` / `cumulative_counters` 保存更高層聚合。這對 playback 與監看頁足夠，但無法回答原始 topic payload 的追查問題，也無法支援日後做更細的回放或異常鑑識。

## Goals / Non-Goals

**Goals:**

- 定義 raw MQTT history 的本機 SQLite 持久化契約。
- 定義 retention、查詢邊界、遮蔽與與現有 latest-value / snapshot 鏈的關係。
- 讓後續 implementer 能在不重寫既有 runtime contract 的前提下落地。

**Non-Goals:**

- 不在這個 change 直接落地 DB migration、ingest 或 UI。
- 不把現有 playback story、Overview trend、Energy History 立即改讀 raw history。
- 不引入外部 DB 或雲端事件匯流排。

## Decisions

### Keep raw MQTT history as a parallel persistence lane

raw history 應與 `live_metric_values` / `metric_snapshots` 並行，而不是取代它們。原因是現有 surfaces 已依賴後者的低成本讀取與聚合語意；raw history 比較像 audit / replay lane。

### Bound retention and querying from the start

raw payload 很快會膨脹，因此 spec 需要從一開始就要求 retention 與查詢邊界，避免把「先全收再說」變成不可控磁碟成長。

### Preserve sensitive-data and operator-surface boundaries

若 payload 可能含帳密、token 或過長 JSON，預設 operator surface 不應直接全量外露；需定義摘要欄位與受限查詢模式。

## Implementation Contract

- Behavior:
  - 後續實作時，MQTT ingest SHALL 可選擇把原始 topic / payload / received_at 持久化到本機 SQLite。
  - retention SHALL 可限制保留天數或筆數，避免無界成長。
  - raw history SHALL 與現有 latest-value / snapshot pipeline 並存，不改變既有對外 API 語意，除非另有 change 明確修改。
- Interface / data shape:
  - 新資料表至少需要 topic、payload、received_at、解析狀態或摘要欄位。
  - 查詢介面需支援按 topic 與時間範圍讀取，並定義 page size / export 邊界。
- Failure modes:
  - raw history 寫入失敗不應阻斷既有 latest-value / snapshot 更新。
  - retention 清理失敗應可診斷，但不應破壞讀取最新值的主流程。
- Acceptance criteria:
  - 後續 implementation change 需以 migration tests、ingest tests、retention tests 與 API/query tests 驗證。
- Scope boundaries:
  - 本 change 僅定義可實作規格，不直接交付 runtime 代碼。

## Risks / Trade-offs

- [Payload volume grows too fast] → 在 spec 中先要求 retention 與查詢上限。
- [Operators misuse raw payload as primary business data] → 明確規定它是 audit lane，不是現有 playback contract 的替代來源。
- [Sensitive fields leak into UI/export] → 在 spec 中先要求遮蔽/摘要與權限邊界。
