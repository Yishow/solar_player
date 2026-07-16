## Context

Overview 的五張 KPI 卡片目前由 OverviewDisplayPageConfig.kpiCards 保存幾何、footer、狀態與可見性，editor inspector 也直接透過這個 config path 寫入 draft。卡片標題則由 OverviewRuntimeContent 使用 metric.label，該值可能來自 MQTT/story custom display name，沒有 page-scoped editor override。

這次變更只擴充既有 web config 與 editor schema；draft/live 儲存、publish、preview 與 playback 仍走現有 display-page config channel，不新增 server 或資料庫契約。

## Goals / Non-Goals

**Goals:**

- 讓 Overview 五張 KPI 卡片各自擁有可選的 titleOverride。
- editor inspector 能讀寫 titleOverride，並沿用既有 draft/live publish 流程。
- 非空白 titleOverride 在 editor preview 與 playback 顯示；缺少或空白時回退 metric.label。
- 舊設定與 MQTT/story display-name 行為保持相容。

**Non-Goals:**

- 不修改其他 playback 頁、KPI 副標題、數值、單位、footer、icon 或 metric binding。
- 不新增 API、migration、儲存服務或共用 card-rail abstraction。
- 不允許 titleOverride 改寫 MQTT topic mapping。

## Decisions

### Add an optional Overview KPI title override to the existing card config

在 OverviewKpiCardConfig 新增 titleOverride?: string，並在每張 overview-kpi editor region 增加 path 為 kpiCards.<key>.titleOverride 的 text field。沿用現有 generic field update、draft save、publish 與 runtime config hydration。

替代方案是新增獨立 titles record，但它會把同一張卡片的內容拆到第二個 config subtree，增加不必要的同步與 migration 邏輯，因此不採用。

### Resolve non-blank editor override before the runtime metric label

render title 以 titleOverride.trim() 有內容時優先，否則使用 metric.label。titleOverride 不放進 seed default，也不從 metric.label 回寫到 config，因此未編輯的卡片仍能跟隨 MQTT/story custom display name 與內建 fallback。

替代方案是讓 editor 直接修改 MQTT topic name；這會把 page-scoped 展示文案擴散到其他 metric consumers，也跨越本次 web-only 範圍，因此不採用。

### Reuse existing display-page persistence and runtime preview

不新增 persistence code。editor 的 nested path update 已能保存 kpiCards 欄位，live preview 與 playback 也使用同一份 resolved Overview config。測試聚焦 schema field、optional config fallback、title precedence，以及既有 preview/runtime definition 能取得新欄位。

## Implementation Contract

- **Behavior:** 操作人員選取任一 Overview KPI card 時，inspector 顯示「標題文字」文字欄位。輸入非空白文字並保存後，draft preview 顯示該文字；publish 後 playback 顯示相同文字。
- **Interface / data shape:** OverviewKpiCardConfig 新增 optional string titleOverride。五個 editor paths 分別為 kpiCards.power.titleOverride、kpiCards.today.titleOverride、kpiCards.total.titleOverride、kpiCards.co2Today.titleOverride、kpiCards.co2Total.titleOverride。
- **Fallback:** titleOverride 缺少、為空字串或只含 whitespace 時，preview 與 playback MUST 顯示既有 metric.label；舊版 persisted config 不需要 migration。
- **Failure modes:** 無效的空白覆寫不造成 blank heading，也不阻擋載入、保存或 publish。既有 metric data、tooltip、English subtitle、unit 與 value 不受影響。
- **Acceptance criteria:** targeted web tests 證明五個 inspector paths、non-blank override precedence、blank/missing fallback 與 legacy config hydration；pnpm --filter @solar-display/web test、pnpm run build 通過；運行中的 base URL 可用時產生 fresh FHD witness 與 evidence notes。
- **In scope:** Overview 五張 KPI card title、既有 editor config pipeline、preview/playback rendering。
- **Out of scope:** 其他頁面、server、SQLite schema、MQTT settings、card layout/style、subtitle/value/unit/footer/icon。

## Risks / Trade-offs

- [Risk] 操作人員可能以為 override 會修改 MQTT topic name → inspector label 與規格明確定義為 page-scoped 標題文字，且不回寫 metric mapping。
- [Risk] seed 若填入固定 titleOverride 會遮蔽動態 display name → titleOverride 保持 optional 且 seed 不設定。
- [Risk] whitespace 造成空白標題 → rendering 前 trim，無內容即回退 metric.label。
