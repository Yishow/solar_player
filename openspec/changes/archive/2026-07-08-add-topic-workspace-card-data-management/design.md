## Context

`/settings/mqtt` 目前有獨立的 MQTT 資料來源模式 card 與 Topic 工作區 card。前者管理 data mode、broker 欄位、連線測試與 broker 狀態；後者管理 topic mappings、runtime coverage、topic row 編輯與測試發佈。這讓操作員在補資料時需要跨 card 解讀：某張 playback card 顯示 `--` 時，必須先猜它是 topic 沒設、broker 沒連、累積/日報尚未產生，或是永續公式缺少自發自用基礎。

本 change 將這兩張 card 合併為單一 Topic 工作區，並用三個 tab 切換 `資料來源模式`、`Topic mapping`、`卡片資料管理`。第三個 tab 不是新的 top-level route，而是 MQTT 設定頁裡面面向展示值調整與資料補足的管理頁。

## Goals / Non-Goals

**Goals:**

- 合併 MQTT data mode card 與 topic card，形成單一 Topic 工作區。
- 在 Topic 工作區提供三分頁切換，避免一頁堆疊所有 MQTT 操作。
- 新增卡片資料管理 tab，讓操作員知道每張 card 的顯示值由哪些 topic、metric、聚合或公式組成。
- 讓操作員能從卡片資料管理 tab 找到補值入口：設定 topic、對已設定 topic 發佈測試值、調整計算設定，或設定 display-only override。
- 讓 display-only override 影響 playback 顯示值，但不寫回 raw MQTT、live metrics、日報或累積 counters。

**Non-Goals:**

- 不新增另一個 top-level settings route。
- 不把沒有 topic 的派生卡片硬塞假 topic。
- 不修改 MQTT message parsing 的基本規則。
- 不改變永續戶數、自發自用比例等既有公式定義；只新增管理面可視性與展示覆寫。
- 不在 playback 畫面加上「已覆寫」標籤，避免影響展示視覺；管理面必須清楚標示覆寫狀態。

## Decisions

### Merge data mode and topic controls into one tabbed Topic workspace

Topic 工作區成為 MQTT 操作的唯一主容器，內含三個 tab。`資料來源模式` tab 放置目前 data mode、broker 欄位、連線測試、儲存設定與 runtime feedback；`Topic mapping` tab 放置目前 topic rows、coverage findings、測試發佈、重載與儲存 mapping；`卡片資料管理` tab 放置新增的 card diagnostic 與 override controls。

此決策避免維持兩張 card 造成視覺與心智模型分裂，也符合使用者明確要求的三分頁結構。替代方案是只在 Topic card 裡新增兩個子模式，但那會留下資料來源模式 card，仍然需要跨 card 操作。

### Model card data management as diagnostics plus display-only overrides

卡片資料管理 tab 以 playback card 為主體列資料，而不是以 topic row 為主體。每列顯示 page/card/metric、目前顯示值、來源狀態、topic 清單、依賴項、公式描述、最後更新時間，以及可執行 action。

覆寫資料獨立存放為 display value overrides，欄位包含 target id、page id、card id、metric key、display value、unit、enabled、reason、expires at、updated at。服務端在輸出 display story 或 sustainability story 時套用覆寫到 display payload，並保留 provenance 給管理面診斷。替代方案是直接 publish MQTT 測試值或更新 live metrics；那會污染真實資料流與歷史統計，不適合作為展示臨時調整機制。

### Classify missing values instead of showing only double dash

卡片資料管理 tab 不只顯示 `--`，必須把缺值原因分類為可操作狀態，例如 `missing-topic`、`idle-topic`、`waiting-aggregate`、`formula-input-missing`、`manual-only`、`overridden`。這些狀態來自既有 display story source metadata、topic mappings、readiness findings、daily summary/cumulative counter availability 與 calculation settings。

替代方案是只列出 topic 或只沿用 tooltip 文字；那仍然無法回答「要補哪個數據才會出現值」。分類狀態讓實作者能把 action 綁到明確的資料缺口。

### Keep override state separate from editor visibility and card authoring

這個 change 不把卡片隱藏、卡片 layout 或 editor authoring 混進卡片資料管理。Editor 仍負責 card 是否顯示、文案與視覺；卡片資料管理只負責資料來源診斷、補值入口與展示值覆寫。

這樣可以避免 `/display-pages/editor` 與 `/settings/mqtt` 彼此搶同一份設定責任。若未來要把 override controls 也放進 editor，應另開 change。

## Implementation Contract

- `/settings/mqtt` SHALL render one Topic 工作區 container that includes three accessible tab buttons: `資料來源模式`, `Topic mapping`, and `卡片資料管理`.
- Selecting `資料來源模式` SHALL show the existing MQTT data mode form, broker fields, connection status, test connection action, and save settings action inside the merged workspace.
- Selecting `Topic mapping` SHALL show the existing topic workspace summary, coverage findings, topic rows, add/reload/save mapping actions, and numeric test publish controls.
- Selecting `卡片資料管理` SHALL show a card-centric diagnostics table or list for playback cards whose displayed values depend on live metrics, topic mappings, cumulative counters, daily summaries, or calculation settings.
- The card diagnostics response SHALL expose a stable JSON shape with card target identity, visible value, unit, source classification, source topics, required inputs, formula or aggregate description, last update, status, and available actions.
- Display overrides SHALL persist separately from true metric storage and SHALL include target identity, display value, unit, enabled state, reason, optional expiry, and update timestamp.
- Applying an override SHALL change the display story or sustainability story payload consumed by playback pages, while management diagnostics SHALL still expose the original source value and indicate the override state.
- Clearing an override SHALL restore the playback payload to the real computed/source value without requiring MQTT reconnect or topic remapping.
- Server mutation endpoints for overrides SHALL use the same management protection expectations as existing MQTT settings mutation endpoints.
- Failure modes SHALL be explicit: invalid numeric override values return validation errors; an unknown card target returns not found; an expired or disabled override is not applied and is visible as inactive in management diagnostics.
- Acceptance criteria include focused server tests for diagnostics and override apply/clear behavior, focused web tests for the three-tab workspace and card management tab, and repo verification with server tests, web tests, build, and Spectra validation.

## Risks / Trade-offs

- [Risk] Operators could confuse display-only overrides with real MQTT history → Mitigation: management diagnostics labels overrides separately and preserves original source value.
- [Risk] Card diagnostics can drift from playback if each page invents its own source model → Mitigation: derive diagnostics from shared story/source metadata and page view model contracts rather than duplicating ad hoc labels.
- [Risk] A broad first version could sprawl across every playback detail → Mitigation: first implementation covers value-bearing cards on Overview, Solar, Factory Circuit, and Sustainability; Images has no metric card override requirement in this change.
- [Risk] Adding a migration for overrides creates rollback considerations → Mitigation: rollback by disabling or deleting override rows; true metric tables remain untouched.
